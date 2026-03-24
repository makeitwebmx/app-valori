
import { supabase } from './supabase.client.js?v=0.1.2';

export const portfolioService = {
    async getPortfolio(userIdOverride = null) {
        try {
            let userId = userIdOverride;
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                userId = user.id;
            }

            const { data, error } = await supabase
                .from('portfolios')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Relation not found" or "No rows found"

            if (!data) return null;

            return {
                id: data.id,
                investment: {
                    amount: parseFloat(data.investment_amount) || 0,
                    type: data.investment_type || 'ARRIESGADO',
                    distribution: data.investment_distribution || {
                        fixed: { percent: 0, amount: 0 },
                        alternative: { percent: 0, amount: 0 },
                        liquid: { percent: 0, amount: 0 },
                        variable: { percent: 0, amount: 0 }
                    },
                    projections: data.projections || [],
                    objectives: data.objectives || [],
                    realDistribution: data.real_distribution || {
                        fixed: { percent: 0, amount: 0 },
                        alternative: { percent: 0, amount: 0 },
                        liquid: { percent: 0, amount: 0 },
                        variable: { percent: 0, amount: 0 }
                    },
                    executedInvestments: data.executed_investments || []
                },
                liquid: parseFloat(data.liquid) || 0,
                others: data.others || [],
                expenses2026: data.expenses_2026 || [],
                expenses2027: data.expenses_2027 || [],
                savingsPlan: data.savings_plan || { goals: [], monthlyData: [] }
            };
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            return null;
        }
    },

    async savePortfolio(portfolioData, userIdOverride = null) {
        try {
            let userId = userIdOverride;
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                userId = user.id;
            }

            const dbData = {
                user_id: userId,
                investment_amount: portfolioData.investment.amount,
                investment_type: portfolioData.investment.type,
                liquid: portfolioData.liquid,
                others: portfolioData.others,
                expenses_2026: portfolioData.expenses2026,
                expenses_2027: portfolioData.expenses2027,
                savings_plan: portfolioData.savingsPlan,
                investment_distribution: portfolioData.investment.distribution,
                projections: portfolioData.investment.projections,
                objectives: portfolioData.investment.objectives,
                real_distribution: portfolioData.investment.realDistribution,
                executed_investments: portfolioData.investment.executedInvestments,
                updated_at: new Date().toISOString()
            };

            // Check if portfolio exists to decide update or insert (though upsert handles both if constraint present)
            // But we can just use upsert on user_id if we had a unique constraint on user_id?
            // The table definition doesn't show a unique constraint on user_id, but the logic 
            // implies one portfolio per user.
            // Let's first check if we have an ID or query by user_id.

            const existing = await this.getPortfolio(userId);

            if (existing) {
                const { error } = await supabase
                    .from('portfolios')
                    .update(dbData)
                    .eq('user_id', userId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('portfolios')
                    .insert(dbData);
                if (error) throw error;
            }

        } catch (error) {
            console.error('Error saving portfolio:', error);
            throw error;
        }
    }
};
