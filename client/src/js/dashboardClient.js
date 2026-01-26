import { API_URL, socket } from '../utils/config.js';

let appointments = [];

function mapStatusKey(status) {
  return status === 'in_progress' ? 'inprogress' : status;
}

async function loadDashboard() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/src/pages/login.html';
    return;
  }

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('userName');
        const nameMobileEl = document.getElementById('userNameMobile');
        if (nameEl) nameEl.textContent = user.name;
        if (nameMobileEl) nameMobileEl.textContent = (user.name || '').split(' ')[0] || user.name;
      } catch {}
    }

    const res = await fetch(`${API_URL}/api/appointments/my-appointments`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
    appointments = await res.json();
    updateDashboard();
    setupWebSocket();
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

function updateDashboard() {
  const counts = {
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    inprogress: appointments.filter(a => a.status === 'in_progress').length,
    completed: appointments.filter(a => a.status === 'completed').length
  };

  const idMap = {
    pending: 'count-pending',
    confirmed: 'count-confirmed',
    inprogress: 'count-inprogress',
    completed: 'count-completed'
  };
  Object.entries(idMap).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = counts[key];
  });

  const loading = document.getElementById('appointments-loading');
  const empty = document.getElementById('appointments-empty');
  const container = document.getElementById('appointments-container');
  if (loading) loading.style.display = 'none';
  if (empty) {
    const noData = !Array.isArray(appointments) || appointments.length === 0;
    empty.classList.toggle('hidden', !noData);
    if (noData) {
      try { showNotification('Nenhum agendamento encontrado'); } catch {}
    }
  }
  if (!container) return;

  container.innerHTML = appointments.slice(0, 5).map(apt => {
    const statusKey = mapStatusKey(apt.status);
    const dateStr = apt.scheduledDate ? new Date(apt.scheduledDate).toLocaleString() : '';
    return `
      <div class="appointment-card bg-white dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-white/5 hover:shadow-lg transition-all">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg ${getStatusColor(statusKey)} flex items-center justify-center">
                <span class="material-symbols-outlined text-white">${getStatusIcon(statusKey)}</span>
              </div>
              <div class="flex-1">
                <h4 class="font-bold text-text-dark dark:text-white mb-1">${apt.serviceId?.title || 'Serviço'}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">${apt.providerId?.name || ''}</p>
                <div class="flex flex-wrap gap-4">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="material-symbols-outlined text-gray-400">schedule</span>
                    <span class="text-gray-700 dark:text-gray-300">${dateStr}</span>
                  </div>
                </div>
                ${apt.notes ? `<div class="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg"><p class="text-sm text-gray-600 dark:text-gray-300"><span class="font-medium">Observação:</span> ${apt.notes}</p></div>` : ''}
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:w-32">
            <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(statusKey)}">${getStatusText(apt.status)}</span>
            <div class="flex gap-2">
              ${apt.status === 'confirmed' ? `<button onclick="startChat('${apt._id}')" class="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">Chat</button>` : ''}
              ${apt.status === 'pending' ? `<button onclick="cancelAppointment('${apt._id}')" class="flex-1 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors">Cancelar</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function setupWebSocket() {
  if (!socket.connected) {
    try { socket.connect(); } catch {}
  }
  socket.on('status-updated', data => {
    const index = appointments.findIndex(a => a._id === data._id);
    if (index !== -1) {
      appointments[index] = data;
      updateDashboard();
      showNotification(`Status atualizado: ${getStatusText(data.status)}`);
    }
  });
  appointments.forEach(apt => {
    if (!['completed', 'cancelled'].includes(apt.status)) {
      socket.emit('join-room', apt._id);
    }
  });
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'bg-status-pending';
    case 'confirmed': return 'bg-status-confirmed';
    case 'inprogress': return 'bg-status-inprogress';
    case 'completed': return 'bg-status-completed';
    default: return 'bg-gray-500';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending': return 'schedule';
    case 'confirmed': return 'check_circle';
    case 'inprogress': return 'play_circle';
    case 'completed': return 'done_all';
    default: return 'help';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'confirmed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    case 'inprogress': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'completed': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  }
}

function getStatusText(status) {
  const statusMap = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    in_progress: 'Em Andamento',
    inprogress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  };
  return statusMap[status] || status;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification-toast';
  notification.textContent = message;
  document.body.appendChild(notification);
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 10px 20px; border-radius: 5px; animation: slideIn 0.3s, fadeOut 0.3s 2.7s forwards; z-index: 1000; }
      @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes fadeOut { to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
  setTimeout(() => notification.remove(), 3000);
}

window.newAppointment = () => { window.location.href = '/src/pages/search.html'; };

window.cancelAppointment = async (id) => {
  if (!confirm('Tem certeza que deseja cancelar?')) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'cancelled' })
    });
    loadDashboard();
  } catch (error) {
    console.error('Erro ao cancelar:', error);
    showNotification('Erro ao cancelar agendamento');
  }
};

window.startChat = (id) => { alert('Funcionalidade de chat em desenvolvimento'); };

document.addEventListener('DOMContentLoaded', loadDashboard);
