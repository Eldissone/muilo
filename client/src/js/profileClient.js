// profileClient.js
const API_BASE_URL = 'http://localhost:3000/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

// Estado da aplicação
let currentProfile = null;
let originalProfile = null;
let userStats = {
    rating: 0,
    services: 0,
    returnRate: 0,
    reviewsCount: 0
};

// Elementos principais
const elements = {
    // Header
    headerUserName: document.getElementById('headerUserName'),
    
    // Profile Header
    profileAvatar: document.getElementById('profileAvatar'),
    profileName: document.getElementById('profileName'),
    profileRole: document.getElementById('profileRole'),
    experienceText: document.getElementById('experienceText'),
    locationText: document.getElementById('locationText'),
    verifiedBadge: document.getElementById('verifiedBadge'),
    avatarEditOverlay: document.getElementById('avatarEditOverlay'),
    
    // Upload Modal
    avatarUploadModal: document.getElementById('avatarUploadModal'),
    avatarInput: document.getElementById('avatarInput'),
    avatarPreview: document.getElementById('avatarPreview'),
    cancelAvatarUpload: document.getElementById('cancelAvatarUpload'),
    saveAvatarUpload: document.getElementById('saveAvatarUpload'),
    saveAvatarText: document.getElementById('saveAvatarText'),
    avatarUploadLoading: document.getElementById('avatarUploadLoading'),
    avatarUploadProgress: document.getElementById('avatarUploadProgress'),
    avatarProgressFill: document.getElementById('avatarProgressFill'),
    avatarProgressText: document.getElementById('avatarProgressText'),
    
    // Stats
    ratingValue: document.getElementById('ratingValue'),
    servicesCount: document.getElementById('servicesCount'),
    returnRate: document.getElementById('returnRate'),
    ratingProgress: document.getElementById('ratingProgress'),
    servicesProgress: document.getElementById('servicesProgress'),
    returnProgress: document.getElementById('returnProgress'),
    
    // Especialidades
    specialtiesContainer: document.getElementById('specialtiesContainer'),
    
    // Disponibilidade
    availabilityContainer: document.getElementById('availabilityContainer'),
    timeSlotsContainer: document.getElementById('timeSlotsContainer'),
    
    // Reviews
    reviewsTitle: document.getElementById('reviewsTitle'),
    averageRating: document.getElementById('averageRating'),
    reviewsContainer: document.getElementById('reviewsContainer'),
    
    // Localização
    locationMap: document.getElementById('locationMap'),
    serviceRadius: document.getElementById('serviceRadius'),
    
    // Modal de dados
    profileModal: document.getElementById('profileModal'),
    openProfileModalBtn: document.getElementById('openProfileModalBtn'),
    closeProfileModalBtn: document.getElementById('closeProfileModalBtn'),
    
    // Formulário no modal
    profileForm: document.getElementById('profileForm'),
    profileLoading: document.getElementById('profileLoading'),
    profileEmpty: document.getElementById('profileEmpty'),
    inputName: document.getElementById('inputName'),
    inputEmail: document.getElementById('inputEmail'),
    inputPhone: document.getElementById('inputPhone'),
    inputCity: document.getElementById('inputCity'),
    inputBio: document.getElementById('inputBio'),
    specialtySelect: document.getElementById('specialtySelect'),
    experienceInput: document.getElementById('experienceInput'),
    consultationFeeInput: document.getElementById('consultationFeeInput'),
    providerFields: document.getElementById('providerFields'),
    
    // Botões
    btnSaveProfile: document.getElementById('btnSaveProfile'),
    btnResetProfile: document.getElementById('btnResetProfile'),
    btnDeleteProfile: document.getElementById('btnDeleteProfile'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// Variáveis para upload
let selectedAvatarFile = null;
let avatarPreviewUrl = null;

// Função de autenticação
function initializeAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user')||'{}');
    const authEl = document.getElementById('headerAuth');
    const userEl = document.getElementById('headerUser');
    const nameEl = document.getElementById('headerUserName');
    const avatarEl = document.getElementById('headerAvatar');
    
    if (authEl && userEl) {
        if (token) {
            authEl.classList.add('hidden');
            userEl.classList.remove('hidden');
            if (nameEl) nameEl.textContent = formatDisplayName(user?.name);
            if (avatarEl) {
                const avatarUrl = user?.avatar ? resolveAvatarUrl(user.avatar) : null;
                if (avatarUrl) {
                    avatarEl.style.backgroundImage = `url("${avatarUrl}")`;
                    avatarEl.classList.remove('hidden');
                } else {
                    avatarEl.classList.add('hidden');
                }
            }
        } else {
            authEl.classList.remove('hidden');
            userEl.classList.add('hidden');
            // Redirecionar para login se não estiver autenticado
            window.location.href = '/src/pages/login.html';
        }
    }
    
    const logout = document.getElementById('headerLogout');
    if (logout) {
        logout.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }
}

// Verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/src/pages/login.html';
        return false;
    }
    return true;
}

// Obter token de autenticação
function getAuthToken() {
    return localStorage.getItem('token');
}

function resolveAvatarUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//.test(path)) return path;
    if (path.startsWith('/')) return `${API_ORIGIN}${path}`;
    return `${API_ORIGIN}/${path}`;
}

function formatDisplayName(name) {
    if (!name || typeof name !== 'string') return 'Minha Conta';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Minha Conta';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

// Headers padrão para requisições
function getHeaders() {
    const token = getAuthToken();
    return {
        'Authorization': `Bearer ${token}`
    };
}

// Mostrar toast de notificação
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'info') icon = 'info';
    
    toast.innerHTML = `
        <span class="material-symbols-outlined">
            ${icon}
        </span>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remover toast após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === elements.toastContainer) {
                elements.toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Mostrar/ocultar elementos de loading
function setLoading(loading) {
    if (elements.profileLoading) {
        elements.profileLoading.style.display = loading ? 'block' : 'none';
    }
    
    if (elements.profileForm) {
        elements.profileForm.style.display = loading ? 'none' : 'block';
    }
    
    if (elements.btnSaveProfile) {
        elements.btnSaveProfile.disabled = loading;
    }
    
    if (elements.btnResetProfile) {
        elements.btnResetProfile.disabled = loading;
    }
    
    if (elements.btnDeleteProfile) {
        elements.btnDeleteProfile.disabled = loading;
    }
}

// Atualizar informações do header do perfil
function updateProfileHeader(profile) {
    if (!profile) return;
    
    // Nome
    if (elements.profileName) {
        elements.profileName.textContent = profile.name || 'Usuário';
    }
    
    if (elements.headerUserName) {
        elements.headerUserName.textContent = formatDisplayName(profile.name);
    }
    
    // Role (cargo)
    if (elements.profileRole) {
        let roleText = 'Cliente';
        if (profile.role === 'provider') {
            roleText = profile.profile?.specialty || 'Prestador de Serviços';
        } else if (profile.role === 'admin') {
            roleText = 'Administrador';
        }
        elements.profileRole.textContent = roleText;
    }
    
    // Experiência
    if (elements.experienceText) {
        const experience = profile.profile?.experience || 0;
        elements.experienceText.textContent = `${experience} ${experience === 1 ? 'ano' : 'anos'} de exp.`;
    }
    
    // Localização
    if (elements.locationText) {
        const city = profile.address?.city || 'Localização não informada';
        const state = profile.address?.state ? `, ${profile.address.state}` : '';
        elements.locationText.textContent = `${city}${state}`;
    }
    
    // Avatar
    if (elements.profileAvatar) {
        const userLS = JSON.parse(localStorage.getItem('user')||'{}');
        const avatarPath = profile.avatar || userLS.avatar;
        const avatarUrl = resolveAvatarUrl(avatarPath);
        if (avatarUrl) {
            elements.profileAvatar.style.backgroundImage = `url("${avatarUrl}")`;
        }
    }
    
    // Verificado
    if (elements.verifiedBadge) {
        elements.verifiedBadge.style.display = profile.isVerified ? 'block' : 'none';
    }
}

// Buscar perfil do usuário (READ)
async function fetchProfile() {
    if (!checkAuth()) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'GET',
            headers: getHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            currentProfile = data;
            originalProfile = JSON.parse(JSON.stringify(data));
            
            // Atualizar UI
            updateProfileHeader(data);
            
            // Popular formulário do modal
            populateForm(data);
            
            // Ajustar UI baseada no role
            adjustUIForUserRole(data);
            
            console.log('Perfil carregado:', data);
        } else {
            throw new Error('Falha ao carregar perfil');
        }
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        showToast('Não foi possível carregar o perfil.', 'error');
    }
}

// Popular o formulário com dados do perfil
function populateForm(profile) {
    if (!profile) return;
    
    // Informações básicas
    if (elements.inputName) elements.inputName.value = profile.name || '';
    if (elements.inputEmail) elements.inputEmail.value = profile.email || '';
    if (elements.inputPhone) elements.inputPhone.value = profile.phone || '';
    
    // Endereço
    if (elements.inputCity) {
        elements.inputCity.value = profile.address?.city || '';
    }
    
    // Bio
    if (elements.inputBio) {
        elements.inputBio.value = profile.profile?.bio || '';
    }
    
    // Campos específicos para prestadores
    if (profile.role === 'provider') {
        // Especialidade
        if (elements.specialtySelect && profile.profile?.specialty) {
            elements.specialtySelect.value = profile.profile.specialty;
        }
        
        // Experiência
        if (elements.experienceInput) {
            elements.experienceInput.value = profile.profile?.experience || '';
        }
        
        // Taxa de consulta
        if (elements.consultationFeeInput) {
            elements.consultationFeeInput.value = profile.profile?.consultationFee || '';
        }
    }
}

// Ajustar UI baseada no role do usuário
function adjustUIForUserRole(profile) {
    if (profile.role === 'provider') {
        // Mostrar campos específicos de prestador no modal
        if (elements.providerFields) {
            elements.providerFields.style.display = 'grid';
        }
    }
}

// Preparar dados para envio
function prepareProfileData() {
    const profileData = {
        name: elements.inputName.value.trim(),
        email: elements.inputEmail.value.trim(),
        phone: elements.inputPhone.value.trim(),
        address: {
            city: elements.inputCity.value.trim()
        }
    };
    
    // Dados específicos de prestador
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'provider') {
        profileData.profile = {
            bio: elements.inputBio.value.trim(),
            specialty: elements.specialtySelect?.value || '',
            experience: elements.experienceInput ? parseInt(elements.experienceInput.value) || 0 : 0,
            consultationFee: elements.consultationFeeInput ? parseFloat(elements.consultationFeeInput.value) || 0 : 0
        };
    }
    
    return profileData;
}

// Criar ou atualizar perfil (UPDATE)
async function saveProfile() {
    if (!checkAuth()) return;
    
    // Validações
    if (!elements.inputName || !elements.inputName.value.trim()) {
        showToast('O nome é obrigatório', 'error');
        elements.inputName.focus();
        return;
    }
    
    if (!elements.inputEmail || !elements.inputEmail.value.trim()) {
        showToast('O email é obrigatório', 'error');
        elements.inputEmail.focus();
        return;
    }
    
    const profileData = prepareProfileData();
    
    setLoading(true);
    
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id || currentProfile?._id;
        
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const savedProfile = await response.json();
            currentProfile = savedProfile;
            originalProfile = JSON.parse(JSON.stringify(savedProfile));
            
            // Atualizar localStorage
            const updatedUser = {
                ...user,
                name: savedProfile.name,
                email: savedProfile.email,
                avatar: savedProfile.avatar
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Atualizar autenticação do header
            initializeAuth();
            
            // Atualizar UI
            updateProfileHeader(savedProfile);
            
            showToast('Perfil atualizado com sucesso!', 'success');
            
            // Fechar modal após salvar
            closeProfileModal();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao salvar perfil');
        }
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        showToast(error.message || 'Não foi possível salvar o perfil.', 'error');
    } finally {
        setLoading(false);
    }
}

// Upload de avatar
async function uploadAvatar(file) {
    if (!checkAuth()) return null;
    
    try {
        // Criar FormData para enviar o arquivo
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Atualizar progresso
        if (elements.avatarUploadProgress) {
            elements.avatarUploadProgress.classList.remove('hidden');
        }
        
        // Usar XMLHttpRequest para acompanhar progresso
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id || currentProfile?._id;
            
            xhr.open('PATCH', `${API_BASE_URL}/users/${userId}/avatar`, true);
            xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
            
            // Acompanhar progresso
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    if (elements.avatarProgressFill) {
                        elements.avatarProgressFill.style.width = `${percentComplete}%`;
                    }
                    if (elements.avatarProgressText) {
                        elements.avatarProgressText.textContent = `${Math.round(percentComplete)}%`;
                    }
                }
            });
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } else {
                    reject(new Error('Falha no upload'));
                }
            };
            
            xhr.onerror = function() {
                reject(new Error('Erro de rede'));
            };
            
            xhr.send(formData);
        });
        
    } catch (error) {
        console.error('Erro no upload:', error);
        throw error;
    }
}

// Abrir modal de upload
function openAvatarUploadModal() {
    if (elements.avatarUploadModal) {
        elements.avatarUploadModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Resetar preview
        if (elements.avatarPreview) {
            elements.avatarPreview.style.backgroundImage = elements.profileAvatar.style.backgroundImage;
        }
        
        // Resetar estado
        selectedAvatarFile = null;
        avatarPreviewUrl = null;
        
        // Resetar progresso
        if (elements.avatarUploadProgress) {
            elements.avatarUploadProgress.classList.add('hidden');
        }
        if (elements.avatarProgressFill) {
            elements.avatarProgressFill.style.width = '0%';
        }
        if (elements.avatarProgressText) {
            elements.avatarProgressText.textContent = '0%';
        }
        
        // Resetar loading
        if (elements.avatarUploadLoading) {
            elements.avatarUploadLoading.classList.add('hidden');
        }
        if (elements.saveAvatarText) {
            elements.saveAvatarText.textContent = 'Salvar Foto';
        }
    }
}

// Fechar modal de upload
function closeAvatarUploadModal() {
    if (elements.avatarUploadModal) {
        elements.avatarUploadModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Limpar preview temporária
        if (avatarPreviewUrl) {
            URL.revokeObjectURL(avatarPreviewUrl);
            avatarPreviewUrl = null;
        }
    }
}

// Resetar formulário
function resetForm() {
    if (originalProfile) {
        populateForm(originalProfile);
        showToast('Formulário restaurado para os últimos valores salvos.', 'success');
    }
}

// Abrir modal de dados
function openProfileModal() {
    if (elements.profileModal) {
        elements.profileModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Fechar modal de dados
function closeProfileModal() {
    if (elements.profileModal) {
        elements.profileModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Configurar eventos
function setupEventListeners() {
    // Avatar upload
    if (elements.avatarEditOverlay) {
        elements.avatarEditOverlay.addEventListener('click', openAvatarUploadModal);
    }
    
    // Input de arquivo
    if (elements.avatarInput) {
        elements.avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validar tamanho (máx 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('A imagem deve ter no máximo 5MB', 'error');
                    return;
                }
                
                // Validar tipo
                if (!file.type.match('image.*')) {
                    showToast('Por favor, selecione uma imagem válida', 'error');
                    return;
                }
                
                selectedAvatarFile = file;
                
                // Criar preview
                if (avatarPreviewUrl) {
                    URL.revokeObjectURL(avatarPreviewUrl);
                }
                
                avatarPreviewUrl = URL.createObjectURL(file);
                
                if (elements.avatarPreview) {
                    elements.avatarPreview.style.backgroundImage = `url("${avatarPreviewUrl}")`;
                }
            }
        });
    }
    
    // Cancelar upload
    if (elements.cancelAvatarUpload) {
        elements.cancelAvatarUpload.addEventListener('click', closeAvatarUploadModal);
    }
    
    // Salvar upload
    if (elements.saveAvatarUpload) {
        elements.saveAvatarUpload.addEventListener('click', async () => {
            if (!selectedAvatarFile) {
                showToast('Por favor, selecione uma imagem', 'error');
                return;
            }
            
            try {
                // Mostrar loading
                if (elements.avatarUploadLoading) {
                    elements.avatarUploadLoading.classList.remove('hidden');
                }
                if (elements.saveAvatarText) {
                    elements.saveAvatarText.textContent = 'Salvando...';
                }
                elements.saveAvatarUpload.disabled = true;
                
                // Fazer upload
                const result = await uploadAvatar(selectedAvatarFile);
                
                // Atualizar avatar na página
                if (result && result.avatar) {
                    if (elements.profileAvatar) {
                        const avatarUrl = resolveAvatarUrl(result.avatar);
                        if (avatarUrl) {
                            elements.profileAvatar.style.backgroundImage = `url("${avatarUrl}")`;
                        }
                    }
                    
                    // Atualizar localStorage
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    user.avatar = result.avatar;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    showToast('Foto atualizada com sucesso!', 'success');
                    closeAvatarUploadModal();
                }
                
            } catch (error) {
                console.error('Erro ao fazer upload:', error);
                showToast('Erro ao fazer upload da imagem', 'error');
            } finally {
                // Resetar loading
                if (elements.avatarUploadLoading) {
                    elements.avatarUploadLoading.classList.add('hidden');
                }
                if (elements.saveAvatarText) {
                    elements.saveAvatarText.textContent = 'Salvar Foto';
                }
                elements.saveAvatarUpload.disabled = false;
            }
        });
    }
    
    // Modal de dados
    if (elements.openProfileModalBtn) {
        elements.openProfileModalBtn.addEventListener('click', openProfileModal);
    }
    
    if (elements.closeProfileModalBtn) {
        elements.closeProfileModalBtn.addEventListener('click', closeProfileModal);
    }
    
    // Fechar modais ao clicar fora
    if (elements.profileModal) {
        elements.profileModal.addEventListener('click', (e) => {
            if (e.target === elements.profileModal) {
                closeProfileModal();
            }
        });
    }
    
    if (elements.avatarUploadModal) {
        elements.avatarUploadModal.addEventListener('click', (e) => {
            if (e.target === elements.avatarUploadModal) {
                closeAvatarUploadModal();
            }
        });
    }
    
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.profileModal.style.display === 'flex') {
                closeProfileModal();
            }
            if (elements.avatarUploadModal.style.display === 'flex') {
                closeAvatarUploadModal();
            }
        }
    });
    
    // Formulário
    if (elements.btnSaveProfile) {
        elements.btnSaveProfile.addEventListener('click', saveProfile);
    }
    
    if (elements.btnResetProfile) {
        elements.btnResetProfile.addEventListener('click', resetForm);
    }
    
    if (elements.btnDeleteProfile) {
        elements.btnDeleteProfile.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir sua conta? Esta ação é irreversível.')) {
                deleteAccount();
            }
        });
    }
}

// Deletar conta (simplificado para exemplo)
async function deleteAccount() {
    if (!checkAuth()) return;
    
    showToast('Funcionalidade de exclusão de conta em desenvolvimento', 'info');
}

// Inicializar aplicação
async function init() {
    // Inicializar autenticação
    initializeAuth();
    
    // Verificar se está autenticado
    if (!checkAuth()) return;
    
    setupEventListeners();
    await fetchProfile();
    
    // Esconder loading do modal
    if (elements.profileLoading) {
        elements.profileLoading.style.display = 'none';
    }
    
    if (elements.profileForm) {
        elements.profileForm.style.display = 'block';
    }
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
