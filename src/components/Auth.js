
import { state, updateUI } from '../store.js';
import { supabase } from '../services/supabase.client.js?v=0.1.2';
import { DBService } from '../services/db.js'; // We will use this to create profile
import { renderLogo, showToast } from './Utils.js';

const normalizeBaseUrl = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
        return trimmed;
    }
    return `https://${trimmed}`;
};

const getAppBaseUrl = () => {
    const meta = document.querySelector('meta[name="app-base-url"]');
    let stored = '';
    try {
        stored = localStorage.getItem('valori_app_base_url') || '';
    } catch (e) {
        stored = '';
    }
    const configured = normalizeBaseUrl(window.APP_BASE_URL || meta?.content || stored || '');
    const fallback = `${window.location.origin}${window.location.pathname}`;
    const candidate = configured || fallback;

    try {
        const url = new URL(candidate, window.location.origin);
        url.search = '';
        url.hash = '';
        return url.toString();
    } catch (e) {
        return fallback;
    }
};

const buildAppUrl = (params = {}) => {
    const url = new URL(getAppBaseUrl(), window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[char]));

const isCoachRoleValue = (value) => {
    const normalized = String(value || '').toLowerCase().trim();
    return normalized === 'coach' || normalized.startsWith('coach ') || normalized.startsWith('coach_') || normalized.startsWith('coach-');
};

const normalizeCoachPlanValue = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('basic')) return 'Plan Basic';
    if (normalized.includes('plus') || normalized.includes('premium')) return 'Plan Plus';
    if (normalized.includes('new')) return 'Plan New';
    return value;
};

const resolveCoachPlanType = (profileData, user) => {
    const candidate = profileData?.plan_type || profileData?.package_type || user?.plan_type || user?.package_type || '';
    return normalizeCoachPlanValue(candidate);
};

export const Auth = {
    renderLogin: () => `
        <div class="auth-login min-h-screen bg-gray-50 dark:bg-brand-black flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="auth-card max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-lime to-brand-blue"></div>

                <div class="text-center mb-6">
                    ${renderLogo('h-12 mx-auto mb-4')}
                    <h2 class="text-2xl font-black text-zinc-900 dark:text-white">Iniciar Sesión</h2>
                    <p class="text-sm text-zinc-500 mt-2">Accede a tu cuenta de Valori+</p>
                </div>

                <form onsubmit="event.preventDefault(); window.AuthActions.attemptLogin(this)">
                    <div class="space-y-4 mb-6">
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Correo Electrónico</label>
                            <input type="email" name="email" required class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="tu@correo.com">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Contraseña</label>
                            <input type="password" name="password" required class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="••••••••">
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] mb-4">
                        Ingresar <i data-lucide="log-in" class="inline ml-2" width="18"></i>
                    </button>

                    <div class="mt-2 mb-6 text-center">
                        <button type="button" onclick="window.AuthActions.forgotPassword()" class="text-xs font-semibold text-zinc-400 hover:text-brand-blue transition-colors hover:underline">
                            ¿Olvidaste tu Contraseña?
                        </button>
                    </div>

                    <div class="text-center text-sm">
                        <span class="text-zinc-500">¿No tienes cuenta?</span>
                        <button type="button" onclick="window.state.view = 'register'; window.updateUI();" class="text-brand-blue font-bold hover:underline ml-1">Regístrate gratis</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!--Forgot Password Modal-->
        <dialog id="forgot-password-modal" class="modal bg-transparent p-0 w-full max-w-sm backdrop:bg-black/60">
             <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 w-full animate-in fade-in zoom-in duration-200">
                <!-- Content injected dynamically -->
                <div id="recovery-form-view">
                    <div class="text-center mb-6">
                        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-blue">
                             <i data-lucide="key-round" width="24"></i>
                        </div>
                        <h3 class="text-xl font-bold dark:text-white">Recuperar Cuenta</h3>
                        <p class="text-xs text-zinc-500 mt-2">Ingresa tu correo y te enviaremos las instrucciones.</p>
                    </div>
                    <form method="dialog" onsubmit="event.preventDefault(); window.AuthActions.submitForgotPassword(this)">
                         <div class="mb-6">
                             <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Correo Registrado</label>
                             <input type="email" name="email" required class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors dark:text-white" placeholder="ejemplo@correo.com">
                         </div>
                         <div class="flex gap-3">
                             <button type="button" onclick="document.getElementById('forgot-password-modal').close()" class="flex-1 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                             <button type="submit" class="flex-1 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
                                 Enviar
                             </button>
                         </div>
                    </form>
                </div>
             </div>
        </dialog>
    `,

    renderRegister: () => {
        const termsAccepted = !!state.registerAcceptedTerms;
        const docsRead = !!(state.registerTermsRead && state.registerTermsRead.terms);
        const submitDisabled = !termsAccepted;
        const submitBaseClass = state.registerRole === 'coach' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-brand-blue hover:bg-blue-600';
        const submitClass = submitDisabled ? 'bg-red-500 hover:bg-red-600 cursor-not-allowed opacity-90' : submitBaseClass;
        const registerForm = state.registerForm || {};
        const registerName = escapeHtml(registerForm.name || '');
        const registerEmail = escapeHtml(registerForm.email || '');
        const registerPassword = escapeHtml(registerForm.password || '');
        const registerPhone = escapeHtml(registerForm.phone || '');
        const registerWorkArea = escapeHtml(registerForm.work_area || '');
        const registerCity = escapeHtml(registerForm.city || '');

        return `
        <div class="min-h-screen bg-gray-50 dark:bg-brand-black flex flex-col items-center justify-center p-4 animate-fade-in">
            <div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>

                <div class="text-center mb-6">
                    ${renderLogo('h-12 mx-auto mb-4')}
                    <h2 class="text-2xl font-black text-zinc-900 dark:text-white">Crear Cuenta</h2>
                    <p class="text-sm text-zinc-500 mt-2">Únete a la comunidad de Valori+</p>
                </div>

                <form onsubmit="event.preventDefault(); window.AuthActions.attemptRegister(this)">
                    <div class="space-y-4 mb-6">
                        <!-- Role Selection Toggle -->
                        <div class="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-3">
                            <button type="button" onclick="window.state.registerRole = 'client'; window.updateUI();" class="flex-1 py-2 rounded-lg text-sm font-bold transition-all ${state.registerRole !== 'coach' ? 'bg-white dark:bg-zinc-700 shadow-sm text-brand-blue' : 'text-zinc-400 hover:text-zinc-600'}">
                                Soy Cliente
                            </button>
                            <button type="button" onclick="window.state.registerRole = 'coach'; window.updateUI();" class="flex-1 py-2 rounded-lg text-sm font-bold transition-all ${state.registerRole === 'coach' ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-500' : 'text-zinc-400 hover:text-zinc-600'}">
                                Soy Coach
                            </button>
                        </div>

                        <!-- Plan Type Toggle (only for clients) -->
                        ${state.registerRole !== 'coach' ? `
                        <div class="mb-2">
                            <p class="text-xs font-bold text-zinc-500 mb-2 uppercase">Tipo de Plan</p>
                            <div class="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                <button type="button" onclick="window.state.registerPlanType = 'personal'; window.updateUI();" class="flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${(state.registerPlanType || 'personal') !== 'negocio' ? 'bg-white dark:bg-zinc-700 shadow-sm text-brand-blue' : 'text-zinc-400 hover:text-zinc-600'}">
                                    <i data-lucide="user" width="14"></i> Personal
                                </button>
                                <button type="button" onclick="window.state.registerPlanType = 'negocio'; window.updateUI();" class="flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${state.registerPlanType === 'negocio' ? 'bg-white dark:bg-zinc-700 shadow-sm text-brand-blue' : 'text-zinc-400 hover:text-zinc-600'}">
                                    <i data-lucide="briefcase" width="14"></i> Negocio
                                </button>
                            </div>
                        </div>
                        ` : ''}

                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Nombre Completo</label>
                            <input type="text" name="name" required value="${registerName}" oninput="window.AuthActions.updateRegisterField('name', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="Juan Pérez">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Correo Electrónico</label>
                            <input type="email" name="email" required value="${registerEmail}" oninput="window.AuthActions.updateRegisterField('email', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="tu@correo.com">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Número de Teléfono</label>
                            <input type="tel" name="phone" required value="${registerPhone}" oninput="window.AuthActions.updateRegisterField('phone', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="55 1234 5678">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Giro de Trabajo</label>
                            <input type="text" name="work_area" required value="${registerWorkArea}" oninput="window.AuthActions.updateRegisterField('work_area', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="Ej. Finanzas, Tecnología">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Ciudad</label>
                            <input type="text" name="city" required value="${registerCity}" oninput="window.AuthActions.updateRegisterField('city', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="Ej. Tijuana">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Contraseña</label>
                            <input type="password" name="password" required minlength="6" value="${registerPassword}" oninput="window.AuthActions.updateRegisterField('password', this.value)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white" placeholder="Mínimo 6 caracteres">
                        </div>

                        ${state.registerRole === 'coach' ? `
                        <div class="bg-lime-50 dark:bg-lime-900/10 border border-dashed border-brand-lime rounded-xl p-4">
                            <label class="block text-xs font-bold text-brand-lime mb-1 uppercase">🎓 Código de Certificado <span class="text-zinc-400 font-normal normal-case">(Opcional — obtén Plan Plus gratis 1 año)</span></label>
                            <input type="text" name="cert_code" value="" autocomplete="off" class="w-full bg-white dark:bg-zinc-800 border border-lime-200 dark:border-lime-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-lime transition-colors dark:text-white text-sm uppercase" placeholder="Ej: CERT-2026-XXXX">
                        </div>
                        ` : ''}
                    </div>

                    <div class="mb-4">
                        <div class="flex items-start gap-3 text-xs text-zinc-500">
                            <input type="checkbox" ${termsAccepted ? 'checked' : ''} aria-label="Acepto los términos y condiciones y la política de privacidad." onchange="window.AuthActions.toggleRegisterTerms(this.checked, this.form)" class="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-blue focus:ring-brand-blue">
                            <button type="button" onclick="window.AuthActions.openTermsModal()" class="text-brand-blue hover:text-blue-600 underline underline-offset-2 text-left">
                                Acepto los términos y condiciones y la política de privacidad.
                            </button>
                        </div>
                        ${docsRead ? '' : '<p class="mt-2 text-[11px] font-semibold text-red-500">Debes leer el documento completo para poder aceptar.</p>'}
                    </div>

                    <button type="submit" ${submitDisabled ? 'disabled' : ''} class="w-full ${submitClass} text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all ${submitDisabled ? '' : 'hover:scale-[1.02]'} mb-4">
                        Crear Cuenta <i data-lucide="user-plus" class="inline ml-2" width="18"></i>
                    </button>

                    <div class="text-center text-sm">
                        <span class="text-zinc-500">¿Ya tienes cuenta?</span>
                        <button type="button" onclick="window.state.view = 'login'; window.updateUI();" class="text-brand-blue font-bold hover:underline ml-1">Inicia Sesión</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    }
};

export const AuthActions = {
    updateRegisterField(field, value) {
        if (!field) return;
        state.registerForm = {
            ...(state.registerForm || {}),
            [field]: value ?? ''
        };
    },

    captureRegisterForm(form) {
        if (!form) return;
        state.registerForm = {
            ...(state.registerForm || {}),
            name: form.name?.value ?? '',
            email: form.email?.value ?? '',
            password: form.password?.value ?? '',
            phone: form.phone?.value ?? '',
            work_area: form.work_area?.value ?? '',
            city: form.city?.value ?? ''
        };
    },

    hasReadAllTerms() {
        const read = state.registerTermsRead || {};
        return !!read.terms;
    },

    toggleRegisterTerms(checked, form) {
        if (checked && !AuthActions.hasReadAllTerms()) {
            showToast('Debes leer completo el documento antes de aceptar.', 'warning');
            state.registerAcceptedTerms = false;
            AuthActions.captureRegisterForm(form);
            updateUI();
            return;
        }
        if (checked) {
            state.registerTermsAcceptedAt = new Date().toISOString();
        }
        state.registerAcceptedTerms = checked;
        AuthActions.captureRegisterForm(form);
        updateUI();
    },

    openTermsModal(initialTab = 'terms') {
        const existing = document.getElementById('terms-modal');
        if (existing) existing.remove();

        const termsUrl = 'assets/contracts/terminos_valori.txt';
        const modal = document.createElement('dialog');
        modal.id = 'terms-modal';
        modal.className = 'modal bg-transparent p-0 w-full max-w-4xl backdrop:bg-black/70';
        modal.innerHTML = `
<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 w-full h-[85vh] flex flex-col">
    <div class="h-1 w-full bg-gradient-to-r from-brand-blue via-purple-500 to-pink-500 rounded-full"></div>
    <div class="flex items-start justify-between gap-3 mt-3">
        <div>
            <h3 class="text-xl font-black dark:text-white" data-terms-title>Términos y condiciones</h3>
            <div class="mt-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs font-bold uppercase tracking-wide" data-terms-banner>
                Lectura obligatoria: para crear tu cuenta debes leer todo el documento.
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span data-terms-status class="text-xs font-bold px-3 py-1 rounded-full bg-zinc-100 text-zinc-500">Pendiente</span>
            <button type="button" data-terms-close class="text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-700 px-3 py-2 rounded-lg">Cerrar</button>
        </div>
    </div>
    <div class="mt-3 flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-inner">
        <div data-terms-body class="w-full h-full overflow-y-auto p-4 text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">Cargando...</div>
    </div>
    <div class="mt-3 flex items-center justify-between gap-3">
        <div class="text-[11px] text-zinc-500" data-terms-meta></div>
        <button type="button" data-terms-accept class="px-4 py-2 rounded-lg text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
            He leído y acepto
        </button>
    </div>
</div>`;
        document.body.appendChild(modal);

        const body = modal.querySelector('[data-terms-body]');
        const status = modal.querySelector('[data-terms-status]');
        const closeBtn = modal.querySelector('[data-terms-close]');
        const acceptBtn = modal.querySelector('[data-terms-accept]');
        const meta = modal.querySelector('[data-terms-meta]');

        const cleanText = (text) => text
            .replace(/\r/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();

        const formatDateLong = (value) => {
            try {
                return new Date(value).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                return '';
            }
        };

        const applyTermsContext = (text) => {
            const registerForm = state.registerForm || {};
            const name = (registerForm.name || state.user?.full_name || 'El usuario').trim() || 'El usuario';
            const address = (registerForm.address || '').trim();
            const acceptanceDate = state.registerTermsAcceptedAt || new Date().toISOString();
            const dateLong = formatDateLong(acceptanceDate) || formatDateLong(new Date().toISOString());
            let result = text;
            result = result.replace(/NOMBRE COMPLETO/g, name);
            result = result.replace(/DIRECCIÓN/g, address || 'DOMICILIO NO PROPORCIONADO');
            result = result.replace(/DIRECCION/g, address || 'DOMICILIO NO PROPORCIONADO');
            result = result.replace(/a\s+_+/gi, `a ${dateLong}`);
            result = result.replace(/Nombre completo, firma coachee y fecha de aceptación/gi, '');
            result = result.replace(/_+/g, '');
            return result;
        };

        const markReadIfNeeded = () => {
            if (!body) return;
            const read = state.registerTermsRead || {};
            const atBottom = Math.ceil(body.scrollTop + body.clientHeight) >= body.scrollHeight - 2;
            const noScroll = body.scrollHeight <= body.clientHeight + 2;
            if ((atBottom || noScroll) && !read.terms) {
                state.registerTermsRead = {
                    ...(state.registerTermsRead || {}),
                    terms: true
                };
                if (status) {
                    status.textContent = 'Leído';
                    status.className = 'text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700';
                }
                if (acceptBtn) acceptBtn.disabled = false;
            }
        };

        const loadText = async (url) => {
            if (body) body.textContent = 'Cargando...';
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) throw new Error('No se pudo cargar el documento.');
                const text = await response.text();
                if (body) {
                    const cleaned = cleanText(text);
                    body.textContent = applyTermsContext(cleaned);
                    body.scrollTop = 0;
                    requestAnimationFrame(markReadIfNeeded);
                }
            } catch (err) {
                if (body) body.textContent = 'No se pudo cargar el documento.';
            }
        };

        closeBtn.addEventListener('click', () => modal.close());
        modal.addEventListener('close', () => modal.remove());
        if (body) {
            body.addEventListener('scroll', () => {
                markReadIfNeeded();
            });
        }

        if (status && (state.registerTermsRead && state.registerTermsRead.terms)) {
            status.textContent = 'Leído';
            status.className = 'text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700';
        }
        if (acceptBtn) {
            acceptBtn.disabled = !(state.registerTermsRead && state.registerTermsRead.terms);
            acceptBtn.addEventListener('click', () => {
                if (!AuthActions.hasReadAllTerms()) {
                    showToast('Debes leer completo el documento antes de aceptar.', 'warning');
                    return;
                }
                state.registerAcceptedTerms = true;
                state.registerTermsAcceptedAt = new Date().toISOString();
                updateUI();
                modal.close();
            });
        }
        if (meta) {
            const registerForm = state.registerForm || {};
            const name = (registerForm.name || state.user?.full_name || 'El usuario').trim() || 'El usuario';
            const today = formatDateLong(new Date().toISOString());
            meta.textContent = `Al aceptar se registrará: ${name} • ${today}.`;
        }
        loadText(termsUrl);
        modal.showModal();
    },

    async attemptLogin(form) {
        const email = form.email.value;
        const password = form.password.value;
        // UI Loading State (Optional: Add more robust loading)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            console.log("Login Successful:", data);

            // Set User State
            state.user = {
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata.full_name || data.user.email.split('@')[0],
                role: data.user.user_metadata.role || 'client',
                created_at: data.user.created_at
            };
            console.log("Login Successful. Detected Role:", state.user.role);
            showToast("¡Bienvenido!", "success");

            // Load Data BEFORE Redirecting
            try {
                if (window.actions) {
                    await window.actions.fetchBudget();
                    await window.actions.fetchSavingsGoals();
                }
            } catch (fetchErr) {
                console.warn("Auth: Error pre-fetching data", fetchErr);
            }

            // Fetch profile data to check show_welcome column and preferred_currency
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, show_welcome, preferred_currency, created_at, plan_type, package_type, coach_plans_dismissed, subscription_expires_at, subscription_status, coach_upgrade_active, coach_upgrade_expires_at, coach_coachee_override_active, coach_coachee_override_limit')
                .eq('id', state.user.id)
                .single();

            console.log('Profile data fetched:', profileData);
            console.log('Profile error:', profileError);

            if (profileError) {
                console.warn("Could not fetch profile data:", profileError);
            } else {
                if (profileData.role) {
                    state.user.role = profileData.role;
                }
                if (profileData.plan_type) {
                    state.user.plan_type = profileData.plan_type;
                }
                // package_type (coach plan: 'Plan Basic', 'Plan Plus', etc.)
                if (profileData.package_type) {
                    state.user.package_type = profileData.package_type;
                }
                // coach_plans_dismissed: bandera persistente para coaches Plan Basic
                state.user.coach_plans_dismissed = profileData.coach_plans_dismissed === true;
                if (profileData.subscription_expires_at) {
                    state.user.subscription_expires_at = profileData.subscription_expires_at;
                }
                if (profileData.coach_upgrade_expires_at) {
                    state.user.coach_upgrade_expires_at = profileData.coach_upgrade_expires_at;
                }
                state.user.coach_upgrade_active = profileData.coach_upgrade_active === true;
                if (profileData.coach_coachee_override_active !== undefined) {
                    state.user.coach_coachee_override_active = profileData.coach_coachee_override_active === true;
                }
                if (profileData.coach_coachee_override_limit !== undefined) {
                    state.user.coach_coachee_override_limit = profileData.coach_coachee_override_limit;
                }
                // Load user's preferred currency
                console.log('Setting budgetCurrency to:', profileData.preferred_currency || 'MXN');
                state.budgetCurrency = profileData.preferred_currency || 'MXN';
                // Also store in user object for easy access
                state.user.preferred_currency = profileData.preferred_currency || 'MXN';
                state.user.created_at = profileData.created_at || state.user.created_at;
                console.log('state.budgetCurrency is now:', state.budgetCurrency);
                console.log('state.user.preferred_currency is now:', state.user.preferred_currency);
            }

            if (isCoachRoleValue(state.user.role)) {
                const coachPlanType = resolveCoachPlanType(profileData, state.user);
                if (coachPlanType) {
                    state.user.plan_type = coachPlanType;
                }
            }

            if (!state.user.plan_type && state.user.role !== 'coach') {
                state.user.plan_type = 'personal';
            }
            if (state.user.plan_type) {
                state.clientCategory = state.user.plan_type === 'negocio' ? 'business' : 'personal';
            }

            if (state.user.subscription_expires_at) {
                const expiresAt = new Date(state.user.subscription_expires_at);
                if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
                    state.user._expiredPlan = state.user.plan_type;
                    state.user._subscriptionExpired = true;
                    state.user.plan_type = 'Plan Free';
                    state.user.subscription_expires_at = null;
                    state.coachTab = 'plans';
                    fetch(`http://localhost:3000/api/stripe/expire-subscription?userId=${encodeURIComponent(state.user.id)}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.ok) {
                                console.log('[Subscription] Plan expirado, revertido a Plan Free en BD');
                            } else {
                                console.warn('[Subscription] Error al expirar en BD:', data.message);
                            }
                        })
                        .catch(e => console.warn('[Subscription] Error de red al expirar:', e));
                }
            }

            if (state.user.coach_upgrade_expires_at) {
                const upgradeExpiresAt = new Date(state.user.coach_upgrade_expires_at);
                if (!Number.isNaN(upgradeExpiresAt.getTime()) && upgradeExpiresAt < new Date()) {
                    state.user.coach_upgrade_active = false;
                    state.user.coach_upgrade_expires_at = null;
                    fetch(`http://localhost:3000/api/stripe/expire-upgrade?userId=${encodeURIComponent(state.user.id)}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.ok) {
                                console.log('[Upgrade] Expirado, desactivado en BD');
                            } else {
                                console.warn('[Upgrade] Error al expirar en BD:', data.message);
                            }
                        })
                        .catch(e => console.warn('[Upgrade] Error de red al expirar:', e));
                }
            }

            if ((state.user.plan_type || '').toLowerCase().trim() === 'plan free') {
                state.coachTab = 'plans';
            }

            // Redirect based on role and show_welcome preference
            if (isCoachRoleValue(state.user?.role)) {
                // Check if coach should skip welcome and go directly to budget
                if (profileData && profileData.show_welcome === false) {
                    console.log("Coach has show_welcome=false, redirecting to Salud Financiera");
                    state.view = 'quiz_intro';
                } else {
                    console.log("Navigating to Coach Module");
                    // --- Redirect to 'plans' tab on first login if not dismissed or if Plan New ---
                    if (state.user.coach_plans_dismissed === false || state.user.plan_type === 'Plan New') {
                        state.coachTab = 'plans';
                    }
                    state.view = 'coach_module';
                }

                // Aplicar estrategia de actualización (pantalla de carga) para evitar parpadeos visuales
                const loader = document.getElementById('loading-screen');
                if (loader) {
                    loader.classList.remove('is-hiding', 'is-hidden');
                    loader.style.display = 'flex';
                    loader.style.opacity = '1';
                    loader.dataset.hiding = 'false';
                    // Forzar un reflow para que el cambio de display se aplique
                    void loader.offsetHeight;

                    // Dar tiempo al navegador para que dibuje la pantalla de carga (paint frame)
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            // Añadimos un pequeño timeout extra de seguridad
                            setTimeout(() => {
                                // Actualizar la UI por debajo
                                updateUI();

                                // Ocultar suavemente después de que el DOM termine de renderizar
                                setTimeout(() => {
                                    loader.dataset.hiding = 'true';
                                    loader.classList.add('is-hiding');
                                    setTimeout(() => {
                                        loader.classList.add('is-hidden');
                                        loader.style.display = 'none';
                                    }, 420);
                                }, 1200);
                            }, 50);
                        });
                    });
                } else {
                    updateUI();
                }
            } else {
                // FORCE REDIRECT TO CLIENT MODULE (VISION 360)
                console.log("Navigating to Client Module (Vision 360) - Forced Redirect");
                state.view = 'client_module';
                state.clientTab = 'vision360';

                // Ensure state persistence or update if necessary before UI update
                // This matches the user request to go directly to the 'Módulo Cliente' view (2nd image)
                updateUI();
            }

        } catch (error) {
            console.error("Login Error:", error);
            showToast(error.message, "error");
        }
    },

    async attemptRegister(form) {
        const email = form.email.value;
        const password = form.password.value;
        const name = form.name.value;
        const phone = form.phone?.value || '';
        const workArea = form.work_area?.value || '';
        const city = form.city?.value || '';
        const role = state.registerRole || 'client';
        const certCode = form.cert_code?.value?.trim().toUpperCase() || '';
        // Plan New por defecto para coaches, a menos que verifiquemos código después
        const planType = (role !== 'coach') ? (state.registerPlanType || 'personal') : 'Plan New';

        if (!state.registerAcceptedTerms) {
            showToast("Debes aceptar los términos y condiciones para continuar.", "warning");
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: 'https://appvalori.fastvalleyapps.com',
                    data: { full_name: name, role: role, plan_type: planType, phone: phone, work_area: workArea, city: city }
                }
            });

            if (error) throw error;

            // Create Profile
            if (data.user) {
                await DBService.createProfile(data.user, role, planType);
            }

            const requiresEmailConfirmation = !data.session;
            if (requiresEmailConfirmation) {
                showToast("Te enviamos un correo para confirmar tu cuenta.", "success");
                setTimeout(() => {
                    const modal = document.createElement('dialog');
                    modal.className = 'modal bg-transparent p-0 w-full max-w-md backdrop:bg-black/80';
                    modal.innerHTML = `
<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-8 w-full">
    <div class="text-center mb-4">
        <div class="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i data-lucide="mail" width="28" class="text-brand-blue"></i>
        </div>
        <h3 class="text-xl font-bold dark:text-white">Confirma tu correo</h3>
        <p class="text-sm text-zinc-500 mt-2">Te enviamos un correo de confirmación a <strong>${email}</strong>. Revisa tu bandeja de entrada y spam.</p>
    </div>
    <button onclick="this.closest('dialog').close()" class="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all">
        Entendido
    </button>
</div>`;
                    document.body.appendChild(modal);
                    if (window.lucide) window.lucide.createIcons();
                    modal.addEventListener('close', () => modal.remove());
                    modal.showModal();
                }, 50);
                return;
            }

            // Set State
            state.user = {
                id: data.user.id,
                email: data.user.email,
                full_name: name,
                role: role,
                plan_type: planType,
                created_at: data.user.created_at
            };

            if (planType) {
                state.clientCategory = planType === 'negocio' ? 'business' : 'personal';
            }

            showToast("Cuenta creada con éxito", "success");

            // Si el coach ingresó un código, validarlo ahora
            if (role === 'coach' && certCode && data.user) {
                try {
                    const { supabaseClient } = await import('../services/supabase.client.js?v=0.1.2');
                    const rpcClient = supabaseClient || supabase;
                    const { data: codeData } = await rpcClient.rpc('use_activation_code', {
                        code_to_use: certCode,
                        user_id: data.user.id
                    });
                    if (codeData?.success) {
                        state.user.plan_type = 'Plan Plus';
                        showToast('¡Código de certificado aplicado! Eres Plan Plus.', 'success');
                    } else if (codeData?.message) {
                        showToast(codeData.message, 'warning');
                    }
                } catch (codeErr) {
                    console.warn('Error al validar código de certificado en registro:', codeErr);
                }
            }

            if (role === 'coach') {
                // New coach registers as Plan New by default — start on plans tab
                const _newRawPkg = (planType || '').toLowerCase();
                if (_newRawPkg.includes('new') || _newRawPkg.includes('basic')) {
                    state.coachTab = 'plans';
                }
                state.view = 'coach_module';
            } else {
                state.view = 'client_module';
                state.clientTab = 'vision360';
            }
            updateUI();

        } catch (error) {
            console.error("Register Error:", error);
            showToast(error.message, "error");
        }
    },

    forgotPassword: () => {
        const modal = document.getElementById('forgot-password-modal');
        if (modal) modal.showModal();
    },

    submitForgotPassword: async (form) => {
        const email = form.email.value;
        try {
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: buildAppUrl({ reset: 'true' }),
            });
            showToast("Correo de recuperación enviado", "success");
            document.getElementById('forgot-password-modal').close();
        } catch (e) {
            showToast(e.message, "error");
        }
    },

    showResetPasswordModal() {
        // Prevent duplicate modals
        if (document.getElementById('reset-password-modal')) return;

        const modal = document.createElement('dialog');
        modal.id = 'reset-password-modal';
        modal.className = 'modal bg-transparent p-0 w-full max-w-sm backdrop:bg-white dark:backdrop:bg-zinc-950';
        modal.innerHTML = `
<div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 w-full">
    <div class="text-center mb-6">
        <div class="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-blue">
            <i data-lucide="lock-keyhole" width="28"></i>
        </div>
        <h3 class="text-xl font-bold dark:text-white">Nueva Contraseña</h3>
        <p class="text-xs text-zinc-500 mt-2">Ingresa y confirma tu nueva contraseña.</p>
    </div>
    <form id="reset-password-form">
        <div class="space-y-4 mb-6">
            <div>
                <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Nueva Contraseña</label>
                <input type="password" id="reset-new-password" required minlength="6"
                    class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors dark:text-white"
                    placeholder="Mínimo 6 caracteres">
            </div>
            <div>
                <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">Confirmar Contraseña</label>
                <input type="password" id="reset-confirm-password" required minlength="6"
                    class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-blue transition-colors dark:text-white"
                    placeholder="Repite tu contraseña">
            </div>
        </div>
        <div id="reset-error" class="hidden text-xs text-red-500 font-semibold mb-4 text-center"></div>
        <button type="submit"
            class="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
            Guardar Contraseña
        </button>
    </form>
</div>`;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();

        const form = modal.querySelector('#reset-password-form');
        const errorEl = modal.querySelector('#reset-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = modal.querySelector('#reset-new-password').value;
            const confirmPassword = modal.querySelector('#reset-confirm-password').value;

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'Las contraseñas no coinciden.';
                errorEl.classList.remove('hidden');
                return;
            }

            errorEl.classList.add('hidden');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';

            try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                showToast('¡Contraseña actualizada con éxito!', 'success');
                modal.close();
                // Clean URL hash and sign out so user logs in fresh
                history.replaceState(null, '', window.location.pathname + window.location.search);
                await supabase.auth.signOut();
                state.user = null;
                state.view = 'login';
                updateUI();
            } catch (err) {
                errorEl.textContent = err.message || 'Error al actualizar la contraseña.';
                errorEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Contraseña';
            }
        });

        modal.addEventListener('close', () => modal.remove());
        modal.showModal();
    }
};

// Expose to window for inline Event Handlers in HTML strings
window.AuthActions = AuthActions;
window.state = state; // Hack for inline onclicks until full migration
window.updateUI = updateUI;

// ── Password Recovery Flow ──────────────────────────────────────────────────
// Strategy 1: Supabase fires PASSWORD_RECOVERY when it detects the recovery hash
supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
        // Reset to blank login view so the app dashboard is not visible behind the modal
        state.user = null;
        state.view = 'login';
        updateUI();
        AuthActions.showResetPasswordModal();
    }
});

// Strategy 2: Detect recovery token directly from URL hash at page load.
// Supabase sometimes fires SIGNED_IN instead of PASSWORD_RECOVERY, so we
// check the hash ourselves as a reliable fallback.
(function checkRecoveryHash() {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        const show = () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', show);
                return;
            }
            // Reset to blank login view, then show modal
            setTimeout(() => {
                state.user = null;
                state.view = 'login';
                updateUI();
                setTimeout(() => AuthActions.showResetPasswordModal(), 100);
            }, 300);
        };
        show();
    }
})();
