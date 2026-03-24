
import { state } from '../store.js';
import { renderLogo } from './Utils.js';

const renderMenuCard = ({ title, desc, icon, color, action }) => {
    const colors = {
        lime: 'text-brand-lime bg-lime-100 dark:bg-brand-lime/10',
        blue: 'text-brand-blue bg-blue-100 dark:bg-brand-blue/10',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20',
        orange: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20',
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20',
        sky: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/20',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20',
        pink: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/20',
        zinc: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800',
    };

    const theme = colors[color] || colors.zinc;

    return `
    <div onclick="${action}" class="group bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col h-full relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity transform scale-150 translate-x-4 -translate-y-4">
             <i data-lucide="${icon}" width="120" height="120"></i>
        </div>
        
        <div class="w-12 h-12 rounded-xl ${theme} flex items-center justify-center mb-4 transition-colors">
            <i data-lucide="${icon}" width="24"></i>
        </div>
        
        <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-2 leading-tight">${title}</h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 flex-grow">${desc}</p>
        
        <div class="flex items-center text-xs font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-zinc-400 hover:text-brand-blue">
            Ingresar <i data-lucide="arrow-right" class="ml-1 w-3 h-3"></i>
        </div>
    </div>
    `;
};

export const MainMenu = {
    render: () => {
        const userName = state.user ? (state.user.full_name || state.user.email || 'Usuario').split('@')[0].split(' ')[0] : 'Invitado';

        return `
        <div class="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 animate-fade-in pb-20">
            
            <!-- Header -->
            <header class="flex justify-between items-center mb-8 max-w-7xl mx-auto w-full">
                 <div class="flex items-center gap-3">
                     ${renderLogo('h-8')}
                 </div>
                 <div class="flex items-center gap-3">
                     <button onclick="actions.toggleTheme()" class="p-2.5 rounded-xl bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:scale-105 transition-transform shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <i data-lucide="moon" class="hidden dark:block w-5 h-5"></i>
                        <i data-lucide="sun" class="block dark:hidden w-5 h-5"></i>
                     </button>
                     ${state.user ? `
                     <button onclick="actions.logout()" title="Cerrar Sesión" class="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-transparent dark:border-red-900/30 flex items-center gap-2 font-bold text-sm">
                        <i data-lucide="log-out" width="18"></i> Salir
                     </button>
                     ` : `
                     <button onclick="state.view = 'login'; updateUI()" class="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 transition-transform">
                        Ingresar
                     </button>
                     `}
                 </div>
            </header>

            <!-- Hero Section -->
            <div class="max-w-7xl mx-auto w-full bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 text-white mb-16 shadow-2xl relative overflow-hidden group">
                 <!-- Background Effects -->
                 <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-lime/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                 <div class="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                 
                 <div class="relative z-10">
                     <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-brand-lime mb-6">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-lime opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-lime"></span>
                        </span>
                        Sistema Operativo V2.1
                     </div>
                     <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6">
                        Hola, ${userName} <span class="text-zinc-500 font-medium text-2xl md:text-4xl block md:inline md:ml-4">¿Qué vamos a optimizar?</span>
                     </h1>
                     <p class="text-zinc-400 max-w-xl text-lg mb-8 leading-relaxed">
                        Tu centro de control financiero inteligente. Accede a herramientas de diagnóstico, planificación y gestión empresarial en un solo lugar.
                     </p>
                     <div class="flex flex-wrap gap-4">
                         <button onclick="actions.startTransactionAnalysis()" class="bg-brand-lime text-zinc-900 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-lime/90 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(205,229,45,0.2)] hover:scale-105">
                             <i data-lucide="zap"></i> Análisis Rápido
                         </button>
                         ${state.user?.role === 'coach' ? `
                         <button onclick="actions.startCoachModule()" class="bg-zinc-800 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-zinc-700 transition-all flex items-center gap-2 border border-zinc-700">
                             <i data-lucide="briefcase"></i> Panel de Coach
                         </button>
                         ` : ''}
                     </div>
                 </div>
            </div>

            <!-- Content Grid -->
            <div class="max-w-7xl mx-auto w-full space-y-10">
                
                <!-- Section: Personal -->
                <section>
                    <div class="flex items-center gap-3 mb-6 px-2">
                        <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-brand-blue">
                            <i data-lucide="user" width="18"></i>
                        </div>
                        <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Finanzas Personales</h2>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${renderMenuCard({
            title: 'Salud Financiera',
            desc: 'Diagnóstico 360° de tus finanzas personales.',
            icon: 'activity',
            color: 'lime',
            action: 'actions.startQuizIntro()'
        })}
                        ${renderMenuCard({
            title: 'Portafolio',
            desc: 'Levantamiento Inicial y Plan de Ahorro.',
            icon: 'briefcase',
            color: 'emerald',
            action: 'actions.startPortfolio()'
        })}
                        ${renderMenuCard({
            title: 'Levantamiento',
            desc: 'Planifica y controla tus gastos mensuales.',
            icon: 'pie-chart',
            color: 'blue',
            action: 'actions.startBudget()'
        })}
                        ${renderMenuCard({
            title: 'Perfil Inversor',
            desc: 'Descubre tu tolerancia al riesgo.',
            icon: 'trending-up',
            color: 'purple',
            action: 'actions.startInvestorQuiz()'
        })}
                        ${renderMenuCard({
            title: 'Módulo Cliente',
            desc: 'Gestiona tu progreso y conexiones.',
            icon: 'layout',
            color: 'zinc',
            action: 'actions.startClientIntro()'
        })}
                        ${renderMenuCard({
            title: 'Control de Deudas',
            desc: 'Estrategia para eliminar tus deudas.',
            icon: 'credit-card',
            color: 'orange',
            action: 'actions.startDebtControl()'
        })}
                    </div>
                </section>

                <!-- Section: Business -->
                <section>
                    <div class="flex items-center gap-3 mb-6 px-2">
                        <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                             <i data-lucide="building-2" width="18"></i>
                        </div>
                        <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Negocios y Emprendimiento</h2>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderMenuCard({
            title: 'Salud Empresarial',
            desc: 'Evalúa los 5 pilares de tu negocio.',
            icon: 'award',
            color: 'sky',
            action: 'actions.startBusinessQuizIntro()'
        })}
                        ${renderMenuCard({
            title: 'Finanzas PyME',
            desc: 'Gestión de flujo de caja y presupuestos.',
            icon: 'bar-chart-3',
            color: 'indigo',
            action: 'actions.startBusinessModule()'
        })}
                        ${renderMenuCard({
            title: 'Costeo',
            desc: 'Calculadora de costos y precios.',
            icon: 'calculator',
            color: 'emerald',
            action: 'actions.startCostingModule()'
        })}
                    </div>
                </section>

                <!-- Section: Tools -->
                 <section>
                    <div class="flex items-center gap-3 mb-6 px-2">
                        <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                             <i data-lucide="boxes" width="18"></i>
                        </div>
                        <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Herramientas & Soporte</h2>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderMenuCard({
            title: 'Analizador de Gastos',
            desc: 'Procesa estados de cuenta automáticamente.',
            icon: 'file-search',
            color: 'orange',
            action: 'actions.startTransactionAnalysis()'
        })}
                        ${renderMenuCard({
            title: 'Centro de Ayuda',
            desc: 'Reporta problemas o solicita funciones.',
            icon: 'life-buoy',
            color: 'pink',
            action: 'actions.startSupportModule()'
        })}
                        
                         ${state.user?.role === 'admin' || state.user?.email.includes('admin') ? `
                            ${renderMenuCard({
            title: 'Panel Admin',
            desc: 'Gestión de tickets y soporte técnico.',
            icon: 'shield-alert',
            color: 'zinc',
            action: 'actions.startSupportAdmin()'
        })}
                         ` : ''}

                    </div>
                </section>

            </div>
        </div>
        `;
    }
};
