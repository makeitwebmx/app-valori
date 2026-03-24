// Savings Module - Reuses debt engine with savings labels

import { DebtViews } from '../debt/views.js';
import { createPlanActions } from '../debt/index.js';
import { SAVINGS_LABELS } from '../debt/labels.js';
import { state } from '../../store.js';
import { savingsCalculator } from './useSavingsCalculator.js';

export const SavingsActions = createPlanActions({
    labels: SAVINGS_LABELS,
    calculator: savingsCalculator,
    moduleKey: 'savingsModule'
});

export const SavingsModule = {
    render: () => {
        const currentView = state.savingsModule?.currentView || 'dashboard';
        const context = { moduleState: state.savingsModule, calculator: savingsCalculator, interestMode: 'savings', readOnly: state.coacheeViewMode === 'readonly' };
        if (currentView === 'management') {
            return DebtViews.renderManagement(SAVINGS_LABELS, 'SavingsActions', context);
        }
        return DebtViews.renderDashboard(SAVINGS_LABELS, 'SavingsActions', context);
    },

    renderDashboard: () => DebtViews.renderDashboard(SAVINGS_LABELS, 'SavingsActions', { moduleState: state.savingsModule, calculator: savingsCalculator, interestMode: 'savings', readOnly: state.coacheeViewMode === 'readonly' }),
    renderManagement: () => DebtViews.renderManagement(SAVINGS_LABELS, 'SavingsActions', { moduleState: state.savingsModule, calculator: savingsCalculator, interestMode: 'savings', readOnly: state.coacheeViewMode === 'readonly' }),

    init: async () => {
        await savingsCalculator.init();
        window.SavingsActions = SavingsActions;
        window.SavingsModule = SavingsModule;
        console.log('Savings Module initialized');
    }
};

(async () => {
    await SavingsModule.init();
})();
