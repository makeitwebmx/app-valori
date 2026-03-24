// Debt Calculator Hook - Adapted from user's provided code
// Manages debt data, simulation, and payment tracking

import { state } from '../../store.js';
import { debtService } from '../../services/debtService.js';
import { supabase } from '../../services/supabase.client.js?v=0.1.2';

const getTijuanaDateString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

export class DebtCalculator {
    constructor() {
        this.isInitialized = false;
        this.authListenerSetup = false;
    }

    async init() {
        // Initialize debt module state if not exists
        if (!state.debtModule) {
            state.debtModule = {
                currentView: 'dashboard',
                debts: [],
                overrides: {},
                completedPayments: {},
                strategy: 'snowball',
                monthlyBudget: 0,
                startDate: '',
                currency: state.user?.preferred_currency || state.budgetCurrency || 'MXN',
                isLoading: true
            };

            // Load data from Supabase
            await this.loadFromSupabase();

            // Auto-migrate from localStorage if data exists
            await this.autoMigrateIfNeeded();
        }

        // Set up auth listener only once
        if (!this.authListenerSetup) {
            this.setupAuthListener();
            this.authListenerSetup = true;
        }

        // Mark as initialized after first load
        this.isInitialized = true;
        console.log('âœ… DebtCalculator initialized');
    }

    setupAuthListener() {
        // Prevent duplicate listeners (singleton pattern)
        if (window.__debtAuthListenerSetup) {
            console.log('â­ï¸ Auth listener already setup, skipping');
            return;
        }

        window.__debtAuthListenerSetup = true;

        // Listen for authentication state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('ðŸ” Auth state changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log('âœ… User signed in, fetching debt data...');

                // Debounce: wait a bit before loading to avoid race conditions
                setTimeout(async () => {
                    await this.loadFromSupabase();
                    // Attempt auto-migration from localStorage if needed
                    await this.autoMigrateIfNeeded();

                    // DO NOT call updateUI here - it causes infinite loops
                    // The auth component will handle the UI update
                }, 500);
            } else if (event === 'SIGNED_OUT') {
                console.log('ðŸ‘‹ User signed out, clearing debt data...');
                state.debtModule.debts = [];
                state.debtModule.completedPayments = {};
                state.debtModule.overrides = {};
                // Data cleared, UI will update on next render cycle
            }
        });
    }

    async getActiveUserContext() {
        if (state.isViewingCoachee) {
            const impersonatedUserId = state.impersonatedUserId || state.user?.user_id || state.user?.id || null;
            return {
                userId: impersonatedUserId,
                userEmail: state.user?.email || '',
                isImpersonated: true
            };
        }

        const stateUserId = state.user?.id || null;
        if (stateUserId) {
            return {
                userId: stateUserId,
                userEmail: state.user?.email || '',
                isImpersonated: false
            };
        }

        const { data: { user } } = await supabase.auth.getUser();
        return {
            userId: user?.id || null,
            userEmail: user?.email || '',
            isImpersonated: false
        };
    }

    async getTargetUserIdForWrite() {
        const { userId } = await this.getActiveUserContext();
        if (!userId) throw new Error('User not authenticated');
        return userId;
    }

    async loadFromSupabase() {
        // Prevent concurrent loads
        if (this.isLoadingData) {
            console.log('â­ï¸ Skipping load: already loading data');
            return;
        }

        try {
            this.isLoadingData = true;
            state.debtModule.isLoading = true;

            const { userId, userEmail, isImpersonated } = await this.getActiveUserContext();

            if (isImpersonated) {
                console.log('Loading debt data for impersonated user:', userEmail);
            }


            if (!userId) {
                console.warn('âš ï¸ User not authenticated. Skipping debt data load from Supabase.');
                console.log('ðŸ’¡ Please log in to see your debts.');
                // Only clear if no data exists (don't clear on temporary auth issues)
                if (state.debtModule.debts.length === 0) {
                    state.debtModule.debts = [];
                    state.debtModule.completedPayments = {};
                    state.debtModule.overrides = {};
                }
                return;
            }

            console.log('ðŸ‘¤ Loading debt data for user:', userEmail);

            // Load all data in parallel
            const [debts, completedPayments, overrides, settings] = await Promise.all([
                debtService.getDebts(userId),
                debtService.getCompletedPayments(userId),
                debtService.getPaymentOverrides(userId),
                debtService.getSettings(userId)
            ]);

            state.debtModule.debts = debts || [];
            state.debtModule.completedPayments = completedPayments || {};
            state.debtModule.overrides = overrides || {};
            state.debtModule.strategy = settings.strategy || 'snowball';
            state.debtModule.monthlyBudget = settings.monthlyBudget || 0;
            state.debtModule.startDate = '';
            state.debtModule.currency = settings.currency || state.user?.preferred_currency || state.budgetCurrency || 'MXN';

            console.log('âœ… Loaded debt data from Supabase:', {
                debts: debts.length,
                completedPayments: Object.keys(completedPayments).length,
                overrides: Object.keys(overrides).length,
                settings
            });
        } catch (error) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.warn('âš ï¸ Debt data load aborted (likely due to navigation or rapid updates).');
                // Don't clear existing data on abort
                return;
            }
            console.error('âŒ Error loading from Supabase:', error);
            // Only clear data if it's a real error and we have no data
            // Don't wipe existing data on temporary network issues
            if (state.debtModule.debts.length === 0) {
                state.debtModule.debts = [];
                state.debtModule.completedPayments = {};
                state.debtModule.overrides = {};
            } else {
                console.warn('âš ï¸ Keeping existing data despite error');
            }
        } finally {
            state.debtModule.isLoading = false;
            this.isLoadingData = false;
        }
    }

    async autoMigrateIfNeeded() {
        try {
            // Only attempt migration if user is authenticated
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('â­ï¸ Skipping auto-migration: No user session');
                return;
            }

            // Check if migration was already completed for this user
            const migrationKey = `valori_debt_migration_completed_${user.id}`;
            if (localStorage.getItem(migrationKey) === 'true') {
                console.log('â­ï¸ Skipping auto-migration: Already completed for this user');
                return;
            }

            // Check if localStorage has data but Supabase doesn't
            const localDebts = localStorage.getItem('valori-debt-data');
            const hasLocalData = localDebts && JSON.parse(localDebts).length > 0;
            const hasSupabaseData = state.debtModule.debts.length > 0;

            if (hasLocalData && !hasSupabaseData) {
                console.log('ðŸ“¦ Migrating data from localStorage to Supabase...');
                await debtService.migrateFromLocalStorage();

                // Reload data after migration
                await this.loadFromSupabase();

                // Mark migration as completed and clear localStorage
                localStorage.setItem(migrationKey, 'true');
                localStorage.removeItem('valori-debt-data');
                localStorage.removeItem('valori-completed-payments');
                localStorage.removeItem('valori-debt-overrides');

                console.log('âœ… Migration complete and localStorage cleared!');
            } else if (!hasLocalData || hasSupabaseData) {
                // No local data or data already in Supabase, mark as migrated to prevent future checks
                localStorage.setItem(migrationKey, 'true');
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.warn('âš ï¸ Auto-migration aborted.');
                return;
            }
            console.error('âŒ Auto-migration failed:', error);
        }
    }

    async addDebt(debt) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            const numericBalance = Number(debt.balance) || 0;
            const debtData = {
                ...debt,
                balance: numericBalance,
                initialBalance: numericBalance,
                startDate: debt.startDate || getTijuanaDateString(),
                paymentDay: debt.paymentDay || 1,
                cardType: debt.cardType || 'credito'
            };

            const newDebt = await debtService.createDebt(debtData, targetUserId);
            state.debtModule.debts.push(newDebt);

            console.log('âœ… Debt created:', newDebt);
        } catch (error) {
            console.error('âŒ Error creating debt:', error);
            throw error;
        }
    }

    async removeDebt(id) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            await debtService.deleteDebt(id, targetUserId);
            state.debtModule.debts = state.debtModule.debts.filter(d => d.id !== id);

            console.log('âœ… Debt deleted:', id);
        } catch (error) {
            console.error('âŒ Error deleting debt:', error);
            throw error;
        }
    }

    async updateDebt(id, updatedFields) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            await debtService.updateDebt(id, updatedFields, targetUserId);
            state.debtModule.debts = state.debtModule.debts.map(d =>
                d.id === id ? { ...d, ...updatedFields } : d
            );

            console.log('âœ… Debt updated:', id, updatedFields);
        } catch (error) {
            console.error('âŒ Error updating debt:', error);
            throw error;
        }
    }

    async addOverride(debtId, monthIndex, field, value) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            await debtService.setPaymentOverride(debtId, monthIndex, field, value, targetUserId);

            const key = `${debtId}-${monthIndex}`;
            if (!state.debtModule.overrides[key]) {
                state.debtModule.overrides[key] = {};
            }
            state.debtModule.overrides[key][field] = value;

            console.log('âœ… Override added:', { debtId, monthIndex, field, value });
        } catch (error) {
            console.error('âŒ Error adding override:', error);
            throw error;
        }
    }

    async togglePayment(debtId, monthIndex, isChecked) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            await debtService.togglePayment(debtId, monthIndex, isChecked, targetUserId);

            const key = `${debtId}-${monthIndex}`;
            if (isChecked) {
                state.debtModule.completedPayments[key] = true;
            } else {
                delete state.debtModule.completedPayments[key];
            }

            console.log('âœ… Payment toggled:', { debtId, monthIndex, isChecked });
        } catch (error) {
            console.error('âŒ Error toggling payment:', error);
            throw error;
        }
    }

    async setStrategy(strategy) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            // Optimistic update: Update local state immediately so UI reflects change
            state.debtModule.strategy = strategy;
            console.log('âœ… Strategy updated locally:', strategy);

            // Then try to persist
            await debtService.updateSettings({ strategy }, targetUserId);
            console.log('âœ… Strategy persisted to DB');
        } catch (error) {
            console.error('âŒ Error persisting strategy:', error);
            // Optional: Revert state if we wanted strict consistency, 
            // but for UI responsiveness it's better to keep the user's selection 
            // and just log the error (or show a toast).
            // For now, we keep the local change so sorting works.
        }
    }

    async setMonthlyBudget(amount) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            const budget = Number(amount) || 0;
            await debtService.updateSettings({ monthlyBudget: budget }, targetUserId);
            state.debtModule.monthlyBudget = budget;

            console.log('âœ… Monthly budget updated:', budget);
        } catch (error) {
            console.error('âŒ Error updating budget:', error);
            throw error;
        }
    }

    async setStartDate(date) {
        try {
            state.debtModule.startDate = date || '';
            console.log('âœ… Start date updated:', date);
        } catch (error) {
            console.error('âŒ Error updating start date:', error);
            throw error;
        }
    }

    async setCurrency(currency) {
        try {
            const targetUserId = await this.getTargetUserIdForWrite();
            await debtService.updateSettings({ currency }, targetUserId);
            state.debtModule.currency = currency;

            // Sync with global state
            if (state.user) state.user.preferred_currency = currency;
            state.budgetCurrency = currency;

            console.log('âœ… Currency updated:', currency);
        } catch (error) {
            console.error('âŒ Error updating currency:', error);
            throw error;
        }
    }

    calculateSimulation() {
        const { debts, strategy, monthlyBudget, overrides } = state.debtModule;

        if (debts.length === 0) return null;

        // Helper to safely parse numbers from any format (strings, currency, etc.)
        const safeNum = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                // Remove everything except numbers, dots, and minus signs
                return Number(val.replace(/[^0-9.-]+/g, '')) || 0;
            }
            return 0;
        };

        const getStartBalance = (debt) => {
            const initial = safeNum(debt.initialBalance);
            const current = safeNum(debt.balance);
            return initial > 0 ? initial : current;
        };

        // Sort debts based on strategy
        let sortedDebts = [...debts].sort((a, b) => {
            if (strategy === 'snowball') {
                // Snowball: smallest balance first (prefer initial balance if available)
                const balA = getStartBalance(a);
                const balB = getStartBalance(b);
                return balA - balB;
            } else {
                // Avalanche: highest rate first
                const rateA = safeNum(a.rate);
                const rateB = safeNum(b.rate);
                return rateB - rateA;
            }
        });

        let currentDebts = sortedDebts.map(d => ({ ...d, currentBalance: getStartBalance(d) }));
        let timeline = [];
        let months = 0;
        const MAX_MONTHS = 120;

        while (currentDebts.some(d => d.currentBalance > 0) && months < MAX_MONTHS) {
            months++;
            let monthlySnapshot = { month: months, data: [] };

            // Calculate rollover amount from paid-off debts
            let rolloverAmount = 0;
            currentDebts.forEach(d => {
                if (d.currentBalance <= 0) rolloverAmount += d.minPayment;
            });

            let extraAvailable = rolloverAmount + monthlyBudget;

            currentDebts = currentDebts.map((d) => {
                if (d.currentBalance <= 0) {
                    monthlySnapshot.data.push({
                        id: d.id,
                        paid: 0,
                        interest: 0,
                        balance: 0,
                        basePayment: 0,
                        strategyExtra: 0,
                        newExpenses: 0,
                        manualExtra: 0
                    });
                    return d;
                }

                const currentOverride = overrides[`${d.id}-${months}`] || {};
                const newExpenses = Number(currentOverride.newExpenses) || 0;
                const interest = d.currentBalance * ((d.rate / 100) / 12);
                const balanceWithExpenses = d.currentBalance + newExpenses;

                // Determine base payment
                // Rule: "Pago Adicional" and "Pago Por Debajo" are mutually exclusive
                let plannedBasePayment;
                let manualExtra = currentOverride.additionalPayment || 0;
                const underPaymentOverride = Number(currentOverride.underPayment);
                const hasUnderPaymentOverride = Number.isFinite(underPaymentOverride) && underPaymentOverride > 0;

                if (manualExtra > 0) {
                    // If there's an additional payment, use minPayment as base
                    // and IGNORE underPayment
                    plannedBasePayment = d.minPayment;
                } else {
                    // If no additional payment, check for underPayment
                    plannedBasePayment = hasUnderPaymentOverride
                        ? underPaymentOverride
                        : d.minPayment;
                }

                // Apply strategy extra to the first debt with balance
                let strategyExtra = currentDebts.find(cd => cd.currentBalance > 0)?.id === d.id
                    ? extraAvailable
                    : 0;

                const plannedTotalPayment = plannedBasePayment + manualExtra + strategyExtra;
                const totalPayment = Math.min(
                    plannedTotalPayment,
                    balanceWithExpenses + interest
                );

                // Adjust displayed components to match the capped total payment.
                // Base payment should reflect only the (possibly capped) base, not strategy rollover.
                const effectiveBasePayment = Math.min(plannedBasePayment, totalPayment);
                const remainingAfterBase = totalPayment - effectiveBasePayment;
                const effectiveManualExtra = Math.min(manualExtra, remainingAfterBase);
                const remainingAfterManual = remainingAfterBase - effectiveManualExtra;
                const effectiveStrategyExtra = Math.max(0, remainingAfterManual);

                const newBalance = Math.max(0, balanceWithExpenses + interest - totalPayment);

                monthlySnapshot.data.push({
                    id: d.id,
                    paid: totalPayment,
                    basePayment: effectiveBasePayment,
                    strategyExtra: effectiveStrategyExtra,
                    manualExtra: effectiveManualExtra,
                    interest,
                    balance: newBalance,
                    newExpenses
                });

                return { ...d, currentBalance: newBalance };
            });

            timeline.push(monthlySnapshot);
        }

        return { timeline, sortedDebts, totalMonths: months };
    }

    getProgressTotals(simulation = null) {
        const { debts, completedPayments } = state.debtModule;

        // Safety checks
        if (!debts || !Array.isArray(debts) || debts.length === 0) {
            return { totalInitial: 0, totalCurrent: 0, totalPaid: 0 };
        }

        if (!simulation) {
            simulation = this.calculateSimulation();
        }

        console.log('ðŸ” DEBUG - Debts data:', debts);
        
        // Calculate totals based on the simulation to ensure consistency with "Deuda Total"
        let totalInitialBalance = 0; // Semantic reuse: This will now be "Total Simulated Debt"
        let totalVerifiedPaid = 0;

        if (simulation && simulation.timeline) {
            // 1. Calculate Total Lifetime Debt (Sum of all projected payments)
            // This matches exactly what is shown in the "Deuda Total" card
            totalInitialBalance = simulation.timeline.reduce((total, month) => {
                return total + month.data.reduce((monthTotal, d) => monthTotal + d.paid, 0);
            }, 0);

            // 2. Calculate Verified Paid Amount (Sum of checked payments within the simulation)
            if (completedPayments) {
                simulation.timeline.forEach(month => {
                    month.data.forEach(d => {
                        // Check if this specific payment is marked as completed
                        if (completedPayments[`${d.id}-${month.month}`]) {
                            totalVerifiedPaid += (d.paid || 0);
                        }
                    });
                });
            }
        } else {
            // Fallback if no simulation (shouldn't happen if debts exist)
             debts.forEach(debt => {
                totalInitialBalance += (debt.balance || 0);
            });
        }

        // 3. Calculate Remaining (Total - Paid)
        const totalCurrent = Math.max(0, totalInitialBalance - totalVerifiedPaid);

        console.log('ðŸ“Š Progress Totals (Simulated):', {
            totalLifetime: totalInitialBalance,
            totalRemaining: totalCurrent,
            totalPaid: totalVerifiedPaid,
            percentage: totalInitialBalance > 0 ? ((totalVerifiedPaid / totalInitialBalance) * 100).toFixed(2) + '%' : '0%'
        });

        return {
            totalInitial: totalInitialBalance,
            totalCurrent,
            totalPaid: totalVerifiedPaid
        };
    }
}

// Global instance
export const debtCalculator = new DebtCalculator();

