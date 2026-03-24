
export const renderCoachPlans = (state) => {
    const resolveCoachPlanLabel = (user) => {
        const raw = String(user?.plan_type || user?.package_type || user?.plan || '').trim();
        if (!raw) return '';
        const normalized = raw.toLowerCase();
        if (normalized.includes('basic')) return 'Plan Basic';
        if (normalized.includes('plus') || normalized.includes('premium')) return 'Plan Plus';
        if (normalized.includes('free')) return 'Plan Free';
        if (normalized.includes('new')) return 'Plan New';
        return raw;
    };
    // Inject checkout helper
    if (typeof window !== 'undefined' && !window.checkoutStripe) {
        window.checkoutStripe = async (priceIdPlaceholder) => {
            try {
                // LIVE MODE - price IDs de cuenta Stripe live
                let stripePriceId = '';
                if (priceIdPlaceholder === 'PRICE_BASIC_MONTHLY') stripePriceId = 'price_1T9WpsIEnqYpbywNiQYptodC';
                if (priceIdPlaceholder === 'PRICE_BASIC_ANNUAL') stripePriceId = 'price_1T9WpsIEnqYpbywNMD3kWn8o';
                if (priceIdPlaceholder === 'PRICE_PLUS_MONTHLY') stripePriceId = 'price_1T9WptIEnqYpbywNG205uY6m';
                if (priceIdPlaceholder === 'PRICE_PLUS_ANNUAL') stripePriceId = 'price_1T9WptIEnqYpbywN9d9gxB43';
                if (priceIdPlaceholder === 'PRICE_PLUS_UPGRADE_MONTHLY') stripePriceId = 'price_1T9WpuIEnqYpbywNIOjEV7DN';
                if (priceIdPlaceholder === 'PRICE_PLUS_UPGRADE_ANNUAL') stripePriceId = 'price_1T9WpuIEnqYpbywNYcYXPDp2';

                if (!stripePriceId) {
                    alert('Precio no configurado para este upgrade.');
                    return;
                }

                const res = await fetch(((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000' : 'https://appvalori.onrender.com') + '/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priceId: stripePriceId, userId: state.user?.id || '', returnUrl: window.location.origin })
                });
                const data = await res.json();
                if (data.ok && data.url) {
                    window.location.href = data.url;
                } else {
                    alert('Error al iniciar pago: ' + (data.message || 'Desconocido'));
                }
            } catch (e) {
                alert('Error de conexión con Stripe');
            }
        };
    }

    const currentPlan = resolveCoachPlanLabel(state.user);
    const isExpired = state.user?._subscriptionExpired === true;
    const expiredPlanName = state.user?._expiredPlan || '';
    const isPlusPlan = currentPlan === 'Plan Plus';
    const isBasicPlan = currentPlan === 'Plan Basic';
    const isUpgradeActive = state.user?.coach_upgrade_active === true;

    return `
    <div class="animate-fade-in space-y-8 pb-12">

        <!-- Header -->
        <div class="text-center mb-8">
            <h2 class="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Planes para el Coach</h2>
            <p class="text-zinc-500 dark:text-zinc-400 mt-2">Elige el plan que mejor se adapte a tus necesidades y crecimiento.</p>
        </div>

        <!-- Plan actual / Aviso de expiración -->
        ${isExpired ? `
        <div class="max-w-5xl mx-auto px-4 md:px-0">
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-4 flex items-center gap-4">
                <i data-lucide="alert-circle" class="text-red-500 shrink-0" width="22"></i>
                <div>
                    <p class="text-sm font-bold text-red-700 dark:text-red-400">Tu suscripción ${expiredPlanName ? `de <strong>${expiredPlanName}</strong>` : ''} ha expirado.</p>
                    <p class="text-xs text-red-600 dark:text-red-500 mt-0.5">Renueva tu plan para seguir disfrutando de las funciones.</p>
                </div>
            </div>
        </div>
        ` : currentPlan && currentPlan !== 'Plan Free' ? `
        <div class="max-w-5xl mx-auto px-4 md:px-0">
            <div class="bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 rounded-2xl px-6 py-4 flex items-center gap-4">
                <i data-lucide="check-circle-2" class="text-brand-blue shrink-0" width="22"></i>
                <p class="text-sm font-bold text-brand-blue">Plan activo: <span class="uppercase">${currentPlan}</span></p>
            </div>
        </div>
        ` : ''}

        <!-- Plans Grid -->
        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4 md:px-0">
            
            <!-- Plan Basic -->
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col transform transition-all duration-300 hover:-translate-y-1">
                <div class="bg-gradient-to-r from-blue-600 to-brand-blue py-5 text-center relative overflow-hidden">
                    <h3 class="text-white font-black text-xl uppercase tracking-widest relative z-10 drop-shadow-sm">Plan Basic</h3>
                </div>
                
                <div class="p-8 flex-1 flex flex-col">
                     <div class="space-y-6 mb-8 flex-1">
                        <!-- Pricing Row -->
                        <div class="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700 shadow-inner">
                            <div class="text-center w-1/2 border-r border-zinc-200 dark:border-zinc-600">
                                <div class="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Mensual</div>
                                <div class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">$160<span class="text-sm font-bold text-zinc-400 ml-1">MXN</span></div>
                            </div>
                            <div class="text-center w-1/2">
                                <div class="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1">Anual</div>
                                <div class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">$1,800<span class="text-sm font-bold text-zinc-400 ml-1">MXN</span></div>
                            </div>
                        </div>

                        <!-- Features -->
                        <ul class="space-y-3">
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-blue shrink-0 mt-0.5" width="16"></i>
                                <span><strong>3 usuarios</strong> para coachees simultáneos</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-blue shrink-0 mt-0.5" width="16"></i>
                                <span>Agenda para coachees</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-blue shrink-0 mt-0.5" width="16"></i>
                                <span>Contratos básicos</span>
                            </li>
                        </ul>
                     </div>
                     
                     <div class="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-6">
                        <strong>NOTA:</strong> Este plan es básico para aquellos coaches que no estén interesados en pagar mucho por el portal y que tengan pocos clientes.
                     </div>

                     ${isBasicPlan ? `
                     <button class="w-full py-3 rounded-xl border-2 border-brand-blue text-brand-blue font-bold tracking-wide transition-all uppercase text-sm opacity-50 cursor-not-allowed" disabled>
                        ✓ Tu Plan Actual
                     </button>
                     ` : `
                     <div class="space-y-4">
                         <button onclick="checkoutStripe('PRICE_BASIC_MONTHLY')" class="group relative w-full py-4 rounded-2xl bg-white border-2 border-brand-blue text-brand-blue font-black tracking-widest transition-all uppercase text-sm hover:bg-brand-blue hover:text-white shadow-md flex items-center justify-center gap-2 overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">Pago Mensual <i data-lucide="arrow-right" width="16" class="transition-transform group-hover:translate-x-1"></i></span>
                         </button>
                         <button onclick="checkoutStripe('PRICE_BASIC_ANNUAL')" class="group relative w-full py-4 rounded-2xl bg-white border-2 border-brand-blue text-brand-blue font-black tracking-widest transition-all uppercase text-sm hover:bg-brand-blue hover:text-white shadow-md flex items-center justify-center gap-2 overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">Pago Anual <i data-lucide="arrow-right" width="16" class="transition-transform group-hover:translate-x-1"></i></span>
                         </button>
                     </div>
                     `}
                </div>
            </div>

            <!-- Plan Plus -->
            <div class="bg-gradient-to-b from-white to-lime-50/50 dark:from-zinc-900 dark:to-lime-900/10 border-2 border-brand-lime rounded-[2rem] overflow-hidden shadow-2xl shadow-lime-500/20 flex flex-col relative transform md:-translate-y-4 transition-all duration-300 hover:shadow-lime-500/30 hover:-translate-y-5">
                <div class="absolute top-0 right-0 bg-gradient-to-r from-lime-400 to-brand-lime text-black text-[10px] font-black px-4 py-1.5 rounded-bl-2xl shadow-md uppercase tracking-widest z-10">
                    <span class="flex items-center gap-1"><i data-lucide="star" width="12" class="fill-black"></i> Recomendado</span>
                </div>
                <div class="bg-gradient-to-r from-brand-lime to-lime-400 py-5 text-center relative overflow-hidden">
                    <h3 class="text-black font-black text-xl uppercase tracking-widest">Plan Plus</h3>
                </div>
                
                <div class="p-8 flex-1 flex flex-col">
                     <div class="space-y-6 mb-8 flex-1">
                        <!-- Pricing Row -->
                        <div class="flex justify-between items-center bg-white dark:bg-zinc-800/80 rounded-2xl p-4 border border-lime-100 dark:border-lime-900/30 shadow-sm">
                            <div class="text-center w-1/2 border-r border-zinc-100 dark:border-zinc-700">
                                <div class="text-[10px] font-black text-lime-600 dark:text-lime-500 uppercase tracking-widest mb-1">Mensual</div>
                                <div class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">$500<span class="text-sm font-bold text-zinc-400 ml-1">MXN</span></div>
                            </div>
                            <div class="text-center w-1/2">
                                <div class="text-[10px] font-black text-lime-600 dark:text-lime-500 uppercase tracking-widest mb-1">Anual</div>
                                <div class="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">$5,640<span class="text-sm font-bold text-zinc-400 ml-1">MXN</span></div>
                            </div>
                        </div>

                         <!-- Features -->
                        <ul class="space-y-3">
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span><strong>10 usuarios</strong> para coachees simultáneos</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Agenda para coachees</span>
                            </li>
                            <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Planificador de actividades</span>
                            </li>
                             <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Formularios de evaluación</span>
                            </li>
                             <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Contratos Personalizados</span>
                            </li>
                             <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Academia Educativa</span>
                            </li>
                             <li class="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <i data-lucide="check-circle-2" class="text-brand-lime shrink-0 mt-0.5" width="16"></i>
                                <span>Difusión del perfil para captación</span>
                            </li>
                        </ul>
                        
                        <!-- Extra Tier Info -->
                        <div class="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mt-4 border border-zinc-100 dark:border-zinc-700">
                            <div class="flex items-center gap-2 mb-2 font-bold text-sm text-zinc-900 dark:text-white">
                                <i data-lucide="plus-circle" class="text-brand-lime" width="16"></i>
                                <span>Upgrade: +20 Coachees Activos</span>
                            </div>
                            <div class="flex justify-between text-xs text-zinc-500">
                                <span>$900 MXN / Mes</span>
                                <span>$10,080 MXN / Año</span>
                            </div>
                        </div>

                        ${isPlusPlan && !isUpgradeActive ? `
                        <div class="mt-4 space-y-3">
                            <button onclick="checkoutStripe('PRICE_PLUS_UPGRADE_MONTHLY')" class="w-full py-3 rounded-xl bg-white border-2 border-brand-lime text-brand-lime font-black uppercase text-xs tracking-widest hover:bg-brand-lime hover:text-black transition-all shadow-md">
                                Comprar Upgrade Mensual
                            </button>
                            <button onclick="checkoutStripe('PRICE_PLUS_UPGRADE_ANNUAL')" class="w-full py-3 rounded-xl bg-brand-lime text-black font-black uppercase text-xs tracking-widest hover:brightness-95 transition-all shadow-md">
                                Comprar Upgrade Anual
                            </button>
                        </div>
                        ` : isPlusPlan && isUpgradeActive ? `
                        <div class="mt-4">
                            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-xs text-green-700 dark:text-green-300 font-bold text-center">
                                Upgrade +20 activo
                            </div>
                        </div>
                        ` : ''}
                     </div>
                     
                     <div class="bg-lime-50 dark:bg-lime-900/10 p-4 rounded-xl text-xs text-lime-800 dark:text-lime-300 leading-relaxed mb-6">
                        <strong>GRATIS 1 AÑO</strong> al certificarte con nosotros. Ingresa tu código de certificado abajo para aplicar el descuento del 100% en la anualidad.
                     </div>
                     
                     <!-- Certificate Validation -->
                     <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 mb-6">
                        <label class="block text-xs font-bold text-zinc-500 uppercase mb-2">Código de Certificado</label>
                        <div class="flex gap-2">
                            <input type="text" id="cert-code-input" ${isPlusPlan ? 'disabled readonly' : ''} placeholder="${isPlusPlan ? '¡Ya eres Plan Plus!' : 'Ej: CERT-2024-XYZ'}" class="flex-1 bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-lime/50 uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                            <button onclick="
                                const input = document.getElementById('cert-code-input');
                                const btn = this;
                                if (!input.value.trim() || input.disabled) return;
                                const originalText = btn.innerHTML;
                                btn.disabled = true;
                                btn.innerHTML = '<i data-lucide=\\'loader\\' class=\\'animate-spin\\'></i>';
                                actions.validateCoachCode(input.value).then(success => {
                                    if(success) {
                                        btn.innerHTML = '<i data-lucide=\\'check\\'></i>';
                                        btn.classList.remove('bg-zinc-800');
                                        btn.classList.add('bg-green-500');
                                        input.disabled = true;
                                    } else {
                                        btn.disabled = false;
                                        btn.innerHTML = originalText;
                                    }
                                });
                            " ${isPlusPlan ? 'disabled' : ''} class="bg-zinc-800 text-white px-4 rounded-lg font-bold hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]">
                                Validar
                            </button>
                        </div>
                     </div>

                     ${isPlusPlan ? `
                     <button class="w-full py-3.5 rounded-xl bg-brand-lime text-black font-bold uppercase text-sm tracking-wide opacity-50 cursor-not-allowed" disabled>
                        ✓ Tu Plan Actual
                     </button>
                     ` : `
                     <div class="space-y-4">
                         <button onclick="checkoutStripe('PRICE_PLUS_MONTHLY')" class="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-brand-lime to-lime-400 text-black font-black uppercase text-sm tracking-widest shadow-xl shadow-lime-500/30 hover:shadow-lime-500/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">Pago Mensual <i data-lucide="zap" width="16" class="fill-black transition-transform group-hover:scale-110"></i></span>
                         </button>
                         <button onclick="checkoutStripe('PRICE_PLUS_ANNUAL')" class="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-brand-lime to-lime-400 text-black font-black uppercase text-sm tracking-widest shadow-xl shadow-lime-500/30 hover:shadow-lime-500/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">Pago Anual <i data-lucide="zap" width="16" class="fill-black transition-transform group-hover:scale-110"></i></span>
                         </button>
                     </div>
                     `}
                </div>
            </div>

        </div>
        
        <p class="text-center text-xs text-zinc-400 max-w-2xl mx-auto mt-8">
            * Los precios no incluyen IVA. La suscripción se renueva automáticamente salvo cancelación 24h antes del periodo.
            Al finalizar el año gratuito del Plan Plus, podrás elegir mantenerte, cambiar al básico o cancelar.
        </p>

    </div>
    `;
};
