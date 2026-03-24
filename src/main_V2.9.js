// Main Entry Point - Loads the complete original system as a module
// This preserves 100% functionality while allowing future modular refactoring

import './legacy_V2.9.js?v=2.9.0';
import './components/Auth.js?v=2.0';
import './modules/debt/index.js?v=2.0';
import './modules/savings/index.js?v=2.0';

window.addEventListener('unhandledrejection', (event) => {
    const reason = event && event.reason;
    if (reason && reason.name === 'AbortError' && typeof reason.message === 'string' && reason.message.includes('signal is aborted')) {
        event.preventDefault();
    }
});

console.log("✅ App loaded via ES Modules");


