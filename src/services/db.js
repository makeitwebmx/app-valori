import { supabase } from './supabase.client.js?v=0.1.2';

export const DBService = {
    // --- PROFILES ---
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error fetching profile:', error);
        }
        return data;
    },

    async createProfile(user, role = 'client', planType = null) {
        const insertData = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name || user.email.split('@')[0],
            role: role,
            created_at: new Date().toISOString()
        };

        if (planType) {
            insertData.plan_type = planType;
        }
        if (user.user_metadata?.phone) {
            insertData.phone = user.user_metadata.phone;
        }
        if (user.user_metadata?.work_area) {
            insertData.work_area = user.user_metadata.work_area;
        }
        if (user.user_metadata?.city) {
            insertData.city = user.user_metadata.city;
        }

        const { data, error } = await supabase
            .from('profiles')
            .upsert([insertData], { onConflict: 'id' })
            .select()
            .single();

        if (error) console.error('Error creating profile:', error);
        return data;
    },

    // --- APPOINTMENTS ---
    async getAppointments(userId, role) {
        let query = supabase.from('appointments').select('*');

        if (role === 'coach') {
            query = query.eq('coach_id', userId);
        } else {
            query = query.eq('client_id', userId);
        }

        const { data, error } = await query.order('start_time', { ascending: true });
        if (error) console.error('Error fetching appointments:', error);
        return data || [];
    },

    // --- COACHING RELATIONSHIPS ---
    async getRelationships(userId, role) {
        let query = supabase.from('coaching_relationships').select('*, coach:profiles!coach_id(*), coachee:profiles!coachee_id(*)');

        if (role === 'coach') {
            query = query.eq('coach_id', userId);
        } else {
            query = query.eq('coachee_id', userId);
        }

        const { data, error } = await query;
        if (error) console.error('Error fetching relationships:', error);
        return data || [];
    },

    // --- ASSIGNMENTS ---
    async getAssignments(userId, role) {
        let query = supabase.from('assignments').select('*');

        if (role === 'coach') {
            query = query.eq('assigned_by', userId);
        } else {
            query = query.eq('coachee_id', userId);
        }

        const { data, error } = await query.order('due_date', { ascending: true });
        if (error) console.error('Error fetching assignments:', error);
        return data || [];
    },

    // --- BUDGETS ---
    async getUserBudget(userId) {
        const { data, error } = await supabase
            .from('user_budgets')
            .select('*')
            .eq('user_id', userId)
            .order('last_updated', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') console.error('Error fetching budget:', error);
        return data;
    },

    async saveUserBudget(userId, budgetData) {
        const { data, error } = await supabase
            .from('user_budgets')
            .upsert({
                user_id: userId,
                budget_data: budgetData,
                last_updated: new Date().toISOString()
            })
            .select();

        if (error) console.error('Error saving budget:', error);
        return data;
    }
};
