
import { reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { Portfolio } from './components/Portfolio.js';
// Using Vue's reactive system for state management if acceptable, 
// OR simpler vanilla object. Let's stick to vanilla object for now to match current logic, 
// but we need a way to trigger updates. The current app uses `updateUI()`.

const isMobileDevice = typeof window !== 'undefined' && !!window.__IS_MOBILE_DEVICE__;

export const state = {
    appBooting: true,
    view: 'menu',
    user: null,
    coachees: [],
    answers: {},
    currentCategoryIndex: 0,
    started: false,
    streak: 0,
    planningDateFilter: '', // YYYY-MM-DD
    mascot: { visible: false, message: '', mood: 'idle', timer: null },
    mascotFaq: { open: false, selectedIndex: null, contextKey: null },
    mascotHidden: false,
    mascotPosition: null,
    budgetData: {
        incomes: [],
        fixed: [],
        variable: [],
        debt: [],
        savings: []
    },
    portfolio: {
        others: [
            { id: 1, label: 'OTRO', value: 500 },
            { id: 2, label: 'OTRO', value: 800 }
        ],
        liquid: 0,
        expenses2026: [
            { id: 1, label: 'GASTO', value: 900 },
            { id: 2, label: 'GASTO', value: 600 },
            { id: 3, label: 'GASTO', value: 0 }
        ],
        expenses2027: [
            { id: 1, label: 'GASTO', value: 450 },
            { id: 2, label: 'GASTO', value: 850 }
        ],
        savingsPlan: {
            goals: [
                { id: 1, amount: 2000, months: 1 },
                { id: 2, amount: 1000, months: 3 },
                { id: 3, amount: 2000, months: 5 },
                { id: 4, amount: 4000, months: 2 }
            ],
            monthlyData: [
                [150, 6465, 21, 1252], // Enero
                [200, 6189, 213, 111], // Febrero
                [55, 234, 250, 451],   // Marzo
                [666, 425, 2322, 215], // Abril
                [546, 0, 150, 5238],   // Mayo
                [500, 0, 25, 0],       // Junio
                [685, 0, 0, 0],        // Julio
                [152, 0, 0, 0],        // Agosto
                [235, 0, 0, 0],        // Septiembre
                [2512, 0, 0, 0],       // Octubre
                [12522, 0, 0, 0],      // Noviembre
                [211, 0, 0, 0]         // Diciembre
            ]
        },
        currentView: 'investment', // 'initial' or 'investment'
        investment: {
            amount: 2000000,
            type: 'ARRIESGADO',
            distribution: {
                fixed: { percent: 25, amount: 500000 },
                alternative: { percent: 40, amount: 800000 },
                liquid: { percent: 5, amount: 100000 },
                variable: { percent: 30, amount: 600000 }
            },
            projections: [
                { id: 1, initial: 10000, monthly: 500, days: 365, rate: 10, freq: 'ANUAL', variance: 17 }
            ],
            expandedProjections: [1], // IDs of expanded projections
            objectives: [
                { id: 1, concept: '', amount: 52, time: 3, risk: 10 },
                { id: 2, concept: '', amount: 0, time: 0, risk: 0 },
                { id: 3, concept: '', amount: 0, time: 0, risk: 0 },
                { id: 4, concept: '', amount: 0, time: 0, risk: 0 },
                { id: 5, concept: '', amount: 0, time: 0, risk: 0 },
                { id: 6, concept: '', amount: 0, time: 0, risk: 0 }
            ],
            realDistribution: {
                fixed: { percent: 47, amount: 2900 },
                alternative: { percent: 21, amount: 1300 },
                liquid: { percent: 24, amount: 1500 },
                variable: { percent: 8, amount: 500 }
            },
            executedInvestments: []
        },
        investmentFilters: {
            date: '',
            objective: '',
            classification: '',
            tool: '',
            period: '',
            rateMin: '',
            rateMax: '',
            amountMin: '',
            amountMax: '',
            expiry: '',
            status: ''
        },
        investmentFilterDraft: {
            date: '',
            objective: '',
            classification: '',
            tool: '',
            period: '',
            rateMin: '',
            rateMax: '',
            amountMin: '',
            amountMax: '',
            expiry: '',
            status: ''
        },
        editingInvestmentId: null,
        isEditInvestmentModalOpen: false,
        hasAnimated: false,
        isInvestmentModalOpen: false,
        isLoading: false,
        isLoaded: false,
        loadedUserId: null,
        deleteConfirmation: {
            isOpen: false,
            index: null
        }
    },
    clientTab: 'vision360',
    coachTab: 'dashboard',
    coachCalendar: {
        year: new Date().getFullYear(),
        month: new Date().getMonth()
    },
    coachAuth: false,
    impersonatedUserId: null,
    coacheeViewMode: null, // 'readonly' | 'edit_limited' | null
    sidebarOpen: !isMobileDevice && window.innerWidth >= 768,
    isFullscreen: typeof document !== 'undefined' && !!document.fullscreenElement,
    isMobileDevice,
    subscriptionType: 'empleado',
    invitedEmail: null,
    invitedCoachId: null,
    registerRole: 'client',
    registerPlanType: 'personal',
    registerAcceptedTerms: false,
    blockCoachView: false,
    sessions: [], // Now will be populated from DB
    coachContracts: [],
    selectedContractTemplate: 'contrato_finanzas',
    contractsSearch: '',
    notifications: [],
    showNotifications: false,
    googleCalendar: {
        connected: false,
        accessToken: null,
        tokenExpiresAt: null,
        calendarId: 'primary',
        events: [],
        syncing: false,
        lastSyncAt: null
    },
    transactions: [],
    personalFilters: {
        dateFrom: '',
        dateTo: '',
        type: '',
        category: '',
        status: '',
        bank: ''
    },
    transactionFilters: {
        category: 'all',
        dateRange: 'all',
        searchTerm: ''
    },
    charts: {},
    supportTickets: JSON.parse(localStorage.getItem('supportTickets') || '[]'),
    supportAdmin: false,
    activeAdminTicket: null,
    adminAccessContext: 'portal',
    adminPortal: {
        authenticated: false,
        token: null,
        loading: false,
        error: null,
        coaches: [],
        coachees: [],
        stats: {
            totalCoaches: 0,
            activeCoaches: 0,
            totalCoachees: 0,
            activeCoachees: 0
        },
        listMode: 'coaches',
        search: ''
    },
    costingData: {
        investment: [],
        fixedExpenses: [],
        labor: [],
        services: Array(20).fill().map((_, i) => ({ id: i + 1, sold: 0 })),
        products: [],
        participationOrder: [],
        settings: { dollarRate: 18.50, margin: 40 }
    },
    businessData: {
        currentTab: 'dashboard',
        cashFlowCurrency: 'MXN',
        config: {
            incomeCategories: ['Servicios', 'Productos', 'Consultoría', 'Otros Ingresos'],
            expenseCategories: ['Nómina', 'Renta', 'Marketing', 'Servicios', 'Software', 'Impuestos', 'Materia Prima', 'Mantenimiento'],
            costCategories: ['Mano de Obra Directa', 'Materia Prima Directa', 'Costos de Fabricación'],
            banks: ['BBVA', 'Santander', 'Banamex', 'Efectivo', 'PayPal', 'Stripe'],
            paymentMethods: ['Transferencia', 'Tarjeta Crédito', 'Tarjeta Débito', 'Efectivo', 'Cheque']
        },
        transactions: [],
        filters: {
            dateFrom: '',
            dateTo: '',
            type: '',
            category: '',
            status: '',
            bank: ''
        },
        budget: {
            expenses: [],
            payroll: []
        },
        collapsedCharts: {
            topClients: false,
            topProviders: false,
            incomeExpense: false,
            expenseCat: false,
            subcategories: false
        }
    },
    businessQuiz: {
        answers: {},
        currentSectionIndex: 0,
        completed: false
    },
    businessGoals: [
        { id: 1, name: 'Ingresos Mensuales', target: 0, unit: 'MXN', type: 'income', goalKind: 'amount' },
        { id: 2, name: 'Clientes Activos', target: 0, unit: 'clientes', type: 'clients', goalKind: 'count' },
        { id: 3, name: 'Margen de Utilidad', target: 0, unit: '%', type: 'margin', goalKind: 'percent' }
    ],
    investorQuiz: {
        answers: {},
        currentQuestionIndex: 0,
        completed: false
    },
    analysisSurveyCompleted: false,
    analysisSurveyNeedsCoach: false,
    budgetCurrency: 'MXN', // Currency selection for Financial Plan view
    vision360Currency: 'MXN', // Currency toggle for Tu Visión 360° (Personal & Empresarial)
    clientCategory: 'personal', // 'personal' or 'business'
    startModuleExpanded: false,
    savingsModule: {
        currentView: 'dashboard',
        debts: [],
        overrides: {},
        completedPayments: {},
        strategy: 'snowball',
        monthlyBudget: 0,
        startDate: '',
        currency: 'MXN',
        isLoading: false
    }
};

// Load persisted business goals from localStorage
try {
    const savedGoals = localStorage.getItem('valori_businessGoals');
    if (savedGoals) state.businessGoals = JSON.parse(savedGoals);
} catch (e) { }

try {
    const mascotPrefs = localStorage.getItem('valori_mascot_prefs');
    if (mascotPrefs) {
        const parsed = JSON.parse(mascotPrefs);
        if (parsed && typeof parsed === 'object') {
            if (typeof parsed.hidden === 'boolean') state.mascotHidden = parsed.hidden;
            if (parsed.position && typeof parsed.position === 'object') {
                const x = Number(parsed.position.x);
                const y = Number(parsed.position.y);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    state.mascotPosition = { x, y };
                }
            }
        }
    }
} catch (e) { }

if (Array.isArray(state.businessGoals)) {
    state.businessGoals = state.businessGoals.map(goal => ({
        ...goal,
        goalKind: goal.goalKind || (goal.type === 'clients' ? 'count' : goal.type === 'margin' ? 'percent' : 'amount')
    }));
}



// Simple event bus or callback for UI updates
let uiUpdater = null;

export const setUiUpdater = (fn) => {
    uiUpdater = fn;
};

export const updateUI = () => {
    if (state.appBooting) {
        if (uiUpdater) uiUpdater();
        return;
    }
    if (state.view === 'portfolio') {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = Portfolio.render();
            if (window.lucide) window.lucide.createIcons();
        }
        return;
    }
    if (uiUpdater) uiUpdater();
};
