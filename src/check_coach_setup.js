// Run this in your Browser Console to test permissions
async function checkCoachPermissions(coacheeId) {
    console.log("🕵️ Checking Coach Permissions...");

    // 1. Check Auth
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        console.error("❌ Not logged in!");
        return;
    }
    console.log("✅ Logged in as:", user.email, "ID:", user.id);

    // 2. Check Profile Role
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
        console.error("❌ Could not fetch profile. RLS blocking?");
    } else {
        console.log("✅ Profile Role:", profile.role);
        if (profile.role !== 'coach') {
            console.warn("⚠️ Warning: Your role is NOT 'coach'. It is:", profile.role);
        }
    }

    // 3. Try to Fetch Coachee Data (Debts)
    if (!coacheeId) {
        console.log("ℹ️ Provide a coacheeId to test data access: checkCoachPermissions('COACHEE_UUID')");
        // Try to find one from state
        if (state && state.coachees && state.coachees.length > 0) {
            coacheeId = state.coachees[0].userId || state.coachees[0].id;
            console.log("ℹ️ Auto-selected coachee ID from state:", coacheeId);
        } else {
            return;
        }
    }

    console.log("🔍 Attempting to read debts for Coachee:", coacheeId);
    const { data: debts, error } = await supabaseClient
        .from('debts')
        .select('*')
        .eq('user_id', coacheeId);

    if (error) {
        console.error("❌ Database Error (Permission Denied?):", error);
    } else {
        console.log("✅ Success! Found", debts.length, "debts for coachee.");
        console.table(debts);
    }
}

// Expose to window
window.checkCoachPermissions = checkCoachPermissions;
console.log("✅ Utility loaded. Run checkCoachPermissions() to test.");
