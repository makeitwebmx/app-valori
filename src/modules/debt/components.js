// Debt Module Components
// All UI components for the debt management module

import { DEBT_STRATEGY_LABELS } from './types.js';
import { DEBT_LABELS } from './labels.js';
import { state } from '../../store.js';

const formatCurrency = (val) => {
    const currency = state.user?.preferred_currency || state.budgetCurrency || 'MXN';
    const locale = currency === 'USD' ? 'en-US' : 'es-MX';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val || 0);
};

const buildDebtTimelineForSummary = (debt, overrides = {}, maxMonths = 120) => {
    const rate = Number(debt?.rate) || 0;
    const minPayment = Number(debt?.minPayment) || 0;
    let balance = Number(debt?.initialBalance) || Number(debt?.balance) || 0;

    if (balance <= 0) return [];

    const timeline = [];
    let month = 1;

    while (balance > 0.01 && month <= maxMonths) {
        const override = overrides[`${debt.id}-${month}`] || {};
        const newExpenses = Number(override.newExpenses) || 0;
        const interest = balance * ((rate / 100) / 12);
        const balanceWithExpenses = balance + newExpenses;

        const manualExtra = Number(override.additionalPayment) || 0;
        const underPaymentOverride = Number(override.underPayment);
        const hasUnderPaymentOverride = Number.isFinite(underPaymentOverride) && underPaymentOverride > 0;
        const basePayment = manualExtra > 0
            ? minPayment
            : (hasUnderPaymentOverride ? underPaymentOverride : minPayment);

        const plannedTotal = basePayment + manualExtra;
        const totalPayment = Math.min(plannedTotal, balanceWithExpenses + interest);
        const newBalance = Math.max(0, balanceWithExpenses + interest - totalPayment);

        timeline.push({
            month,
            paid: totalPayment,
            balance: newBalance
        });

        balance = newBalance;
        month++;
    }

    return timeline;
};

export const getDebtSummaryStats = ({
    debt,
    simulation,
    completedPayments,
    interestMode = 'debt',
    moduleState = state.debtModule
}) => {
    const isSavingsView = interestMode === 'savings';
    const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const moduleOverrides = moduleState?.overrides || {};
    const fallbackTarget = toNumber(debt?.initialBalance || debt?.balance);
    const savingsTarget = toNumber(debt?.balance) || fallbackTarget;
    const debtTimeline = !isSavingsView ? buildDebtTimelineForSummary(debt, moduleOverrides) : [];
    const projectedDebtTarget = !isSavingsView
        ? debtTimeline.reduce((sum, row) => sum + toNumber(row.paid), 0)
        : 0;
    const targetAmount = isSavingsView
        ? savingsTarget
        : (projectedDebtTarget > 0 ? projectedDebtTarget : fallbackTarget);

    let verifiedPaid = isSavingsView ? toNumber(debt?.startAmount) : 0;

    if (simulation && completedPayments) {
        if (isSavingsView) {
            simulation.timeline.forEach(month => {
                const d = month.data.find(od => od.id === debt.id);
                if (d && completedPayments[`${debt.id}-${month.month}`]) {
                    verifiedPaid += toNumber(d.paid) + toNumber(d.interest) - toNumber(d.newExpenses);
                }
            });
        } else {
            debtTimeline.forEach(row => {
                if (completedPayments[`${debt.id}-${row.month}`]) {
                    verifiedPaid += toNumber(row.paid);
                }
            });
        }
    }

    const progress = targetAmount > 0 ? Math.min(100, Math.round((verifiedPaid / targetAmount) * 100)) : 0;
    const remaining = Math.max(0, targetAmount - verifiedPaid);

    return {
        targetAmount,
        verifiedPaid,
        progress,
        remaining
    };
};

export const DebtComponents = {
    // Metric Card Component
    MetricCard: (title, value, icon, color) => `
        <div class="bg-gradient-to-br from-${color}-50 to-white dark:from-${color}-900/20 dark:to-zinc-900 border border-${color}-200 dark:border-${color}-500/30 p-6 rounded-2xl">
            <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-${color}-500/10 rounded-xl text-${color}-500">
                    <i data-lucide="${icon}" width="24"></i>
                </div>
                <div class="text-xs font-bold text-${color}-500 uppercase">${title}</div>
            </div>
            <div class="text-3xl font-bold text-zinc-900 dark:text-white mb-1">${value}</div>
        </div>
    `,

    // Strategy Selector Component
    StrategySelector: (currentStrategy, actionNamespace = 'DebtActions', labels = DEBT_LABELS, readOnly = false) => {
        const strategyLabels = labels?.strategy?.options || DEBT_STRATEGY_LABELS;
        const strategyTitle = labels?.strategy?.title || DEBT_LABELS.strategy.title;
        const strategies = Object.entries(strategyLabels);
        const buttonAttrs = readOnly ? 'disabled aria-disabled="true"' : '';
        const disabledClass = readOnly ? 'opacity-60 cursor-not-allowed' : '';
        return `
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <h3 class="text-sm font-bold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">${strategyTitle}</h3>
                <div class="space-y-3">
                    ${strategies.map(([key, data]) => `
                        <button 
                            onclick="window.${actionNamespace}.setStrategy('${key}')" 
                            ${buttonAttrs}
                            class="w-full p-4 ${currentStrategy === key ? 'bg-brand-lime/10 border-2 border-brand-lime' : 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'} text-left rounded-xl transition-colors ${disabledClass}">
                            <div class="font-bold text-${currentStrategy === key ? 'zinc-900 dark:text-white' : 'zinc-700 dark:text-zinc-300'} text-sm flex items-center gap-2">
                                <i data-lucide="${data.icon}" width="16" class="${currentStrategy === key ? 'text-brand-lime' : ''}"></i>
                                ${data.name}
                            </div>
                            <div class="text-xs text-zinc-${currentStrategy === key ? '600 dark:text-zinc-400' : '500 dark:text-zinc-400'} mt-1">${data.description}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Debt Summary List Component
    DebtSummaryList: (debts, simulation, completedPayments, actionNamespace = 'DebtActions', labels = DEBT_LABELS, interestMode = 'debt', moduleState = state.debtModule) => {
        const listLabels = labels?.list || DEBT_LABELS.list;
        return `
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-2">
                        <span class="text-red-500 font-bold text-lg">⋮≡</span>
                        <h2 class="text-xl font-bold text-zinc-900 dark:text-white">${listLabels.title}</h2>
                    </div>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">${debts.length} cuenta${debts.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="space-y-4">
                    ${debts.length === 0 ? `
                        <div class="text-center py-12">
                            <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i data-lucide="credit-card" width="32" class="text-zinc-400"></i>
                            </div>
                            <p class="text-zinc-500 dark:text-zinc-400 mb-4">${listLabels.emptyTitle}</p>
                            <button onclick="window.${actionNamespace}.setView('management')" class="bg-brand-lime hover:bg-brand-lime/90 text-black font-bold py-3 px-6 rounded-xl transition-all">
                                ${listLabels.emptyAction}
                            </button>
                        </div>
                    ` : debts.map((debt, idx) => {
            const { verifiedPaid, progress, remaining } = getDebtSummaryStats({
                debt,
                simulation,
                completedPayments,
                interestMode,
                moduleState
            });

            return `
                            <div class="group p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-red-500/50 dark:hover:border-red-500/50 transition-all relative overflow-hidden">
                                <div class="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-3 py-1 rounded-full">
                                    ${listLabels.priorityLabel} ${idx + 1}
                                </div>
                                <button 
                                    onclick="event.stopPropagation(); window.${actionNamespace}.openGraph('${debt.id}')"
                                    class="absolute top-4 right-28 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-lg shadow-sm transition-all z-10"
                                    title="Ver Gráfica">
                                    <i data-lucide="bar-chart-2" width="14"></i>
                                </button>
                                <h3 class="font-bold text-zinc-900 dark:text-white text-lg mb-1 pr-24">${debt.name}</h3>
                                <p class="text-xs text-green-600 dark:text-green-400 font-bold mb-4">${listLabels.paidLabel}: ${progress}%</p>
                                <div class="flex items-end justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                                    <div>
                                        <p class="text-[10px] uppercase text-zinc-400 font-bold mb-1">${listLabels.remainingLabel}</p>
                                        <p class="text-2xl font-black text-red-500">${formatCurrency(remaining)}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase text-zinc-400 font-bold mb-1">${listLabels.paidAmountLabel}</p>
                                        <p class="text-lg font-bold text-green-600 dark:text-green-400">${formatCurrency(verifiedPaid)}</p>
                                    </div>
                                </div>
                                <div class="absolute bottom-0 left-0 h-1 bg-zinc-100 dark:bg-zinc-800 w-full">
                                    <div class="h-full bg-green-500 transition-all duration-500" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    },

    // Progress Card Component
    ProgressCard: (progressTotals, labels = DEBT_LABELS) => {
        const progressLabels = labels?.progress || DEBT_LABELS.progress;
        const progressPercentage = progressTotals.totalInitial > 0
            ? Math.min(100, Math.round((progressTotals.totalPaid / progressTotals.totalInitial) * 100))
            : 0;

        return `
            <div class="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-zinc-900 border border-green-200 dark:border-green-500/30 p-6 rounded-2xl">
                <h3 class="text-sm font-bold text-green-600 dark:text-green-400 mb-4 uppercase tracking-wider">${progressLabels.title}</h3>
                <div class="text-center mb-4">
                    <div class="text-5xl font-black text-zinc-900 dark:text-white">${progressPercentage}%</div>
                    <div class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">${progressLabels.completeLabel}</div>
                </div>
                <div class="w-full bg-zinc-200 dark:bg-zinc-800 h-3 rounded-full mb-4 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500" style="width: ${progressPercentage}%"></div>
                </div>
                <div class="flex justify-between items-center text-xs font-medium pt-4 border-t border-green-200 dark:border-green-500/30">
                    <div>
                        <p class="text-zinc-400 uppercase mb-1 font-bold">${progressLabels.paidLabel}</p>
                        <p class="text-green-600 dark:text-green-400 font-bold text-sm">${formatCurrency(progressTotals.totalPaid)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-zinc-400 uppercase mb-1 font-bold">${progressLabels.remainingLabel}</p>
                        <p class="text-red-500 font-bold text-sm">${formatCurrency(progressTotals.totalCurrent)}</p>
                    </div>
                </div>
            </div>
        `;
    }
};
