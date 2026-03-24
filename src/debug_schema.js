import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mdadjjnnzepxlgadkwig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYWRqam5uemVweGxnYWRrd2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjI4ODEsImV4cCI6MjA4MTYzODg4MX0.E3Wu7y4CoKJdr-tmVcczKtuTHmljk-11T79W2xMmoWk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Checking user_ideal_budgets...");
    const { data: ideal, error: idealError } = await supabase
        .from('user_ideal_budgets')
        .select('*')
        .limit(1);

    if (idealError) {
        console.error("Error fetching user_ideal_budgets:", idealError);
    } else {
        if (ideal && ideal.length > 0) {
            console.log("Sample user_ideal_budgets row:", ideal[0]);
        } else {
            console.log("user_ideal_budgets table exists but is empty.");
        }
    }

    console.log("Checking budget_overrides...");
    const { data: overrides, error: overridesError } = await supabase
        .from('budget_overrides')
        .select('*')
        .limit(1);

    if (overridesError) {
        if (overridesError.code === '42P01') { // undefined_table
            console.log("budget_overrides table does not exist.");
        } else {
            console.error("Error checking budget_overrides:", overridesError);
        }
    } else {
        console.log("budget_overrides table exists.");
    }
}

checkSchema();
