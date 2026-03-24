// Debt Module Views
// Main views: Dashboard and Management

import { DebtComponents, getDebtSummaryStats } from './components.js';
import { debtCalculator } from './useDebtCalculator.js';
import { state } from '../../store.js';
import { DEBT_LABELS } from './labels.js';

const formatCurrency = (val, moduleState = state.debtModule) => {
    const currency = moduleState?.currency || state.user?.preferred_currency || state.budgetCurrency || 'MXN';
    const locale = currency === 'USD' ? 'en-US' : 'es-MX';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val || 0);
};

const getModuleState = (context) => context?.moduleState || state.debtModule;
const getCalculator = (context) => context?.calculator || debtCalculator;
const getInterestMode = (context) => context?.interestMode || 'debt';
const isReadOnly = (context) => Boolean(context?.readOnly);
const getFieldAttrs = (readOnly) => (readOnly ? 'disabled readonly aria-disabled="true"' : '');
const getButtonAttrs = (readOnly) => (readOnly ? 'disabled aria-disabled="true"' : '');
const getDisabledClass = (readOnly) => (readOnly ? 'opacity-60 cursor-not-allowed' : '');

const getInitialBalance = (row, interestMode) => {
    const paid = row.paid || 0;
    const interest = row.interest || 0;
    const newExpenses = row.newExpenses || 0;

    if (interestMode === 'savings') {
        // For savings, row.balance is end-of-month accumulated cash
        // (including returns). Rebuild month-start cash:
        // Initial = End - Contributions + Withdrawals - Returns
        return row.balance - paid + newExpenses - interest;
    }

    return row.balance + paid - interest - newExpenses;
};

const buildSingleDebtTimeline = (debt, overrides = {}, maxMonths = 120) => {
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

        let basePayment;
        const manualExtra = Number(override.additionalPayment) || 0;
        const underPaymentOverride = Number(override.underPayment);
        const hasUnderPaymentOverride = Number.isFinite(underPaymentOverride) && underPaymentOverride > 0;

        if (manualExtra > 0) {
            basePayment = minPayment;
        } else {
            basePayment = hasUnderPaymentOverride
                ? underPaymentOverride
                : minPayment;
        }

        const plannedTotal = basePayment + manualExtra;
        const totalPayment = Math.min(plannedTotal, balanceWithExpenses + interest);

        const effectiveBasePayment = Math.min(basePayment, totalPayment);
        const remainingAfterBase = totalPayment - effectiveBasePayment;
        const effectiveManualExtra = Math.min(manualExtra, remainingAfterBase);

        const newBalance = Math.max(0, balanceWithExpenses + interest - totalPayment);

        timeline.push({
            month,
            paid: totalPayment,
            basePayment: effectiveBasePayment,
            manualExtra: effectiveManualExtra,
            interest,
            balance: newBalance,
            newExpenses
        });

        balance = newBalance;
        month++;
    }

    return timeline;
};

const getTijuanaDateString = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Tijuana',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

const parseDateInput = (value) => {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const formatDateKey = (value) => {
    const parsed = parseDateInput(value);
    if (!parsed) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getDebtRowStartDate = (debt, fallbackValue = '') => {
    if (!debt || typeof debt !== 'object') {
        return formatDateKey(fallbackValue);
    }

    const candidates = [debt.startDate, debt.start_date, debt.createdAt, debt.created_at];
    for (const candidate of candidates) {
        const normalized = formatDateKey(candidate);
        if (normalized) return normalized;
    }

    return formatDateKey(fallbackValue);
};

const filterDebtsByStartDate = (debts = [], filterDateValue = '') => {
    const filterDate = formatDateKey(filterDateValue);
    if (!filterDate) return debts;

    return debts.filter((debt) => {
        const debtStartDate = getDebtRowStartDate(debt);
        return debtStartDate && debtStartDate === filterDate;
    });
};

const filterSimulationByDebtIds = (simulation, allowedIds) => {
    if (!simulation || !(allowedIds instanceof Set)) return simulation;

    const filteredTimeline = (simulation.timeline || [])
        .map(month => ({
            ...month,
            data: (month.data || []).filter(row => allowedIds.has(String(row.id)))
        }))
        .filter(month => month.data.length > 0);

    return {
        ...simulation,
        timeline: filteredTimeline,
        sortedDebts: Array.isArray(simulation.sortedDebts)
            ? simulation.sortedDebts.filter(debt => allowedIds.has(String(debt.id)))
            : simulation.sortedDebts,
        totalMonths: filteredTimeline.length
    };
};

const formatProjectionMonth = (startDateValue, paymentDayValue, monthIndex) => {
    const baseDate = parseDateInput(startDateValue) || parseDateInput(getTijuanaDateString());
    const paymentDay = Number(paymentDayValue) || 1;
    const normalizedPaymentDay = Math.min(Math.max(paymentDay, 1), 31);
    const daysInBaseMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    const effectivePaymentDay = Math.min(normalizedPaymentDay, daysInBaseMonth);
    const startOffset = baseDate.getDate() <= effectivePaymentDay ? 0 : 1;
    const safeIndex = Number(monthIndex) || 1;
    const monthDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + startOffset + (safeIndex - 1),
        1
    );
    const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(monthDate);
    return `${monthName}/${monthDate.getFullYear()}`;
};

// Helper function to calculate and render the RESUMEN summary section
const renderSummarySection = (simulation, debts, interestMode, moduleState) => {
    if (!simulation) return '';

    let grandTotal = 0;
    let totalCapital = 0;
    let totalInterest = 0;

    if (interestMode === 'debt') {
        totalCapital = debts.reduce((acc, d) => acc + (d.initialBalance || d.balance || 0), 0);
        // Calculate Grand Total from simulation payments
        grandTotal = simulation.timeline.reduce((total, month) => {
            return total + month.data.reduce((monthTotal, d) => monthTotal + d.paid, 0);
        }, 0);
        totalInterest = Math.max(0, grandTotal - totalCapital);
    } else {
        // savings mode
        // Grand Total = Sum of Final Projected Balances (Target Met)
        // Capital = Amount User Contributes (Principal)
        // Interest = Returns earned
        // Grand Total = Capital + Interest (Final Balance)

        const lastMonth = simulation.timeline[simulation.timeline.length - 1];
        if (lastMonth) {
            // For each debt (goal), find its final state
            debts.forEach(d => {
                // Total Capital Contributed
                let goalCapital = (d.startAmount || 0); // Initial
                let goalInterest = 0;

                simulation.timeline.forEach(m => {
                    const mData = m.data.find(md => md.id === d.id);
                    if (mData) {
                        goalCapital += mData.paid; // contributions
                        goalInterest += mData.interest; // returns
                    }
                });

                totalCapital += goalCapital;
                totalInterest += goalInterest;
            });

            grandTotal = totalCapital + totalInterest;
        } else {
            // Fallback if no simulation
            totalCapital = debts.reduce((acc, d) => acc + (d.startAmount || 0), 0);
            grandTotal = totalCapital;
        }
    }

    return `
        <div class="mb-8 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 font-sans animate-in fade-in slide-in-from-top-4 duration-500">
            <!-- Header -->
            <div class="bg-zinc-100 dark:bg-zinc-800 text-center py-2">
                <h3 class="text-sm font-bold tracking-widest text-zinc-900 dark:text-white uppercase">RESUMEN</h3>
            </div>
            
            <!-- Grand Total -->
            <div class="bg-blue-500 text-white text-center py-4">
                <div class="text-4xl font-black tracking-tight drop-shadow-sm">${formatCurrency(grandTotal, moduleState)}</div>
            </div>
            
            <!-- Sub-header -->
            <div class="bg-brand-lime text-black text-center py-1 border-t border-b border-black/10">
                <h4 class="text-xs font-bold tracking-widest uppercase">GRAN TOTAL</h4>
            </div>

            <!-- Split Details -->
            <div class="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                <div class="text-center py-3">
                    <div class="text-2xl font-bold text-zinc-900 dark:text-white">${formatCurrency(totalCapital, moduleState)}</div>
                </div>
                <div class="text-center py-3">
                    <div class="text-2xl font-bold text-zinc-900 dark:text-white">${formatCurrency(totalInterest, moduleState)}</div>
                </div>
            </div>
            
            <!-- Split Labels -->
            <div class="grid grid-cols-2 divide-x divide-black/10 bg-brand-lime text-black">
                <div class="text-center py-1">
                    <h5 class="text-xs font-bold tracking-widest uppercase">CAPITAL</h5>
                </div>
                <div class="text-center py-1">
                    <h5 class="text-xs font-bold tracking-widest uppercase">INTERESES</h5>
                </div>
            </div>
        </div>
    `;
};

export const DebtViews = {
    // Main Dashboard View
    renderDashboard: (labels = DEBT_LABELS, actionNamespace = 'DebtActions', context = {}) => {
        // DEBUG: Trace rendering sorting
        const moduleState = getModuleState(context);
        const interestMode = getInterestMode(context);
        const calculator = getCalculator(context);
        const readOnly = isReadOnly(context);
        const simulation = calculator.calculateSimulation();
        const { debts, strategy } = moduleState || {};

        console.log('🔍 RenderDashboard Debug:', {
            interestMode,
            strategy,
            debtsCount: debts?.length,
            simulationExists: !!simulation,
            sortedDebtsExists: !!simulation?.sortedDebts,
            firstSortedDebt: simulation?.sortedDebts?.[0]?.name
        });

        if (!moduleState || !Array.isArray(moduleState.debts)) {
            return `
                <div class="p-8 text-center text-zinc-500">
                    Cargando informacion...
                </div>
            `;
        }

        // Determine which debts to display
        // For Debt manager: use sorted debts from simulation (Snowball/Avalanche)
        // For Savings manager: keep original order (as requested to not affect Savings)
        const displayDebts = (interestMode === 'debt' && simulation?.sortedDebts)
            ? simulation.sortedDebts
            : debts;

        const summaryStats = displayDebts.map(debt => getDebtSummaryStats({
            debt,
            simulation,
            completedPayments: moduleState.completedPayments,
            interestMode,
            moduleState
        }));
        const summaryTotals = summaryStats.reduce((acc, stat) => {
            acc.target += stat.targetAmount;
            acc.paid += stat.verifiedPaid;
            acc.remaining += stat.remaining;
            return acc;
        }, { target: 0, paid: 0, remaining: 0 });

        const progressTotals = {
            totalInitial: summaryTotals.target,
            totalPaid: summaryTotals.paid,
            totalCurrent: summaryTotals.remaining
        };

        const currentTotalDebt = progressTotals.totalInitial;

        let maxMonthlyPayment = 0;
        let totalMonths = simulation ? simulation.totalMonths : 0;

        if (simulation?.timeline?.length) {
            if (interestMode === 'savings') {
                // For savings dashboard, show remaining projection only
                // (months/contributions not yet marked as completed).
                const remainingMonthlyTotals = simulation.timeline
                    .map(month => {
                        const hasPendingInMonth = month.data.some(d => {
                            const key = `${d.id}-${month.month}`;
                            return (Number(d.paid) || 0) > 0.01 && !moduleState.completedPayments?.[key];
                        });

                        if (!hasPendingInMonth) return 0;

                        return month.data.reduce((sum, d) => {
                            // Monthly max must represent the sum of all savings goals in that month.
                            return sum + (Number(d.paid) || 0);
                        }, 0);
                    })
                    .filter(total => total > 0.01);

                maxMonthlyPayment = remainingMonthlyTotals.length
                    ? Math.max(...remainingMonthlyTotals)
                    : 0;
                totalMonths = remainingMonthlyTotals.length;
            } else {
                maxMonthlyPayment = Math.max(...simulation.timeline.map(m => m.data.reduce((s, d) => s + d.paid, 0)));
            }
        }

        const primaryTypeValue = labels.table.typePrimaryValue || 'credito';
        const secondaryTypeValue = labels.table.typeSecondaryValue || 'debito';

        return `
            <div class="animate-in fade-in slide-in-from-left-4 duration-300">
                <!-- Header -->
                <div class="flex justify-between items-end mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-1">${labels.header.title}</h1>
                        <p class="text-zinc-500 dark:text-zinc-400 font-medium">${labels.header.subtitle}</p>
                    </div>
                    <button 
                        onclick="window.${actionNamespace}.setView('management')" 
                        class="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-2.5 px-6 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg hover:-translate-y-0.5">
                        <i data-lucide="edit-3" width="18"></i>
                        ${labels.header.manageButton}
                    </button>
                </div>
                

                <!-- Metrics -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    ${(() => {
                const isSavings = interestMode === 'savings';
                const totalColor = isSavings ? 'green' : 'red';
                const totalIcon = isSavings ? 'piggy-bank' : 'alert-circle';
                const monthlyColor = isSavings ? 'green' : 'orange';

                return `
                            ${DebtComponents.MetricCard(labels.metrics.total, formatCurrency(currentTotalDebt, moduleState), totalIcon, totalColor)}
                            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="p-3 bg-${monthlyColor}-500/10 rounded-xl text-${monthlyColor}-500">
                                        <i data-lucide="calendar" width="24"></i>
                                    </div>
                                    <div class="text-xs font-bold text-${monthlyColor}-500 uppercase">${labels.metrics.monthlyMax}</div>
                                </div>
                                <div class="text-3xl font-bold text-zinc-900 dark:text-white mb-1">${formatCurrency(maxMonthlyPayment, moduleState)}</div>
                                <div class="text-xs text-zinc-600 dark:text-zinc-400">${labels.metrics.monthlyHint}</div>
                            </div>
                            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="p-3 bg-green-500/10 rounded-xl text-green-500">
                                        <i data-lucide="clock" width="24"></i>
                                    </div>
                                    <div class="text-xs font-bold text-green-500 uppercase">${labels.metrics.time}</div>
                                </div>
                                <div class="text-3xl font-bold text-zinc-900 dark:text-white mb-1">${totalMonths} meses</div>
                                <div class="text-xs text-zinc-600 dark:text-zinc-400">${labels.metrics.timeHint}</div>
                            </div>
                        `;
            })()}
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <!-- Debts List -->
                    <div class="xl:col-span-2">
                        ${DebtComponents.DebtSummaryList(displayDebts, simulation, moduleState.completedPayments, actionNamespace, labels, interestMode, moduleState)}
                    </div>

                    <!-- Sidebar: Strategy & Progress -->
                    <div class="xl:col-span-1 space-y-6">
                        ${getInterestMode(context) === 'debt' ? DebtComponents.StrategySelector(strategy, actionNamespace, labels, readOnly) : ''}
                        ${DebtComponents.ProgressCard(progressTotals, labels)}
                    </div>
                </div>
            </div>
        `;
    },

    // Management View (Full Editor)
    renderManagement: (labels = DEBT_LABELS, actionNamespace = 'DebtActions', context = {}) => {
        const moduleState = getModuleState(context);
        const interestMode = getInterestMode(context);
        if (!moduleState || !Array.isArray(moduleState.debts)) {
            return `
                <div class="p-8 text-center text-zinc-500">
                    Cargando informacion...
                </div>
            `;
        }
        const readOnly = isReadOnly(context);
        const fieldAttrs = getFieldAttrs(readOnly);
        const calculator = getCalculator(context);
        const allDebts = moduleState.debts;
        const simulation = calculator.calculateSimulation();
        const filteredDebts = filterDebtsByStartDate(allDebts, moduleState.startDate);
        const filteredDebtIds = new Set(filteredDebts.map(debt => String(debt.id)));
        const orderedFilteredDebts = (
            interestMode === 'debt' && simulation?.sortedDebts
                ? simulation.sortedDebts
                : allDebts
        ).filter(debt => filteredDebtIds.has(String(debt.id)));
        const filteredSimulation = filterSimulationByDebtIds(simulation, filteredDebtIds);
        const hasNoFilterResults = allDebts.length > 0 && filteredDebts.length === 0;

        // Render RESUMEN summary section
        const summarySection = renderSummarySection(filteredSimulation, filteredDebts, interestMode, moduleState);

        return `
            <div class="space-y-6">
                <!-- Header with Back Button -->
                <div class="flex items-center gap-4 mb-2">  
                    <button 
                        onclick="window.${actionNamespace}.setView('dashboard')" 
                        class="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors group">
                        <i data-lucide="arrow-left" width="24" class="group-hover:-translate-x-1 transition-transform"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">${labels.management.title}</h2>
                        <p class="text-zinc-500 dark:text-zinc-400 text-sm font-medium">${labels.management.subtitle}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <!-- Main Content Area -->
                    <div class="lg:col-span-9 space-y-8">
                        
                        ${summarySection}
                        
                        <!-- Debt Input Table -->
                        <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                                <div class="flex items-center gap-2">
                                <span class="text-orange-500 font-bold text-md">&#9998;</span>
                                <h3 class="text-lg font-bold text-zinc-900 dark:text-white">${labels.management.editTitle}</h3>
                                </div>
                                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                    <div class="flex items-center gap-2">
                                        <label class="text-xs font-bold text-zinc-500 dark:text-zinc-400">${labels.management.currencyLabel}</label>
                                        <select
                                            onchange="window.${actionNamespace}.setCurrency(this.value)"
                                            ${fieldAttrs}
                                            class="bg-zinc-100 dark:bg-zinc-800 border-none outline-none text-zinc-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
                                            <option value="MXN" ${moduleState.currency === 'MXN' ? 'selected' : ''}>MXN</option>
                                            <option value="USD" ${moduleState.currency === 'USD' ? 'selected' : ''}>USD</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            ${DebtViews.renderDebtInputTable(labels, actionNamespace, { ...context, filteredDebts })}
                        </div>

                        <!-- Detail Panels -->
                        <div class="space-y-6">
                            <h3 class="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">${labels.details.title}</h3>
                            ${allDebts.length === 0 ? `
                                <div class="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                                    <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-lucide="calculator" width="32" class="text-zinc-400"></i>
                                    </div>
                                    <p class="text-zinc-500 dark:text-zinc-400 mb-2">${labels.details.emptyTitle}</p>
                                    <p class="text-xs text-zinc-400">${labels.details.emptySubtitle}</p>
                                </div>
                            ` : hasNoFilterResults ? `
                                <div class="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
                                    <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i data-lucide="filter-x" width="32" class="text-zinc-400"></i>
                                    </div>
                                    <p class="text-zinc-500 dark:text-zinc-400 mb-2">No hay registros para la fecha seleccionada.</p>
                                    <p class="text-xs text-zinc-400">Limpia el filtro o cambia la fecha.</p>
                                </div>
                            ` : orderedFilteredDebts.map(debt => DebtViews.renderDebtDetailPanel(debt, filteredSimulation, labels, actionNamespace, context)).join('')}
                        </div>
                    </div>

                    <!-- Sidebar: Summary -->
                    <div class="lg:col-span-3 space-y-6 lg:sticky lg:top-8">
                        ${getInterestMode(context) === 'debt' ? DebtComponents.StrategySelector(moduleState.strategy, actionNamespace, labels, readOnly) : ''}
                        ${state.user?.role !== 'coachee' ? `
                        <div class="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-6 rounded-2xl shadow-xl">
                            <h3 class="font-bold text-lg mb-2">${labels.management.summaryTitle}</h3>
                            <p class="text-zinc-400 dark:text-zinc-600 text-sm mb-6">${labels.management.summaryText}</p>
                            <div class="space-y-4 text-sm">
                                <div class="flex justify-between py-2 border-b border-white/10 dark:border-zinc-900/10">
                                    <span class="text-zinc-400 dark:text-zinc-600">${labels.management.totalAccountsLabel}</span>
                                    <span class="font-bold">${filteredDebts.length}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b border-white/10 dark:border-zinc-900/10">
                                    <span class="text-zinc-400 dark:text-zinc-600">${labels.management.totalBalanceLabel}</span>
                                    <span class="font-bold">${formatCurrency(filteredDebts.reduce((acc, d) => acc + d.balance, 0), moduleState)}</span>
                                </div>
                            </div>
                            <button 
                                onclick="window.${actionNamespace}.setView('dashboard')" 
                                class="w-full mt-8 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                ${labels.management.backButton}
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // Debt Input Table Component
    renderDebtInputTable: (labels = DEBT_LABELS, actionNamespace = 'DebtActions', context = {}) => {
        const moduleState = getModuleState(context);
        const readOnly = isReadOnly(context);
        const fieldAttrs = getFieldAttrs(readOnly);
        const buttonAttrs = getButtonAttrs(readOnly);
        const disabledClass = getDisabledClass(readOnly);
        const debts = Array.isArray(context.filteredDebts)
            ? context.filteredDebts
            : filterDebtsByStartDate(moduleState.debts, moduleState.startDate);
        const primaryTypeValue = labels.table.typePrimaryValue || 'credito';
        const secondaryTypeValue = labels.table.typeSecondaryValue || 'debito';
        const isSavings = getInterestMode(context) === 'savings';
        const totalColumns = isSavings ? 10 : 9;

        return `
            <div id="debt-table-container" class="overflow-x-auto">
                <table class="w-full text-sm min-w-[1320px]">
                <tr>
                    <th class="p-3 text-left w-12"></th> <!-- New Graph Button Column -->
                    <th class="p-3 text-left">${labels.table.name}</th>
                    <th class="p-3 text-center">${labels.table.type}</th>
                    <th class="p-3 text-center w-40">${labels.table.startDate || 'Fecha de Inicio'}</th>
                    ${isSavings ? `<th class="p-3 text-right">${labels.table.initialBalance}</th>` : ''}
                    <th class="p-3 text-right">${labels.table.balance}</th>
                    <th class="p-3 text-right">${labels.table.rate}</th>
                    <th class="p-3 text-right">${labels.table.minPayment}</th>
                    <th class="p-3 text-center w-28">${labels.table.paymentDay}</th>
                    <th class="p-3 text-center w-20">${labels.table.actions}</th>
                </tr>

            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                ${debts.map((debt, idx) => {
            const cardType = debt.cardType || primaryTypeValue;
            const rowStartDate = getDebtRowStartDate(debt, getTijuanaDateString());
            return `
                            <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50" data-debt-id="${debt.id}">
                                <td class="p-3 text-center">
                                    <button 
                                        onclick="window.${actionNamespace}.openGraph('${debt.id}')"
                                        class="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all hover:scale-105"
                                        title="Ver Gráfica">
                                        <i data-lucide="bar-chart-2" width="16"></i>
                                    </button>
                                </td>
                                <td class="p-3">
                                    <input 
                                        type="text" 
                                        value="${debt.name}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'name', this.value)"
                                        ${fieldAttrs}
                                        class="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white font-medium ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="${labels.table.namePlaceholder}">
                                </td>
                                <td class="p-3">
                                    <div class="flex gap-1 justify-center">
                                        <button 
                                            onclick="window.${actionNamespace}.updateDebt('${debt.id}', 'cardType', '${primaryTypeValue}')"
                                            ${buttonAttrs}
                                            class="px-2 py-1 text-xs font-bold rounded transition-all ${cardType === primaryTypeValue ? 'bg-blue-500 text-white shadow-md' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'} ${disabledClass}"
                                            title="${labels.table.typePrimaryTitle}">
                                            ${labels.table.typePrimaryLabel}
                                        </button>
                                        <button 
                                            onclick="window.${actionNamespace}.updateDebt('${debt.id}', 'cardType', '${secondaryTypeValue}')"
                                            ${buttonAttrs}
                                            class="px-2 py-1 text-xs font-bold rounded transition-all ${cardType === secondaryTypeValue ? 'bg-green-500 text-white shadow-md' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'} ${disabledClass}"
                                            title="${labels.table.typeSecondaryTitle}">
                                            ${labels.table.typeSecondaryLabel}
                                        </button>
                                    </div>
                                </td>
                                <td class="p-3 text-center">
                                    <input
                                        type="date"
                                        value="${rowStartDate}"
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'startDate', this.value)"
                                        ${fieldAttrs}
                                        class="w-40 mx-auto bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none text-zinc-900 dark:text-white text-xs font-bold text-center hover:border-brand-lime focus:border-brand-lime transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}">
                                </td>
                                ${isSavings ? `
                                <td class="p-3 text-right">
                                    <input 
                                        type="number" 
                                        value="${debt.startAmount || 0}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'startAmount', Number(this.value))"
                                        ${fieldAttrs}
                                        class="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white font-mono text-right ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="0.00">
                                </td>` : ''}
                                <td class="p-3 text-right">
                                    <input 
                                        type="number" 
                                        value="${debt.balance}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'balance', Number(this.value))"
                                        ${fieldAttrs}
                                        class="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white font-mono text-right ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="0.00">
                                </td>
                                <td class="p-3 text-right">
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value="${debt.rate}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'rate', Number(this.value))"
                                        ${fieldAttrs}
                                        class="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white font-mono text-right ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="0.0">
                                </td>
                                <td class="p-3 text-right">
                                    <input 
                                        type="number" 
                                        value="${debt.minPayment}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'minPayment', Number(this.value))"
                                        ${fieldAttrs}
                                        class="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white font-mono text-right ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="0.00">
                                </td>
                                <td class="p-3 text-center">
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="31"
                                        value="${debt.paymentDay || 1}" 
                                        onchange="window.${actionNamespace}.updateDebt('${debt.id}', 'paymentDay', Number(this.value))"
                                        ${fieldAttrs}
                                        class="w-16 mx-auto bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none text-zinc-900 dark:text-white font-bold text-center hover:border-brand-lime focus:border-brand-lime transition-colors ${readOnly ? 'cursor-not-allowed opacity-60' : ''}"
                                        placeholder="1">
                                </td>
                                <td class="p-3 text-center">
                                    <button 
                                        onclick="window.${actionNamespace}.removeDebt('${debt.id}')"
                                        ${buttonAttrs}
                                        class="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors ${disabledClass}"
                                        title="Eliminar">
                                        <i data-lucide="trash-2" width="16"></i>
                                    </button>
                                </td>
                            </tr>`;
        }).join('')}
                <!-- Add New Row -->
                <tr class="bg-zinc-50 dark:bg-zinc-800/30">
                    <td class="p-3" colspan="${totalColumns}">
                        <button
                            onclick="window.${actionNamespace}.addDebt()"
                            ${buttonAttrs}
                            class="w-full text-left text-brand-lime hover:text-brand-lime/80 font-bold text-sm flex items-center gap-2 transition-colors ${disabledClass}">
                            <i data-lucide="plus-circle" width="18"></i>
                            ${labels.table.addRow}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
            </div >
    `;
    },

    // Debt Detail Panel with Monthly Projections
    renderDebtDetailPanel: (debt, simulation, labels = DEBT_LABELS, actionNamespace = 'DebtActions', context = {}) => {
        const moduleState = getModuleState(context);
        const interestMode = getInterestMode(context);
        const readOnly = isReadOnly(context);
        const fieldAttrs = getFieldAttrs(readOnly);
        const checkboxAttrs = readOnly ? 'disabled aria-disabled="true"' : '';

        if (interestMode !== 'debt' && !simulation) return '';

        const overrides = moduleState?.overrides || {};
        const debtTimeline = interestMode === 'debt'
            ? buildSingleDebtTimeline(debt, overrides)
            : (simulation?.timeline || []).map(month => ({
                month: month.month,
                ...month.data.find(d => d.id === debt.id)
            }));

        const debtHistory = (interestMode === 'debt'
            ? debtTimeline.map(row => ({ month: row.month, ...row }))
            : debtTimeline)
            .filter(d => {
                if (!d) return false;
                if (interestMode === 'savings') {
                    // For savings: show if we have debt (remaining > 0) or we made a payment/activity
                    // remaining is the distance to goal. balance is accumulated cash (always > 0).
                    return (d.remaining && d.remaining > 0.01) || d.paid > 0;
                }
                // default debt logic
                return d.balance > 0 || d.paid > 0 || d.basePayment > 0;
            });

        const monthsToPay = interestMode === 'savings'
            ? debtHistory.filter(d => (d.remaining && d.remaining > 0.01) || d.paid > 0).length
            : debtHistory.filter(d => d.paid > 0).length;
        const savingsTargetAmount = Number(debt?.balance) > 0
            ? Number(debt.balance)
            : Number(debt?.initialBalance) || 0;
        const detailHeaderRightText = interestMode === 'savings'
            ? `META: ${formatCurrency(savingsTargetAmount, moduleState)} | ${labels.detail.goal}: ${monthsToPay} MESES`
            : `${labels.detail.goal}: ${monthsToPay} MESES`;

        const visibleMonths = moduleState.visibleMonths?.[debt.id] || 10;
        const visibleHistory = debtHistory.slice(0, visibleMonths);
        const hasMore = debtHistory.length > visibleMonths;

        return `
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 overflow-hidden rounded-xl">
                <!-- Header -->
                <div class="bg-lime-200 dark:bg-lime-900/30 p-3 flex justify-between items-center px-4">
                    <span class="font-bold text-zinc-800 dark:text-zinc-200 text-sm uppercase">${labels.detail.label}: ${debt.name.toUpperCase()}</span>
                    <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">${detailHeaderRightText}</span>
                </div>

                <!-- Projection Table -->
    <div class="overflow-x-auto">
        <table class="w-full text-xs text-center">
            <thead class="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase sticky top-0">
                <tr>
                    <th class="p-2 border-r border-white dark:border-zinc-700 w-8">&#10003;</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 font-extrabold w-24">Mes</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 w-24">${labels.detail.initialBalance}</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 w-20">${labels.detail.interest}</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 bg-zinc-300 dark:bg-zinc-700 w-28">${labels.detail.underPayment}</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 bg-zinc-300 dark:bg-zinc-700 w-28">${labels.detail.additionalPayment}</th>
                    <th class="p-2 border-r border-white dark:border-zinc-700 bg-zinc-300 dark:bg-zinc-700 w-28">${labels.detail.newExpenses}</th>
                    <th class="p-2 w-24">${labels.detail.finalBalance}</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                ${visibleHistory.map((row, idx) => {
            const isChecked = moduleState.completedPayments?.[`${debt.id}-${row.month}`];
            const rowClass = "hover:bg-zinc-50 dark:hover:bg-zinc-800/50";
            const initialBalance = getInitialBalance(row, interestMode);

            return `
                                    <tr class="${rowClass}">
                                        <td class="p-2 border-r border-zinc-100 dark:border-zinc-800">
                                            <input 
                                                type="checkbox" 
                                                ${isChecked ? 'checked' : ''}
                                                onchange="window.${actionNamespace}.togglePayment('${debt.id}', ${row.month}, this.checked)"
                                                ${checkboxAttrs}
                                                class="w-4 h-4 accent-brand-lime ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}">
                                        </td>
                                        <td class="p-2 text-zinc-600 dark:text-zinc-400 font-bold whitespace-nowrap">${formatProjectionMonth(getDebtRowStartDate(debt, moduleState.startDate || getTijuanaDateString()), debt.paymentDay, row.month)}</td>
                                        <td class="p-2 text-zinc-700 dark:text-zinc-300">${formatCurrency(initialBalance, moduleState)}</td>
                                        <td class="p-2 ${interestMode === 'savings' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium">${formatCurrency(row.interest, moduleState)}</td>
                                        <td class="p-1 bg-zinc-50 dark:bg-zinc-800">
                                            <input 
                                                type="number" 
                                                value="${moduleState.overrides?.[`${debt.id}-${row.month}`]?.underPayment || ''}"
                                                ${fieldAttrs}
                                                class="w-full text-right bg-transparent outline-none text-zinc-900 dark:text-white px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}" 
                                                placeholder="${formatCurrency(row.basePayment, moduleState)}"
                                                onchange="window.${actionNamespace}.addOverride('${debt.id}', ${row.month}, 'underPayment', Number(this.value))">
                                        </td>
                                        <td class="p-1 bg-zinc-50 dark:bg-zinc-800">
                                            <div class="flex flex-col items-end gap-1">
                                                <input 
                                                    type="number" 
                                                    value="${row.manualExtra || ''}"
                                                    ${fieldAttrs}
                                                    class="w-full text-right bg-transparent font-bold outline-none text-zinc-900 dark:text-white px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}" 
                                                    placeholder="0.00"
                                                    onchange="window.${actionNamespace}.addOverride('${debt.id}', ${row.month}, 'additionalPayment', Number(this.value))">
                                            </div>
                                        </td>
                                        <td class="p-1 bg-zinc-50 dark:bg-zinc-800">
                                            <input 
                                                type="number" 
                                                value="${row.newExpenses || ''}"
                                                ${fieldAttrs}
                                                class="w-full text-right bg-transparent outline-none text-zinc-900 dark:text-white px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}" 
                                                placeholder="0.00"
                                                onchange="window.${actionNamespace}.addOverride('${debt.id}', ${row.month}, 'newExpenses', Number(this.value))">
                                        </td>
                                        <td class="p-2 font-mono font-bold text-zinc-900 dark:text-white">${formatCurrency(interestMode === 'savings' && row.remaining !== undefined ? row.remaining : row.balance, moduleState)}</td>
                                    </tr>
                                `;
        }).join('')}
            </tbody>
        </table>
    </div>

    <div class="px-3 pb-3 pt-2 flex flex-col items-center gap-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
        ${hasMore ? `
            <button 
                onclick="window.${actionNamespace}.updateVisibleMonths('${debt.id}', 10)"
                class="text-xs font-bold text-zinc-500 hover:text-brand-lime transition-colors flex items-center justify-center gap-1 mx-auto w-full py-1">
                <i data-lucide="chevron-down" width="14"></i>
                Ver más meses (${debtHistory.length - visibleMonths} restantes)
            </button>
        ` : ''}
        
        ${visibleMonths > 10 ? `
            <button 
                onclick="window.${actionNamespace}.updateVisibleMonths('${debt.id}', -10)"
                class="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 mx-auto w-full py-1">
                <i data-lucide="chevron-up" width="14"></i>
                Ver menos meses
            </button>
        ` : ''}
    </div>
</div>
    `;
    },

    // Render Debt Graph Modal
    renderDebtGraphModal: (debtId, labels = DEBT_LABELS, context = {}) => {
        const moduleState = getModuleState(context);
        const calculator = getCalculator(context);
        const { debts } = moduleState;

        // Fix for ID type mismatch (string vs number)
        const debt = debts.find(d => String(d.id) === String(debtId));
        if (!debt) return '';

        const simulation = calculator.calculateSimulation();

        // Calculate Statistics
        const interestMode = getInterestMode(context); // Get mode

        let totalPaidInFuture = 0;
        let totalInterest = 0;
        let totalValue = 0;
        let amountPaidSoFar = 0;
        let totalNewExpenses = 0;
        let initialBalance = debt.initialBalance || debt.balance;
        let monthsToCancel = 0;

        // Labels
        const lblInterest = interestMode === 'savings' ? 'Rendimiento Est.' : 'Intereses Anuales';
        const lblMinPayment = interestMode === 'savings' ? 'Aporte Mensual' : 'Pago Minimo';
        const lblInitial = interestMode === 'savings' ? 'Meta de Ahorro' : 'Deuda inicial';
        const lblTotal = interestMode === 'savings' ? 'Ahorro Total Est.' : 'Total a Pagar:';
        const lblInterestTotal = interestMode === 'savings' ? 'Rendimiento Total' : 'Interes por deuda';
        const lblMonths = interestMode === 'savings' ? '# Meses para meta' : '# Meses para cancelar';
        const lblBarPaid = interestMode === 'savings' ? 'Ahorrado' : 'Pagado';
        const lblBarPending = interestMode === 'savings' ? 'Faltante' : 'Pendiente';

        if (interestMode === 'debt') {
            // Match the exact projection table logic (single debt timeline without strategy rollover).
            const overrides = moduleState?.overrides || {};
            const debtTimeline = buildSingleDebtTimeline(debt, overrides);

            totalPaidInFuture = debtTimeline.reduce((sum, item) => sum + item.paid, 0);
            totalInterest = debtTimeline.reduce((sum, item) => sum + (Number(item.interest) || 0), 0);
            totalNewExpenses = debtTimeline.reduce((sum, item) => sum + (Number(item.newExpenses) || 0), 0);

            if (moduleState.completedPayments) {
                debtTimeline.forEach(row => {
                    if (moduleState.completedPayments[`${debt.id}-${row.month}`]) {
                        amountPaidSoFar += row.paid || 0;
                    }
                });
            }

            const amountPending = totalPaidInFuture - amountPaidSoFar;
            totalValue = amountPaidSoFar + amountPending;

            monthsToCancel = debtTimeline.filter(d => (Number(d.paid) || 0) > 0).length;

        } else {
            // SAVINGS MODE
            initialBalance = debt.initialBalance || debt.balance; // Target Amount

            // Calculate Total Projected Accumulation (Success Case)
            // Iterate through simulation to find accumulation + interest
            let accCapital = (debt.startAmount || 0);
            let accInterest = 0;

            const debtTimeline = simulation?.timeline?.map(month => {
                const d = month.data.find(item => item.id === debt.id);
                return d;
            }).filter(Boolean) || [];

            debtTimeline.forEach(d => {
                accCapital += d.paid;
                accInterest += d.interest;
                totalNewExpenses += Number(d.newExpenses) || 0;
            });

            totalInterest = accInterest;
            // Total Value in Savings is what you end up with
            totalValue = accCapital + accInterest;

            // Paid So Far (Saved So Far)
            amountPaidSoFar = (debt.startAmount || 0); // Start check
            if (moduleState.completedPayments) {
                simulation.timeline.forEach(month => {
                    if (moduleState.completedPayments[`${debt.id}-${month.month}`]) {
                        const mData = month.data.find(d => d.id === debt.id);
                        if (mData) amountPaidSoFar += mData.paid;
                    }
                });
            }

            // For the Graph: "Saved" vs "Remaining to Goal"
            // If TotalValue > Target, use TotalValue. Else Target.
            // Actually, "Total a Pagar" equivalent is "Total a Ahorrar" (The Target? Or The Result?)
            // Let's use Result.

            monthsToCancel = debtTimeline.filter(d => d.remaining > 0.01).length;
        }


        const paidPct = totalValue > 0
            ? Math.min(100, Math.max(0, (amountPaidSoFar / totalValue) * 100))
            : 0;
        const pendingPct = Math.max(0, 100 - paidPct);
        const annualRate = Number(debt.rate);
        const annualRateLabel = Number.isFinite(annualRate) ? `${annualRate.toFixed(2)}%` : '0.00%';

        return `
            <dialog id="debt-graph-modal" class="modal bg-transparent p-0 w-full max-w-4xl backdrop:bg-black/80 flex items-center justify-center">
                <div class="bg-white dark:bg-zinc-900 w-full rounded-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <!-- Title Header -->
                    <div class="p-6 text-center">
                        <h2 class="text-2xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">${interestMode === 'savings' ? 'AHORRO' : 'DEUDA'} ${debts.indexOf(debt) + 1}</h2>
                    </div>

                    <!-- Yellow Banner -->
                    <div class="bg-brand-lime p-3 text-center mb-6">
                        <h3 class="text-xl font-bold uppercase text-black tracking-wide">${debt.name}</h3>
                    </div>

                    <!-- Content Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 px-8 pb-8">
                        
                        <!-- Left Column: Tables -->
                        <div class="space-y-6">
                            <!-- Blue Table -->
                            <table class="w-full text-sm">
                                <tbody class="text-white">
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">${lblInterest}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center w-1/3">${annualRateLabel}</td>
                                    </tr>
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">${lblMinPayment}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${formatCurrency(debt.minPayment, moduleState)}</td>
                                    </tr>
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">${lblInitial}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${formatCurrency(initialBalance, moduleState)}</td>
                                    </tr>
                                    <tr class="bg-blue-500">
                                        <td class="p-3">Día corte del estado de cuenta</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${debt.paymentDay}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <!-- Simple Total Table -->
                            <table class="w-full text-sm mt-4">
                                <tbody class="text-white">
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">${lblTotal}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center w-1/3">${formatCurrency(totalValue, moduleState)}</td>
                                    </tr>
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">Nuevos Gastos</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${formatCurrency(totalNewExpenses, moduleState)}</td>
                                    </tr>
                                    <tr class="bg-blue-500 border-b border-blue-400">
                                        <td class="p-3">${lblInterestTotal}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${formatCurrency(totalInterest, moduleState)}</td>
                                    </tr>
                                    <tr class="bg-blue-500">
                                        <td class="p-3">${lblMonths}</td>
                                        <td class="p-3 text-right font-bold bg-white text-black text-center">${monthsToCancel}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Right Column: Graph -->
                        <div class="border border-zinc-900 p-4 flex items-end justify-center gap-12 h-64 relative bg-white dark:bg-zinc-800">
                            <!-- Y-Axis Labels (Simulated) -->
                            <div class="absolute left-2 top-2 bottom-2 flex flex-col justify-between text-[10px] text-zinc-500">
                                <span>100%</span>
                                <span>0%</span>
                            </div>

                            <!-- Paid Bar -->
                            <div class="w-24 bg-zinc-800 dark:bg-zinc-600 flex flex-col justify-end items-center relative group" style="height: ${Math.max(1, paidPct)}%">
                                <div class="absolute -top-6 text-xs font-bold text-zinc-900 dark:text-white">${paidPct.toFixed(2)}%</div>
                                <div class="absolute -bottom-8 text-sm font-bold text-zinc-900 dark:text-white">${lblBarPaid}</div>
                            </div>
                            
                            <!-- Pending Bar -->
                            <div class="w-24 bg-brand-lime flex flex-col justify-end items-center relative group" style="height: ${Math.max(1, pendingPct)}%">
                                <div class="absolute -top-6 text-xs font-bold text-zinc-900 dark:text-white">${pendingPct.toFixed(2)}%</div>
                                <div class="absolute -bottom-8 text-sm font-bold text-zinc-900 dark:text-white">${lblBarPending}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Close Button -->
                    <form method="dialog" class="absolute top-4 right-4">
                        <button class="text-zinc-400 hover:text-zinc-600 dark:hover:text-white bg-white dark:bg-black rounded-full p-1"><i data-lucide="x" width="24"></i></button>
                    </form>
                </div>
            </dialog>
        `;
    },

    // Render Delete Confirmation Modal (Native Dialog)
    renderDeleteConfirmationModal: (title, message, onConfirm, onCancel, confirmText = 'Eliminar', cancelText = 'Cancelar') => {
        const modalId = 'delete-confirmation-modal';

        const html = `
            <dialog id="${modalId}" class="modal bg-transparent p-0 backdrop:bg-black/60 flex items-center justify-center">
                 <div class="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200 p-6 text-center">
                    
                    <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                        <i data-lucide="alert-triangle" width="24"></i>
                    </div>

                    <h3 class="text-lg font-black text-zinc-900 dark:text-white mb-2">${title}</h3>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">${message}</p>

                    <div class="flex gap-3 justify-center">
                        <button id="${modalId}-cancel" class="flex-1 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl transition-colors">
                            ${cancelText}
                        </button>
                        <button id="${modalId}-confirm" class="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </dialog>
        `;

        // Remove existing if any
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        // Inject
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = document.getElementById(modalId);

        // Initialize icons
        if (window.lucide) window.lucide.createIcons();

        // Event Listeners
        const confirmBtn = document.getElementById(`${modalId}-confirm`);
        const cancelBtn = document.getElementById(`${modalId}-cancel`);

        const close = () => {
            modal.close();
            modal.remove();
        };

        confirmBtn.onclick = () => {
            if (onConfirm) onConfirm();
            close();
        };

        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            close();
        };

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            const rect = modal.getBoundingClientRect();
            const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                close();
            }
        });

        modal.showModal();
    }
};
