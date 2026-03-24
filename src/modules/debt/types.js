// Debt Module Types and Constants

export const DEBT_COLORS = {
    red: '#ef4444',
    orange: '#f97316',
    green: '#10b981',
    greenLight: '#6ee7b7',
    lime: '#cde52d',
    blue: '#0d85fa'
};

export const DEBT_STRATEGIES = {
    SNOWBALL: 'snowball',
    AVALANCHE: 'avalanche'
};

export const DEBT_STRATEGY_LABELS = {
    snowball: {
        name: 'Bola de Nieve',
        description: 'Paga primero deudas con menor saldo (motivación rápida)',
        icon: 'zap'
    },
    avalanche: {
        name: 'Avalancha',
        description: 'Paga primero deudas con mayor tasa de interés (ahorro óptimo)',
        icon: 'trending-down'
    }
};
