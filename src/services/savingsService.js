// Savings Management Service - Supabase Integration (Single Table JSON)
// Handles all database operations for the savings module using a single JSON blob

import { supabase } from './supabase.client.js?v=0.1.2';

export const savingsService = {
    // Fetch all savings data as a single JSON object
    async getSavingsData(userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            const { data, error } = await supabase
                .from('savings_data')
                .select('data')
                .eq('user_id', targetUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"

            return data?.data || null;
        } catch (error) {
            console.error('Error fetching savings data:', error);
            return null;
        }
    },

    // Save the entire savings state as a single JSON object
    async saveSavingsData(savingsState, userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            const { error } = await supabase
                .from('savings_data')
                .upsert({
                    user_id: targetUserId,
                    data: savingsState,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error saving savings data:', error);
            throw error;
        }
    }
};
