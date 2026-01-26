import { API_URL } from '../utils/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('registerButton');
    const btnText = document.getElementById('buttonText');
    const spinner = document.getElementById('loadingSpinner');
    const successBox = document.getElementById('successMessage');
    const errorBox = document.getElementById('errorMessage');
    const roleButtons = document.querySelectorAll('.role-btn');
    const providerFields = document.getElementById('providerFields');
    const clientFields = document.getElementById('clientFields');
    let selectedRole = 'client';

    const toastRoot = document.getElementById('globalToast');

    const toggleBtn = document.getElementById('togglePassword');
    const pwdInput = document.getElementById('password');
    const pwdIcon = document.getElementById('passwordIcon');
    if (toggleBtn && pwdInput && pwdIcon) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = pwdInput.type === 'password';
            pwdInput.type = isHidden ? 'text' : 'password';
            pwdIcon.textContent = isHidden ? 'visibility' : 'visibility_off';
            toggleBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        });
    }

    function showToast(type, title, message) {
        if (!toastRoot) return;
        const isSuccess = type === 'success';
        const color = isSuccess ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white';
        toastRoot.innerHTML = `
            <div class="pointer-events-auto max-w-sm w-full ${color} shadow-xl rounded-2xl px-4 py-3 flex items-center gap-3">
                <span class="material-symbols-outlined text-xl">${isSuccess ? 'check_circle' : 'error'}</span>
                <div class="flex-1">
                    <p class="text-sm font-semibold">${title}</p>
                    ${message ? `<p class="text-xs opacity-90">${message}</p>` : ''}
                </div>
            </div>
        `;
        toastRoot.style.opacity = '1';
        toastRoot.style.transform = 'translateY(0)';
        setTimeout(() => {
            toastRoot.style.opacity = '0';
            toastRoot.style.transform = 'translateY(16px)';
        }, 1800);
    }

    // Seletor de tipo de usuário
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            roleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRole = btn.dataset.role;

            // Mostrar/esconder campos específicos
            if (selectedRole === 'provider') {
                providerFields.style.display = 'block';
                clientFields.style.display = 'none';
            } else {
                providerFields.style.display = 'none';
                clientFields.style.display = 'block';
            }
        });
    });

    function showLoading(on) {
        if (!btn || !btnText || !spinner) return;
        spinner.classList.toggle('hidden', !on);
        btn.disabled = on;
        btn.classList.toggle('opacity-60', on);
        btn.classList.toggle('cursor-not-allowed', on);
    }

    function showError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
        errorBox.classList.add('transition-opacity');
        errorBox.classList.add('duration-300');
        errorBox.style.opacity = '0';
        requestAnimationFrame(() => { errorBox.style.opacity = '1'; });
        showToast('error', 'Erro no cadastro', msg);
    }

    function showSuccess(msg) {
        if (!successBox) return;
        successBox.textContent = msg;
        successBox.classList.remove('hidden');
        successBox.classList.add('transition-opacity');
        successBox.classList.add('duration-300');
        successBox.style.opacity = '0';
        requestAnimationFrame(() => { successBox.style.opacity = '1'; });
        btn.classList.add('ring-2', 'ring-green-400', 'animate-pulse');
        showToast('success', 'Cadastro concluído', msg);
    }

    // Submissão do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox?.classList.add('hidden');
        successBox?.classList.add('hidden');
        showLoading(true);

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            password: document.getElementById('password').value,
            role: selectedRole
        };

        // Adicionar campos específicos
        if (selectedRole === 'provider') {
            formData.profile = {
                specialty: document.getElementById('specialty').value,
                licenseNumber: document.getElementById('license').value
            };
        } else {
            formData.healthProfile = {
                bloodType: document.getElementById('bloodType').value
            };
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            showLoading(false);

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showSuccess('Cadastro realizado com sucesso!');
                setTimeout(() => {
                    const url = selectedRole === 'provider' ? '/src/pages/dashboardprovider.html' : '/src/pages/dashboard.html';
                    window.location.href = url;
                }, 900);
            } else {
                showError(data.message || 'Erro no cadastro');
            }
        } catch (error) {
            showLoading(false);
            showError('Erro de conexão');
        }
    });
});
