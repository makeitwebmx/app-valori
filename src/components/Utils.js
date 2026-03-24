
export const renderLogo = (h = 'h-12') => `
    <img src="assets/logo_full_black_green.png" alt="Valori Logo" class="${h} object-contain block dark:hidden">
    <img src="assets/logo_full_white_green.png" alt="Valori Logo" class="${h} object-contain hidden dark:block">
`;

export const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    toast.className = `fixed bottom-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in flex items-center gap-3 font-bold`;
    toast.innerHTML = `
        ${type === 'success' ? '<i data-lucide="check-circle" width="20"></i>' : ''}
        ${type === 'error' ? '<i data-lucide="alert-circle" width="20"></i>' : ''}
        ${type === 'info' ? '<i data-lucide="info" width="20"></i>' : ''}
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
};
