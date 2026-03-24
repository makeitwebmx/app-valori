// Debt Management Service - Supabase Integration
// Handles all database operations for the debt module

import { supabase } from './supabase.client.js?v=0.1.2';

const getTijuanaDateString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

const API_BASE_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000'
    : 'https://appvalori.onrender.com';

const isRlsPermissionError = (error) => {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || '').toLowerCase();
    return code === '42501' || message.includes('row-level security') || message.includes('forbidden');
};

const togglePaymentViaServer = async ({ targetUserId, debtId, monthIndex, isCompleted }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
        throw new Error('No authenticated session for server fallback');
    }

    const response = await fetch(`${API_BASE_URL}/api/debt/toggle-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            targetUserId,
            debtId,
            monthIndex,
            isCompleted
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.message || `Server fallback failed (${response.status})`);
    }
};

const resolveTargetUserId = async (userId = null) => {
    if (userId) return userId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
};

let debtStartDateColumnSupported = true;

const isMissingColumnError = (error, columnName) => {
    const msg = String(error?.message || '').toLowerCase();
    const details = String(error?.details || '').toLowerCase();
    const hint = String(error?.hint || '').toLowerCase();
    const token = String(columnName || '').toLowerCase();
    return msg.includes(token) || details.includes(token) || hint.includes(token);
};

const mapDebtRecord = (d) => {
    const fallbackStartDate = d?.created_at ? String(d.created_at).split('T')[0] : getTijuanaDateString();
    return {
        id: d.id,
        name: d.name,
        cardType: d.card_type,
        balance: parseFloat(d.balance),
        initialBalance: parseFloat(d.initial_balance),
        rate: parseFloat(d.rate),
        minPayment: parseFloat(d.min_payment),
        paymentDay: d.payment_day,
        priority: d.priority,
        startDate: d.start_date || fallbackStartDate,
        createdAt: d.created_at || null
    };
};

export const debtService = {
    // ==================== DEBTS ====================

    /**
     * Get all debts for the current user
     */
    async getDebts(userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            console.log('🔍 DEBUG getDebts - Target User ID:', targetUserId);

            const { data, error } = await supabase
                .from('debts')
                .select('*')
                .eq('user_id', targetUserId)
                .order('priority', { ascending: true, nullsFirst: false });

            console.log('📥 DEBUG getDebts - Supabase response:', { data, error });

            if (error) throw error;

            // Transform database format to app format
            const transformed = (data || []).map(mapDebtRecord);

            console.log('✅ DEBUG getDebts - Transformed debts:', transformed);

            return transformed;
        } catch (error) {
            console.error('❌ Error fetching debts:', error);
            return [];
        }
    },

    /**
     * Create a new debt
     */
    async createDebt(debt, userId = null) {
        try {
            const targetUserId = await resolveTargetUserId(userId);
            const baseInsert = {
                user_id: targetUserId,
                name: debt.name,
                card_type: debt.cardType || 'credito',
                balance: debt.balance,
                initial_balance: debt.initialBalance || debt.balance,
                rate: debt.rate,
                min_payment: debt.minPayment,
                payment_day: debt.paymentDay || 1,
                priority: debt.priority
            };

            const buildPayload = (includeStartDate) => (
                includeStartDate
                    ? { ...baseInsert, start_date: debt.startDate || getTijuanaDateString() }
                    : baseInsert
            );

            let data = null;
            let error = null;

            ({ data, error } = await supabase
                .from('debts')
                .insert(buildPayload(debtStartDateColumnSupported))
                .select()
                .single());

            if (error && debtStartDateColumnSupported && isMissingColumnError(error, 'start_date')) {
                debtStartDateColumnSupported = false;
                ({ data, error } = await supabase
                    .from('debts')
                    .insert(buildPayload(false))
                    .select()
                    .single());
            }

            if (error) throw error;

            return mapDebtRecord(data);
        } catch (error) {
            console.error('Error creating debt:', error);
            throw error;
        }
    },

    /**
     * Update an existing debt
     */
    async updateDebt(id, updates, userId = null) {
        try {
            const targetUserId = await resolveTargetUserId(userId);

            // Transform app format to database format
            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.cardType !== undefined) dbUpdates.card_type = updates.cardType;
            if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
            if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance;
            if (updates.rate !== undefined) dbUpdates.rate = updates.rate;
            if (updates.minPayment !== undefined) dbUpdates.min_payment = updates.minPayment;
            if (updates.paymentDay !== undefined) dbUpdates.payment_day = updates.paymentDay;
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            if (updates.startDate !== undefined && debtStartDateColumnSupported) {
                dbUpdates.start_date = updates.startDate || null;
            }

            const persistUpdate = async (payload) => {
                const { error } = await supabase
                    .from('debts')
                    .update(payload)
                    .eq('id', id)
                    .eq('user_id', targetUserId);
                return error;
            };

            if (Object.keys(dbUpdates).length === 0) return;

            let error = await persistUpdate(dbUpdates);

            if (error && debtStartDateColumnSupported && dbUpdates.start_date !== undefined && isMissingColumnError(error, 'start_date')) {
                debtStartDateColumnSupported = false;
                delete dbUpdates.start_date;
                if (Object.keys(dbUpdates).length === 0) return;
                error = await persistUpdate(dbUpdates);
            }

            if (error) throw error;
        } catch (error) {
            console.error('Error updating debt:', error);
            throw error;
        }
    },

    /**
     * Delete a debt
     */
    async deleteDebt(id, userId = null) {
        try {
            const targetUserId = await resolveTargetUserId(userId);

            const { error } = await supabase
                .from('debts')
                .delete()
                .eq('id', id)
                .eq('user_id', targetUserId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting debt:', error);
            throw error;
        }
    },

    // ==================== COMPLETED PAYMENTS ====================

    /**
     * Get all completed payments for the current user
     */
    async getCompletedPayments(userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            const { data, error } = await supabase
                .from('debt_completed_payments')
                .select('*')
                .eq('user_id', targetUserId)
                .eq('is_completed', true);

            if (error) throw error;

            // Transform to object format: `${debt_id}-${month_index}`: true
            const payments = {};
            (data || []).forEach(p => {
                payments[`${p.debt_id}-${p.month_index}`] = true;
            });

            return payments;
        } catch (error) {
            console.error('Error fetching completed payments:', error);
            return {};
        }
    },

    /**
     * Toggle payment completion status
     */
    async togglePayment(debtId, monthIndex, isCompleted, userId = null) {
        try {
            const targetUserId = await resolveTargetUserId(userId);
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const isImpersonatedWrite = !!authUser?.id && authUser.id !== targetUserId;

            try {
                if (isCompleted) {
                    // Insert or update to mark as completed
                    const { error } = await supabase
                        .from('debt_completed_payments')
                        .upsert({
                            user_id: targetUserId,
                            debt_id: debtId,
                            month_index: monthIndex,
                            is_completed: true,
                            completed_at: new Date().toISOString()
                        }, {
                            onConflict: 'user_id,debt_id,month_index'
                        });

                    if (error) throw error;
                } else {
                    // Delete the record to mark as not completed
                    const { error } = await supabase
                        .from('debt_completed_payments')
                        .delete()
                        .eq('user_id', targetUserId)
                        .eq('debt_id', debtId)
                        .eq('month_index', monthIndex);

                    if (error) throw error;
                }
            } catch (error) {
                if (!isImpersonatedWrite || !isRlsPermissionError(error)) {
                    throw error;
                }
                console.warn('RLS blocked direct togglePayment in impersonation. Using server fallback...');
                await togglePaymentViaServer({
                    targetUserId,
                    debtId,
                    monthIndex,
                    isCompleted
                });
            }
        } catch (error) {
            console.error('Error toggling payment:', error);
            throw error;
        }
    },

    // ==================== PAYMENT OVERRIDES ====================

    /**
     * Get all payment overrides for the current user
     */
    async getPaymentOverrides(userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            const { data, error } = await supabase
                .from('debt_payment_overrides')
                .select('*')
                .eq('user_id', targetUserId);

            if (error) throw error;

            // Transform to object format: `${debt_id}-${month_index}`: { ...fields }
            const overrides = {};
            (data || []).forEach(o => {
                const key = `${o.debt_id}-${o.month_index}`;
                overrides[key] = {
                    additionalPayment: o.additional_payment ? parseFloat(o.additional_payment) : undefined,
                    underPayment: o.under_payment ? parseFloat(o.under_payment) : undefined,
                    newExpenses: o.new_expenses ? parseFloat(o.new_expenses) : undefined
                };
            });

            return overrides;
        } catch (error) {
            console.error('Error fetching payment overrides:', error);
            return {};
        }
    },

    /**
     * Add or update a payment override
     */
    async setPaymentOverride(debtId, monthIndex, field, value, userId = null) {
        try {
            console.log('💾 Saving payment override:', { debtId, monthIndex, field, value });

            const targetUserId = await resolveTargetUserId(userId);

            // Map app field names to database column names
            const fieldMap = {
                'additionalPayment': 'additional_payment',
                'underPayment': 'under_payment',
                'newExpenses': 'new_expenses'
            };

            const dbField = fieldMap[field];
            if (!dbField) throw new Error(`Unknown field: ${field}`);

            // First, try to get existing override
            const { data: existing } = await supabase
                .from('debt_payment_overrides')
                .select('*')
                .eq('user_id', targetUserId)
                .eq('debt_id', debtId)
                .eq('month_index', monthIndex)
                .maybeSingle();

            const updateData = {
                user_id: targetUserId,
                debt_id: debtId,
                month_index: monthIndex,
                [dbField]: value !== undefined && value !== null && value !== '' ? value : null
            };

            // Preserve existing values
            if (existing) {
                if (dbField !== 'additional_payment' && existing.additional_payment !== null) {
                    updateData.additional_payment = existing.additional_payment;
                }
                if (dbField !== 'under_payment' && existing.under_payment !== null) {
                    updateData.under_payment = existing.under_payment;
                }
                if (dbField !== 'new_expenses' && existing.new_expenses !== null) {
                    updateData.new_expenses = existing.new_expenses;
                }
            }

            console.log('📤 Upserting to Supabase:', updateData);

            const { error } = await supabase
                .from('debt_payment_overrides')
                .upsert(updateData, {
                    onConflict: 'user_id,debt_id,month_index'
                });

            if (error) throw error;

            console.log('✅ Payment override saved successfully');
        } catch (error) {
            console.error('❌ Error setting payment override:', error);
            throw error;
        }
    },

    // ==================== SETTINGS ====================

    /**
     * Get debt settings for the current user
     */
    async getSettings(userId = null) {
        try {
            let targetUserId = userId;
            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                targetUserId = user.id;
            }

            // Fetch specific debt settings
            const { data: debtSettings, error: debtError } = await supabase
                .from('debt_settings')
                .select('*')
                .eq('user_id', targetUserId)
                .maybeSingle();

            if (debtError && debtError.code !== 'PGRST116') throw debtError;

            // Fetch user profile for global currency preference and debt_strategy
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('preferred_currency, debt_strategy')
                .eq('id', targetUserId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') console.warn('Error fetching profile:', profileError);

            return {
                strategy: profile?.debt_strategy || 'snowball',
                monthlyBudget: debtSettings?.monthly_budget ? parseFloat(debtSettings.monthly_budget) : 0,
                startDate: debtSettings?.start_date || '',
                currency: profile?.preferred_currency || 'MXN'
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {
                strategy: 'snowball',
                monthlyBudget: 0,
                startDate: '',
                currency: 'MXN'
            };
        }
    },

    /**
     * Update debt settings
     */
    async updateSettings(settings, userId = null) {
        try {
            const targetUserId = await resolveTargetUserId(userId);

            // 1. Update Profile if currency or strategy changed
            const profileUpdates = {};
            if (settings.currency !== undefined) profileUpdates.preferred_currency = settings.currency;
            if (settings.strategy !== undefined) profileUpdates.debt_strategy = settings.strategy;

            if (Object.keys(profileUpdates).length > 0) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', targetUserId);

                if (profileError) throw profileError;
            }

            // 2. Update Debt Settings if other fields changed
            const updateData = {
                user_id: targetUserId
            };

            let hasDebtUpdates = false;

            if (settings.monthlyBudget !== undefined) { updateData.monthly_budget = settings.monthlyBudget; hasDebtUpdates = true; }
            if (settings.startDate !== undefined) { updateData.start_date = settings.startDate; hasDebtUpdates = true; }

            if (hasDebtUpdates) {
                const { error } = await supabase
                    .from('debt_settings')
                    .upsert(updateData, {
                        onConflict: 'user_id'
                    });

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    },

    // ==================== MIGRATION ====================

    /**
     * Migrate data from localStorage to Supabase
     */
    async migrateFromLocalStorage() {
        try {
            console.log('🔄 Starting migration from localStorage to Supabase...');

            // Check if data exists in localStorage
            const localDebts = localStorage.getItem('valori-debt-data');
            const localPayments = localStorage.getItem('valori-completed-payments');

            if (!localDebts && !localPayments) {
                console.log('✅ No data to migrate');
                return;
            }

            // Get existing debts from Supabase to avoid duplicates
            const existingDebts = await this.getDebts();
            const existingDebtNames = new Set(existingDebts.map(d => d.name.toLowerCase()));

            // Migrate debts
            if (localDebts) {
                const debts = JSON.parse(localDebts);
                console.log(`📦 Found ${debts.length} debts in localStorage`);

                let migratedCount = 0;
                let skippedCount = 0;

                for (const debt of debts) {
                    try {
                        // Check if debt already exists (by name)
                        if (existingDebtNames.has(debt.name.toLowerCase())) {
                            console.log(`⏭️ Skipping duplicate debt: ${debt.name}`);
                            skippedCount++;
                            continue;
                        }

                        await this.createDebt(debt);
                        migratedCount++;
                        console.log(`✅ Migrated debt: ${debt.name}`);
                    } catch (error) {
                        console.error(`❌ Failed to migrate debt ${debt.name}:`, error);
                    }
                }

                console.log(`📊 Migration summary: ${migratedCount} migrated, ${skippedCount} skipped (duplicates)`);
            }

            // Migrate completed payments (only if we migrated debts successfully)
            if (localPayments) {
                const payments = JSON.parse(localPayments);
                const keys = Object.keys(payments).filter(k => payments[k]);
                console.log(`📦 Migrating ${keys.length} completed payments...`);

                for (const key of keys) {
                    const [debtId, monthIndex] = key.split('-');
                    try {
                        await this.togglePayment(debtId, parseInt(monthIndex), true);
                    } catch (error) {
                        console.error(`Failed to migrate payment ${key}:`, error);
                    }
                }
            }

            console.log('✅ Migration completed successfully!');
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }
};
