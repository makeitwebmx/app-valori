// Debt Module Main Entry Point
// Exports views and actions for integration with legacy.js

import { DebtViews } from './views.js';
import { debtCalculator } from './useDebtCalculator.js';
import { state } from '../../store.js';
import { DEBT_LABELS } from './labels.js';

// Helper to preserve scroll position during UI updates
// Helper to preserve scroll position and focus during UI updates
const refreshUIWithScroll = () => {
    if (!window.updateUI) return;

    // 1. Capture State
    const scrollY = window.scrollY;
    const mainScrollContainer = document.getElementById('client-scroll');
    const mainScrollTop = mainScrollContainer ? mainScrollContainer.scrollTop : null;
    const tableContainer = document.getElementById('debt-table-container');
    const scrollLeft = tableContainer ? tableContainer.scrollLeft : 0;

    // Capture Focus
    const activeEl = document.activeElement;
    let focusedSelector = null;
    let selectionStart = null;
    let selectionEnd = null;

    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
        // Build a unique selector based on attributes
        // We rely on the fact that inputs in the table have unique onchange handlers with debt IDs
        // or ensure they have some unique path. 
        // Best approach for this app structure: use data-debt-id on row + input index/type
        const row = activeEl.closest('tr[data-debt-id]');
        if (row) {
            const debtId = row.getAttribute('data-debt-id');
            // Find index of this input within the row
            const inputsInRow = Array.from(row.querySelectorAll('input, select'));
            const inputIndex = inputsInRow.indexOf(activeEl);
            if (inputIndex !== -1) {
                focusedSelector = { debtId, inputIndex };
            }
        }

        selectionStart = activeEl.selectionStart;
        selectionEnd = activeEl.selectionEnd;
    }

    // 2. Update UI
    window.updateUI();

    // 3. Restore State (Timeline: Immediate + Next Frame)
    const restore = () => {
        // Vertical Scroll (window and client module container)
        if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
        if (mainScrollTop !== null) {
            const nextMainScroll = document.getElementById('client-scroll');
            if (nextMainScroll) nextMainScroll.scrollTop = mainScrollTop;
        }

        // Horizontal Scroll
        const newTableContainer = document.getElementById('debt-table-container');
        if (newTableContainer) {
            newTableContainer.scrollLeft = scrollLeft;
        }

        // Focus
        if (focusedSelector) {
            const newRow = document.querySelector(`tr[data-debt-id="${focusedSelector.debtId}"]`);
            if (newRow) {
                const inputs = newRow.querySelectorAll('input, select');
                const targetInput = inputs[focusedSelector.inputIndex];
                if (targetInput) {
                    targetInput.focus();
                    if (typeof selectionStart === 'number') {
                        try {
                            targetInput.setSelectionRange(selectionStart, selectionEnd);
                        } catch (e) {
                            // Ignore errors for inputs that don't support selection functions (e.g. number)
                        }
                    }
                }
            }
        }
    };

    restore();
    requestAnimationFrame(restore);
};

const notifyReadOnly = (() => {
    let lastNoticeAt = 0;
    return () => {
        const now = Date.now();
        if (now - lastNoticeAt < 1500) return;
        lastNoticeAt = now;
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast('Vista solo lectura para coachees.', 'warning');
        } else {
            console.warn('Read-only mode: action blocked.');
        }
    };
})();

const blockIfReadOnly = () => {
    if (state.coacheeViewMode !== 'readonly') return false;
    notifyReadOnly();
    return true;
};

// Actions exposed to global window object for HTML event handlers
export const createPlanActions = (options = {}) => {
    const labels = options.labels || DEBT_LABELS;
    const calculator = options.calculator || debtCalculator;
    const moduleKey = options.moduleKey || 'debtModule';
    const actionLabels = labels?.actions || DEBT_LABELS.actions;
    const defaultName = actionLabels.defaultName || DEBT_LABELS.actions.defaultName;

    return {
        // View Management
        setView: (view) => {
            if (!state[moduleKey]) state[moduleKey] = { currentView: view };
            state[moduleKey].currentView = view;
            refreshUIWithScroll();
        },

        // Debt CRUD Operations
        addDebt: async () => {
            if (blockIfReadOnly()) return;
            try {
                const newDebt = {
                    name: defaultName,
                    balance: 0,
                    rate: 0,
                    minPayment: 0
                };
                await calculator.addDebt(newDebt);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error adding debt:', error);
                alert(actionLabels.addError || DEBT_LABELS.actions.addError);
            }
        },

        removeDebt: (id) => {
            if (blockIfReadOnly()) return;

            const confirmMessage = actionLabels.removeConfirm || DEBT_LABELS.actions.removeConfirm;
            const confirmTitle = '¿Estás seguro?'; // Or pass as param if available in labels

            // Use the new Modal from Views
            DebtViews.renderDeleteConfirmationModal(
                confirmTitle,
                confirmMessage,
                async () => {
                    // On Confirm
                    try {
                        await calculator.removeDebt(id);
                        refreshUIWithScroll();
                    } catch (error) {
                        console.error('Error removing debt:', error);
                        alert(actionLabels.removeError || DEBT_LABELS.actions.removeError);
                    }
                },
                () => {
                    // On Cancel - do nothing
                }
            );
        },

        updateDebt: async (id, field, value) => {
            if (blockIfReadOnly()) return;
            try {
                await calculator.updateDebt(id, { [field]: value });
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error updating debt:', error);
            }
        },

        // Strategy Management
        setStrategy: async (strategy) => {
            if (blockIfReadOnly()) return;
            try {
                await calculator.setStrategy(strategy);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error setting strategy:', error);
            }
        },

        setStartDate: async (date) => {
            if (blockIfReadOnly()) return;
            try {
                await calculator.setStartDate(date);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error setting start date:', error);
            }
        },

        setCurrency: async (currency) => {
            if (blockIfReadOnly()) return;
            try {
                await calculator.setCurrency(currency);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error setting currency:', error);
            }
        },

        // Override Management
        addOverride: async (debtId, monthIndex, field, value) => {
            if (blockIfReadOnly()) return;
            try {
                const numericValue = Number(value);
                const normalizedValue = field === 'underPayment'
                    ? (Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined)
                    : value;

                // Make underPayment and additionalPayment mutually exclusive
                if (field === 'additionalPayment' && value > 0) {
                    // Clear underPayment when setting additionalPayment
                    await calculator.addOverride(debtId, monthIndex, 'underPayment', undefined);
                } else if (field === 'underPayment' && normalizedValue !== undefined) {
                    // Clear additionalPayment when setting underPayment
                    await calculator.addOverride(debtId, monthIndex, 'additionalPayment', 0);
                }

                await calculator.addOverride(debtId, monthIndex, field, normalizedValue);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error adding override:', error);
            }
        },

        // Payment Tracking
        togglePayment: async (debtId, monthIndex, isChecked) => {
            if (blockIfReadOnly()) return;
            try {
                await calculator.togglePayment(debtId, monthIndex, isChecked);
                refreshUIWithScroll();
            } catch (error) {
                console.error('Error toggling payment:', error);
            }
        },

        // UI View State - With Scroll Preservation
        updateVisibleMonths: (debtId, delta) => {
            if (!state[moduleKey]) state[moduleKey] = {};
            if (!state[moduleKey].visibleMonths) state[moduleKey].visibleMonths = {};

            const current = state[moduleKey].visibleMonths[debtId] || 10;
            // Prevent going below 10 or above max (although max check is UI side)
            const newValue = Math.max(10, current + delta);

            state[moduleKey].visibleMonths[debtId] = newValue;

            refreshUIWithScroll();
        },

        // Open Graph Modal
        openGraph: (debtId) => {
            try {
                // Determine mode based on key or state
                const currentMode = (moduleKey === 'savingsModule') ? 'savings' : 'debt';
                const context = { moduleState: state[moduleKey], calculator, interestMode: currentMode };
                const html = DebtViews.renderDebtGraphModal(debtId, labels, context);

                if (!html) return;

                // Remove existing if any
                const existing = document.getElementById('debt-graph-modal');
                if (existing) existing.remove();

                // Inject
                document.body.insertAdjacentHTML('beforeend', html);

                // Open
                const modal = document.getElementById('debt-graph-modal');
                if (modal) {
                    modal.showModal();
                    // Initialize icons in the new modal
                    if (window.lucide) window.lucide.createIcons();

                    // Cleanup on close to keep DOM clean
                    modal.addEventListener('close', () => {
                        modal.remove();
                    });
                }
            } catch (error) {
                console.error('Error opening graph:', error);
            }
        }
    };
};

export const DebtActions = createPlanActions({
    labels: DEBT_LABELS,
    calculator: debtCalculator,
    moduleKey: 'debtModule'
});

// Main Module Export
export const DebtModule = {
    // Render based on current view
    render: () => {
        const { currentView } = state.debtModule;
        const readOnly = state.coacheeViewMode === 'readonly';
        const context = { moduleState: state.debtModule, calculator: debtCalculator, interestMode: 'debt', readOnly };

        if (currentView === 'management') {
            return DebtViews.renderManagement(DEBT_LABELS, 'DebtActions', context);
        }

        return DebtViews.renderDashboard(DEBT_LABELS, 'DebtActions', context);
    },

    // Direct access to views if needed
    renderDashboard: () => DebtViews.renderDashboard(DEBT_LABELS, 'DebtActions', { moduleState: state.debtModule, calculator: debtCalculator, interestMode: 'debt', readOnly: state.coacheeViewMode === 'readonly' }),
    renderManagement: () => DebtViews.renderManagement(DEBT_LABELS, 'DebtActions', { moduleState: state.debtModule, calculator: debtCalculator, interestMode: 'debt', readOnly: state.coacheeViewMode === 'readonly' }),

    // Initialize module
    init: async () => {
        // Ensure calculator is initialized (now async)
        await debtCalculator.init();

        // Expose actions to window for HTML event handlers
        window.DebtActions = DebtActions;
        window.DebtModule = DebtModule;

        console.log('✅ Debt Module initialized');
    }
};

// Add reload method to DebtModule
DebtModule.reload = async () => {
    try {
        console.log('🔄 Reloading debt data...');
        await debtCalculator.loadFromSupabase();
        console.log('✅ Debt data reloaded successfully');
        console.log('📊 Current debts count:', state.debtModule?.debts?.length || 0);
        if (window.updateUI) {
            window.updateUI();
        }
    } catch (error) {
        console.error('❌ Error reloading debt data:', error);
        // Don't throw - allow UI to render with empty state
    }
};



// Auto-initialize when module loads
(async () => {
    await DebtModule.init();
})();
