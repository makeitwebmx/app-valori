// Savings Calculator Hook - Adapted from Debt Calculator
// Manages savings goal data, simulation, and contribution tracking

import { state } from '../../store.js';
// import { debtService } from '../../services/debtService.js'; // Disabled for now to avoid mixing data
import { supabase } from '../../services/supabase.client.js?v=0.1.2';
import { savingsService } from '../../services/savingsService.js';

const getTijuanaDateString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

export class SavingsCalculator {
    constructor() {
        this.isInitialized = false;
        this.authListenerSetup = false;
    }

    async init() {
        // Initialize savings module state if not exists
        if (!state.savingsModule) {
            state.savingsModule = {
                currentView: 'dashboard',
                debts: [], // Using 'debts' property name to maintain compatibility with DebtViews, but semantically 'goals'
                overrides: {},
                completedPayments: {},
                strategy: 'snowball', // 'snowball' (quick wins) or 'avalanche' (high yield)
                monthlyBudget: 0,
                startDate: '',
                currency: state.user?.preferred_currency || state.budgetCurrency || 'MXN',
                isLoading: true
            };
        }

        // Load data from Supabase via savingsService
        await this.loadFromService();

        if (!this.authListenerSetup) {
            this.setupAuthListener();
            this.authListenerSetup = true;
        }

        // Mark as initialized after first load
        this.isInitialized = true;
        console.log('âœ… SavingsCalculator initialized with Supabase data (Single Table)');
    }

    setupAuthListener() {
        if (window.__savingsAuthListenerSetup) return;
        window.__savingsAuthListenerSetup = true;

        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setTimeout(async () => {
                    await this.loadFromService();
                }, 500);
            } else if (event === 'SIGNED_OUT') {
                if (state.savingsModule) {
                    state.savingsModule.debts = [];
                    state.savingsModule.completedPayments = {};
                    state.savingsModule.overrides = {};
                }
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

    async loadFromService() {
        try {
            state.savingsModule.isLoading = true;

            const { userId, userEmail, isImpersonated } = await this.getActiveUserContext();

            if (isImpersonated) {
                console.log('Loading savings data for impersonated user:', userEmail);
            }

            if (!userId) {
                console.warn('âš ï¸ User not authenticated. Skipping savings data load.');
                return;
            }

            const savedData = await savingsService.getSavingsData(userId);

            if (savedData) {
                const fallbackStartDate = getTijuanaDateString();
                const normalizedDebts = (savedData.debts || []).map((row, idx) => ({
                    ...row,
                    id: row.id || `${Date.now()}_${idx}`,
                    startDate: row.startDate || row.createdAt || fallbackStartDate,
                    createdAt: row.createdAt || row.startDate || fallbackStartDate
                }));

                // Restore state from the single JSON object
                state.savingsModule.debts = normalizedDebts;
                state.savingsModule.completedPayments = savedData.completedPayments || {};
                state.savingsModule.overrides = savedData.overrides || {};
                state.savingsModule.strategy = savedData.strategy || 'snowball';
                state.savingsModule.monthlyBudget = savedData.monthlyBudget || 0;
                state.savingsModule.startDate = '';

                // Use stored currency or fallback to user pref
                state.savingsModule.currency = savedData.currency || state.savingsModule.currency;

                console.log('âœ… Loaded savings data from Supabase (Single Table) for:', userEmail);
            } else {
                console.log('â„¹ï¸ No savings data found for:', userEmail, 'using defaults');
                // Could initialize defaults here if needed
            }

        } catch (error) {
            console.error('âŒ Error loading savings from Supabase:', error);
            // Fallback or empty state could be handled here
        } finally {
            state.savingsModule.isLoading = false;
        }
    }

    async saveData() {
        try {
            // Construct the state object to save
            const savingsState = {
                debts: state.savingsModule.debts,
                completedPayments: state.savingsModule.completedPayments,
                overrides: state.savingsModule.overrides,
                strategy: state.savingsModule.strategy,
                monthlyBudget: state.savingsModule.monthlyBudget,
                currency: state.savingsModule.currency
            };

            const targetUserId = await this.getTargetUserIdForWrite();
            await savingsService.saveSavingsData(savingsState, targetUserId);
            // console.log('âœ… Savings data saved to Supabase');
        } catch (error) {
            console.error('âŒ Error saving savings data:', error);
        }
    }

    async addDebt(debt) { // Named addDebt to match interface expected by DebtViews
        try {
            const numericBalance = Number(debt.balance) || 0;
            // Generate a locally unique ID (since we save the whole array)
            const id = debt.id || Date.now().toString();

            const debtData = {
                ...debt,
                id: id,
                balance: numericBalance,
                startAmount: Number(debt.startAmount) || 0,
                initialBalance: numericBalance, // Target amount
                startDate: debt.startDate || getTijuanaDateString(),
                createdAt: debt.createdAt || getTijuanaDateString(),
                paymentDay: debt.paymentDay || 1,
                cardType: debt.cardType || 'programado' // 'programado' or 'flexible'
            };

            state.savingsModule.debts.push(debtData);
            await this.saveData();

            console.log('âœ… Savings goal created:', debtData);
        } catch (error) {
            console.error('âŒ Error creating savings goal:', error);
            throw error;
        }
    }

    async removeDebt(id) {
        try {
            state.savingsModule.debts = state.savingsModule.debts.filter(d => d.id !== id);
            await this.saveData();

            console.log('âœ… Savings goal deleted:', id);
        } catch (error) {
            console.error('âŒ Error deleting savings goal:', error);
            throw error;
        }
    }

    async updateDebt(id, updatedFields) {
        try {
            state.savingsModule.debts = state.savingsModule.debts.map(d =>
                d.id === id ? { ...d, ...updatedFields } : d
            );
            await this.saveData();

            console.log('âœ… Savings goal updated:', id, updatedFields);
        } catch (error) {
            console.error('âŒ Error updating savings goal:', error);
            throw error;
        }
    }

    async addOverride(debtId, monthIndex, field, value) {
        try {
            const key = `${debtId}-${monthIndex}`;
            if (!state.savingsModule.overrides[key]) {
                state.savingsModule.overrides[key] = {};
            }
            state.savingsModule.overrides[key][field] = value;
            await this.saveData();

            console.log('âœ… Override added:', { debtId, monthIndex, field, value });
        } catch (error) {
            console.error('âŒ Error adding override:', error);
            throw error;
        }
    }

    async togglePayment(debtId, monthIndex, isChecked) {
        try {

            const key = `${debtId}-${monthIndex}`;
            if (isChecked) {
                state.savingsModule.completedPayments[key] = true;
            } else {
                delete state.savingsModule.completedPayments[key];
            }

            await this.saveData();

            console.log('âœ… Payment toggled:', { debtId, monthIndex, isChecked });
        } catch (error) {
            console.error('âŒ Error toggling payment:', error);
            throw error;
        }
    }

    async setStrategy(strategy) {
        try {
            state.savingsModule.strategy = strategy;
            await this.saveData();
            console.log('âœ… Strategy updated:', strategy);
        } catch (error) {
            console.error('âŒ Error updating strategy:', error);
            throw error;
        }
    }

    async setMonthlyBudget(amount) {
        try {
            const budget = Number(amount) || 0;
            state.savingsModule.monthlyBudget = budget;
            await this.saveData();
            console.log('âœ… Monthly budget updated:', budget);
        } catch (error) {
            console.error('âŒ Error updating budget:', error);
            throw error;
        }
    }

    async setStartDate(date) {
        try {
            state.savingsModule.startDate = date || '';
            console.log('âœ… Start date updated:', date);
        } catch (error) {
            console.error('âŒ Error updating start date:', error);
            throw error;
        }
    }

    async setCurrency(currency) {
        try {
            state.savingsModule.currency = currency;
            await this.saveData();
            console.log('âœ… Currency updated:', currency);
        } catch (error) {
            console.error('âŒ Error updating currency:', error);
            throw error;
        }
    }

    calculateSimulation() {
        const { debts, strategy, monthlyBudget, overrides } = state.savingsModule;

        if (!debts || debts.length === 0) return null;

        // Sort debts (goals)
        let sortedDebts = [...debts].sort((a, b) =>
            strategy === 'snowball'
                ? a.initialBalance - b.initialBalance  // Smallest goal first
                : b.rate - a.rate        // Highest return first
        );

        let currentDebts = sortedDebts.map(d => {
            // "Meta" is stored in 'balance' usually (from addDebt logic). 
            // 'initialBalance' handles the start deposit. 
            // In some legacy states, it might be reversed. 
            // We check both but 'balance' is the primary "Goal" field in the debt-engine reuse.
            const target = Number(d.balance) > 0 ? Number(d.balance) : Number(d.initialBalance);
            const startSaved = Number(d.startAmount) || 0;
            return {
                ...d,
                target,
                currentAccumulated: startSaved,
                remaining: target - startSaved
            };
        });

        let timeline = [];
        let months = 0;
        const MAX_MONTHS = 120; // 10 years cap

        // Continue until all goals met (remaining <= 0)
        while (currentDebts.some(d => d.remaining > 0) && months < MAX_MONTHS) {
            months++;
            let monthlySnapshot = { month: months, data: [] };

            let extraAvailable = 0; // Disable Snowball for Savings: User wants strict manual/monthly control only

            // Strategy: Apply extraAvailable to the FIRST incomplete goal
            const activeGoalId = currentDebts.find(d => d.remaining > 0)?.id;

            currentDebts = currentDebts.map((d) => {
                const currentOverride = overrides[`${d.id}-${months}`] || {};

                // If already completed in previous month
                if (d.remaining <= 0) {
                    monthlySnapshot.data.push({
                        id: d.id,
                        paid: 0,
                        interest: 0,
                        balance: d.currentAccumulated, // Keep showing accumulated cash
                        remaining: 0,
                        basePayment: 0,
                        strategyExtra: 0,
                        newExpenses: 0,
                        manualExtra: 0
                    });
                    return d;
                }

                // Withdrawals
                const newExpenses = Number(currentOverride.newExpenses) || 0;

                const rateVal = Number(d.rate) || 0;
                const monthlyRate = rateVal / 100 / 12;
                const minPay = Number(d.minPayment) || 0;
                const monthStartAccumulated = Number(d.currentAccumulated) || 0;
                const interestBase = Math.max(0, monthStartAccumulated);
                const projectedMonthlyInterest = interestBase * monthlyRate;

                // Contributions
                // Smart contribution:
                // cap base so month-end (with returns computed from month-start balance)
                // reaches target without overshoot.
                let smartBasePayment = minPay;
                if (d.remaining > 0) {
                    const requiredContribution = Math.max(
                        0,
                        d.target - (monthStartAccumulated - newExpenses + projectedMonthlyInterest)
                    );
                    smartBasePayment = Math.min(minPay, requiredContribution);
                }

                let basePayment;
                const underPaymentOverride = Number(currentOverride.underPayment);
                const hasUnderPaymentOverride = Number.isFinite(underPaymentOverride) && underPaymentOverride > 0;
                const additionalPayment = Number(currentOverride.additionalPayment) || 0;
                if (additionalPayment > 0) {
                    basePayment = smartBasePayment;
                } else {
                    basePayment = hasUnderPaymentOverride
                        ? underPaymentOverride
                        : smartBasePayment;
                }

                let manualExtra = additionalPayment;
                let strategyExtra = (d.id === activeGoalId) ? extraAvailable : 0;
                const totalContribution = basePayment + manualExtra + strategyExtra;

                // Returns (Rendimientos):
                // Annual percentage rate prorated monthly: rate / 100 / 12.
                // Important: returns are based on month-start balance only.
                const preInterestAccumulated = monthStartAccumulated + totalContribution - newExpenses;
                const interest = projectedMonthlyInterest;
                const newAccumulated = preInterestAccumulated + interest;

                // Recalculate Remaining to Goal
                // Remaining = Target - AccumulatedCash (already includes returns)
                let newRemaining = Math.max(0, d.target - newAccumulated);

                monthlySnapshot.data.push({
                    id: d.id,
                    paid: totalContribution,
                    basePayment,
                    strategyExtra,
                    manualExtra,
                    interest,
                    balance: newAccumulated, // Visual: "Saldo Inicial" (Next Month Start)
                    remaining: newRemaining, // Visual: "Saldo Final" (Goal Countdown)
                    newExpenses
                });

                return { ...d, currentAccumulated: newAccumulated, remaining: newRemaining };
            });

            timeline.push(monthlySnapshot);
        }

        return { timeline, sortedDebts, totalMonths: months };
    }

    getProgressTotals() {
        const { debts, completedPayments } = state.savingsModule;

        if (!debts || !Array.isArray(debts) || debts.length === 0) {
            return { totalInitial: 0, totalCurrent: 0, totalPaid: 0 };
        }

        const simulation = this.calculateSimulation();

        // Totals logic
        let totalInitialBalance = 0;
        let totalVerifiedPaid = 0;

        debts.forEach(debt => {
            const debtInitial = (debt.initialBalance && debt.initialBalance > 0)
                ? debt.initialBalance
                : debt.balance;
            totalInitialBalance += debtInitial || 0;
            totalVerifiedPaid += Number(debt.startAmount) || 0;

            if (simulation && completedPayments) {
                simulation.timeline.forEach(month => {
                    const d = month.data.find(od => od.id === debt.id);
                    if (d && completedPayments[`${debt.id}-${month.month}`]) {
                        totalVerifiedPaid += (d.paid || 0) + (d.interest || 0) - (d.newExpenses || 0);
                    }
                });
            }
        });

        const totalCurrent = Math.max(0, totalInitialBalance - totalVerifiedPaid);

        return {
            totalInitial: totalInitialBalance,
            totalCurrent,
            totalPaid: totalVerifiedPaid
        };
    }
}

// Global instance
export const savingsCalculator = new SavingsCalculator();

