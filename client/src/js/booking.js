import { API_URL } from '../utils/config.js';

let selectedService = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlServiceId = new URLSearchParams(window.location.search).get('service');
    const serviceId = urlServiceId || localStorage.getItem('selectedService');
    const successBox = document.getElementById('successMessage');
    const errorBox = document.getElementById('errorMessage');
    const btn = document.getElementById('confirmButton');
    const btnText = document.getElementById('buttonText');
    const spinner = document.getElementById('loadingSpinner');
    const toastRoot = document.getElementById('globalToast');

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
        errorBox.classList.add('transition-opacity', 'duration-300');
        errorBox.style.opacity = '0';
        requestAnimationFrame(() => { errorBox.style.opacity = '1'; });
        showToast('error', 'Falha no agendamento', msg);
    }

    function showSuccess(msg) {
        if (!successBox || !btn) return;
        successBox.textContent = msg;
        successBox.classList.remove('hidden');
        successBox.classList.add('transition-opacity', 'duration-300');
        successBox.style.opacity = '0';
        requestAnimationFrame(() => { successBox.style.opacity = '1'; });
        btn.classList.add('ring-2', 'ring-green-400', 'animate-pulse');
        showToast('success', 'Agendamento confirmado', msg);
    }

    if (!serviceId) {
        showError('Nenhum serviço selecionado');
        setTimeout(() => { window.location.href = '/src/pages/search.html'; }, 900);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').min = today;

    await loadServiceDetails(serviceId);
    setupEventListeners({ showLoading, showError, showSuccess });
});

async function loadServiceDetails(id) {
    try {
        const res = await fetch(`${API_URL}/api/services/${id}`);
        if (!res.ok) throw new Error('Serviço não encontrado');
        selectedService = await res.json();
        const container = document.getElementById('serviceDetails');
        container.innerHTML = `
            <h2>${selectedService.title}</h2>
            <p>${selectedService.description}</p>
            <div class="details-grid">
                <div>
                    <strong>Prestador:</strong> ${selectedService.providerId?.name || 'N/A'}
                </div>
                <div>
                    <strong>Duração:</strong> ${selectedService.duration} min
                </div>
                <div>
                    <strong>Preço:</strong> R$ ${Number(selectedService.price||0).toFixed(2)}
                </div>
            </div>
        `;
        const total = document.getElementById('totalPrice');
        if (total) total.textContent = `R$ ${Number(selectedService.price||0).toFixed(2)}`;
    } catch (error) {
        const errorBox = document.getElementById('errorMessage');
        if (errorBox) {
            errorBox.textContent = 'Erro ao carregar serviço';
            errorBox.classList.remove('hidden');
        }
        setTimeout(() => { window.location.href = '/src/pages/search.html'; }, 900);
    }
}

function setupEventListeners(helpers) {
    const { showLoading, showError, showSuccess } = helpers;
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');

    dateInput.addEventListener('change', async (e) => {
        if (!e.target.value) return;
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option>Carregando...</option>';
        try {
            const res = await fetch(`${API_URL}/api/appointments/availability?providerId=${selectedService.providerId._id}&date=${e.target.value}`);
            const slots = await res.json();
            timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
            const fallback = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            (Array.isArray(slots) && slots.length ? slots : fallback).forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
            timeSelect.disabled = false;
        } catch (error) {
            timeSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    });

    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('errorMessage')?.classList.add('hidden');
        document.getElementById('successMessage')?.classList.add('hidden');
        showLoading(true);

        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const address = document.getElementById('address').value;
        const notes = document.getElementById('notes').value;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showLoading(false);
                showError('Você precisa estar logado para agendar');
                setTimeout(() => { window.location.href = '/src/pages/login.html'; }, 900);
                return;
            }

            const res = await fetch(`${API_URL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    serviceId: selectedService._id,
                    providerId: selectedService.providerId._id,
                    scheduledDate: date,
                    scheduledTime: time,
                    address,
                    notes
                })
            });

            showLoading(false);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showError(err.message || 'Falha ao agendar. Tente novamente.');
                return;
            }

            showSuccess('Agendamento realizado com sucesso!');
            setTimeout(() => { window.location.href = '/src/pages/dashboard.html'; }, 1000);
        } catch (error) {
            showLoading(false);
            showError('Falha ao agendar. Tente novamente.');
        }
    });
}
