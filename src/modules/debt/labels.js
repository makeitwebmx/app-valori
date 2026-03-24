import { DEBT_STRATEGY_LABELS } from './types.js';

const SAVINGS_STRATEGY_LABELS = {
    snowball: {
        name: 'Bola de Nieve',
        description: 'Aporta primero a metas con menor saldo (motivación rápida)',
        icon: 'zap'
    },
    avalanche: {
        name: 'Avalancha',
        description: 'Aporta primero a metas con mayor rendimiento (ahorro óptimo)',
        icon: 'trending-up'
    }
};

export const DEBT_LABELS = {
    header: {
        title: 'Gestión de Deudas',
        subtitle: 'Plan de liberación y control de deudas',
        manageButton: 'Gestionar Deudas'
    },
    metrics: {
        total: 'Deuda Total',
        monthlyMax: 'Pago Mensual Máx',
        monthlyHint: 'Con plan estimado',
        time: 'Tiempo Libre',
        timeHint: 'Con pago actual'
    },
    list: {
        title: 'Mis Deudas',
        emptyTitle: 'No tienes deudas registradas',
        emptyAction: 'Agregar Primera Deuda',
        paidLabel: 'Pagado',
        remainingLabel: 'Saldo Restante',
        paidAmountLabel: 'Monto Pagado',
        priorityLabel: 'Prioridad'
    },
    strategy: {
        title: 'Estrategia de Pago',
        options: DEBT_STRATEGY_LABELS
    },
    progress: {
        title: 'Progreso de Liberación',
        completeLabel: 'Completado',
        paidLabel: 'PAGADO',
        remainingLabel: 'RESTANTE'
    },
    management: {
        title: 'Gestor de Deudas',
        subtitle: 'Edita y analiza tus cuentas en detalle',
        editTitle: 'Editar Mis Deudas',
        startDateLabel: 'Fecha de Inicio',
        currencyLabel: 'Tipo de Moneda',
        summaryTitle: 'Resumen de Gestión',
        summaryText: 'Asegúrate de registrar todas tus deudas para obtener un plan preciso.',
        totalAccountsLabel: 'Total Cuentas',
        totalBalanceLabel: 'Total Saldo',
        backButton: 'Volver al Tablero'
    },
    details: {
        title: 'Proyecciones Detalladas',
        emptyTitle: 'No hay proyecciones disponibles',
        emptySubtitle: 'Agrega una deuda para ver las proyecciones'
    },
    table: {
        name: 'Nombre',
        type: 'Tipo',
        startDate: 'Fecha de Inicio',
        initialBalance: 'Deuda Inicial',
        balance: 'Saldo',
        rate: 'Tasa (%)',
        minPayment: 'Pago Mínimo',
        paymentDay: 'Día de Pago',
        actions: 'Acciones',
        namePlaceholder: 'Nombre de la deuda',
        addRow: 'Agregar Nueva Deuda',
        typePrimaryValue: 'credito',
        typePrimaryLabel: 'Crédito',
        typePrimaryTitle: 'Tarjeta de Crédito',
        typeSecondaryValue: 'debito',
        typeSecondaryLabel: 'Préstamo',
        typeSecondaryTitle: 'Préstamo'
    },
    detail: {
        label: 'DEUDA',
        goal: 'LIBRE EN',
        initialBalance: 'Deuda Inicial',
        interest: 'Intereses',
        underPayment: 'Pago Por Debajo ✏️',
        additionalPayment: 'Pago Adicional ✏️',
        newExpenses: 'Nvos. Gastos ✏️',
        finalBalance: 'Balance Final'
    },
    actions: {
        defaultName: 'Nueva Deuda',
        removeConfirm: '¿Estás seguro de eliminar esta deuda?',
        addError: 'Error al agregar deuda. Por favor intenta de nuevo.',
        removeError: 'Error al eliminar deuda. Por favor intenta de nuevo.'
    }
};

export const SAVINGS_LABELS = {
    header: {
        title: 'Plan de Ahorro',
        subtitle: 'Plan de ahorro y control de metas',
        manageButton: 'Gestionar Ahorros'
    },
    metrics: {
        total: 'Ahorro Total',
        monthlyMax: 'Aporte Mensual Máx',
        monthlyHint: 'Con plan estimado',
        time: 'Tiempo Objetivo',
        timeHint: 'Con aporte actual'
    },
    list: {
        title: 'Mis Ahorros',
        emptyTitle: 'No tienes ahorros registrados',
        emptyAction: 'Agregar Primer Ahorro',
        paidLabel: 'Ahorrado',
        remainingLabel: 'Saldo Restante',
        paidAmountLabel: 'Monto Ahorrado',
        priorityLabel: 'Prioridad'
    },
    strategy: {
        title: 'Estrategia de Ahorro',
        options: SAVINGS_STRATEGY_LABELS
    },
    progress: {
        title: 'Progreso de Ahorro',
        completeLabel: 'Completado',
        paidLabel: 'AHORRADO',
        remainingLabel: 'RESTANTE'
    },
    management: {
        title: 'Gestor de Ahorro',
        subtitle: 'Edita y analiza tus metas en detalle',
        editTitle: 'Editar Mis Ahorros',
        startDateLabel: 'Fecha de Inicio',
        currencyLabel: 'Tipo de Moneda',
        summaryTitle: 'Resumen de Ahorro',
        summaryText: 'Asegúrate de registrar todos tus ahorros para obtener un plan preciso.',
        totalAccountsLabel: 'Total Metas',
        totalBalanceLabel: 'Total Objetivo',
        backButton: 'Volver al Tablero'
    },
    details: {
        title: 'Proyecciones Detalladas',
        emptyTitle: 'No hay proyecciones disponibles',
        emptySubtitle: 'Agrega un ahorro para ver las proyecciones'
    },
    table: {
        name: 'Nombre',
        type: 'Tipo',
        startDate: 'Fecha de Inicio',
        initialBalance: 'Monto de Inicio',
        balance: 'Meta',
        rate: 'Rendimiento (%)',
        minPayment: 'Aporte Mínimo',
        paymentDay: 'Día de Aporte',
        actions: 'Acciones',
        namePlaceholder: 'Nombre del ahorro',
        addRow: 'Agregar Nuevo Ahorro',
        typePrimaryValue: 'programado',
        typePrimaryLabel: 'Programado',
        typePrimaryTitle: 'Ahorro Programado',
        typeSecondaryValue: 'flexible',
        typeSecondaryLabel: 'Flexible',
        typeSecondaryTitle: 'Ahorro Flexible'
    },
    detail: {
        label: 'AHORRO',
        goal: 'OBJETIVO EN',
        initialBalance: 'Saldo Inicial',
        interest: 'Rendimientos',
        underPayment: 'Aporte Por Debajo ✏️',
        additionalPayment: 'Aporte Adicional ✏️',
        newExpenses: 'Retiros ✏️',
        finalBalance: 'Saldo Restante'
    },
    actions: {
        defaultName: 'Nuevo Ahorro',
        removeConfirm: '¿Estás seguro de eliminar este ahorro?',
        addError: 'Error al agregar ahorro. Por favor intenta de nuevo.',
        removeError: 'Error al eliminar ahorro. Por favor intenta de nuevo.'
    }
};
