// Variables globales
let stompClient = null;
let currentUser = null;

// Función para reproducir sonidos de notificación
function playNotificationSound(type) {
    const audio = new Audio();
    switch(type) {
        case 'success':
            audio.src = '/sounds/success.mp3';
            break;
        case 'notification':
            audio.src = '/sounds/notification.mp3';
            break;
    }
    audio.play().catch(e => console.warn('No se pudo reproducir el sonido:', e));
}

// Función para mostrar notificaciones Toast
function showNotification(type, message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white`;
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    new bootstrap.Toast(toast, { delay: 5000 }).show();
    
    // Remover el toast después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Conexión WebSocket
function connectWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = new SockJS('/subastas-ws');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({'Authorization': `Bearer ${token}`}, function(frame) {
        console.log('Conectado: ' + frame);
        
        // Suscribirse a notificaciones personales
        const username = JSON.parse(atob(token.split('.')[1])).sub;
        stompClient.subscribe('/user/queue/notifications', function(notification) {
            const data = JSON.parse(notification.body);
            
            switch(data.type) {
                case 'AUCTION_WON':
                    showNotification('success', data.message);
                    playNotificationSound('success');
                    // Mostrar modal de ganador
                    mostrarModalGanador(data);
                    // Actualizar la vista de pujas y subastas inmediatamente
                    loadMisPujas();
                    loadActiveAuctions();
                    break;
                    
                case 'AUCTION_FAILED':
                case 'AUCTION_ENDED':
                    showNotification('error', data.message);
                    playNotificationSound('notification');
                    // Mostrar modal de no ganador si participó
                    if (data.participaste) {
                        mostrarModalNoGanador(data);
                    }
                    // Actualizar la vista de pujas y subastas inmediatamente
                    loadMisPujas();
                    loadActiveAuctions();
                    break;
            }
        });
        
        // Suscribirse a actualizaciones de subastas
        stompClient.subscribe('/topic/subastas', function(message) {
            const data = JSON.parse(message.body);
            if (data.type === 'SUBASTA_FINALIZADA') {
                // Remover la subasta de la vista inmediatamente con animación
                const subastaCard = document.querySelector(`[data-subasta-id="${data.subastaId}"]`);
                if (subastaCard) {
                    const card = subastaCard.closest('.col-md-6');
                    card.style.transition = 'all 0.5s ease-out';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    setTimeout(() => card.remove(), 500);
                }
                // Actualizar las pujas si el usuario es comprador
                if (currentUser && currentUser.tipoUsuario === 'COMPRADOR') {
                loadMisPujas();
                }
            }
        });
    }, function(error) {
        console.error('Error de conexión:', error);
        setTimeout(connectWebSocket, 5000); // Reintentar conexión
    });
}

// Función para mostrar modal de ganador
function mostrarModalGanador(data) {
    const modalHtml = `
        <div class="modal fade" id="modalGanador" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">¡Felicitaciones!</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <i class="fas fa-trophy fa-3x text-warning mb-3"></i>
                        <h4>¡Has ganado la subasta!</h4>
                        <p>${data.message}</p>
                        <p class="text-success fw-bold">Precio final: $${data.monto}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" data-bs-dismiss="modal">Aceptar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('modalGanador'));
    modal.show();
    
    // Remover el modal del DOM después de cerrarlo
    document.getElementById('modalGanador').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Función para mostrar modal de no ganador
function mostrarModalNoGanador(data) {
    const modalHtml = `
        <div class="modal fade" id="modalNoGanador" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">Subasta Finalizada</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <i class="fas fa-info-circle fa-3x text-danger mb-3"></i>
                        <h4>No has ganado la subasta</h4>
                        <p>${data.message}</p>
                        <p class="text-danger fw-bold">Precio final: $${data.monto}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Aceptar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('modalNoGanador'));
    modal.show();
    
    // Remover el modal del DOM después de cerrarlo
    document.getElementById('modalNoGanador').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Función para mostrar notificaciones Toast
function showNotification(type, message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white`;
    toast.innerHTML = `
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    new bootstrap.Toast(toast, { delay: 5000 }).show();
    
    // Remover el toast después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Función para actualizar el tiempo restante
function actualizarTiempoRestante() {
    const tiemposRestantes = document.querySelectorAll('.tiempo-restante');
    const ahora = new Date();

    tiemposRestantes.forEach(elemento => {
        const fechaInicio = new Date(elemento.dataset.fechaInicio);
        const fechaFin = new Date(elemento.dataset.fechaFin);
        const card = elemento.closest('.card');
        const subastaId = card.querySelector('[data-subasta-id]')?.dataset.subastaId;
        const autoId = card.querySelector('[data-auto-id]')?.dataset.autoId;

        if (ahora < fechaInicio) {
            const diferencia = fechaInicio - ahora;
            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
            elemento.innerHTML = `<i class="fas fa-clock me-2"></i>Comienza en: ${horas}h ${minutos}m ${segundos}s`;
        } else if (ahora <= fechaFin) {
            const diferencia = fechaFin - ahora;
            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
            elemento.innerHTML = `<i class="fas fa-clock me-2"></i>Tiempo restante: ${horas}h ${minutos}m ${segundos}s`;
            
            // Si quedan menos de 10 segundos, agregar clase de alerta
            if (diferencia <= 10000) {
                elemento.classList.add('alert-danger');
                elemento.classList.remove('alert-info');
            }
        } else {
            // La subasta ha finalizado
            if (subastaId) {
                // Eliminar la card de la subasta con una animación
                card.style.transition = 'all 0.5s ease-out';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    card.remove();
                    
                    // Verificar resultado de la subasta
                    const token = localStorage.getItem('token');
                    if (token && currentUser) {
                        fetch(`/api/subastas/${subastaId}/autos/${autoId}/resultado`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        })
                        .then(response => response.json())
                        .then(resultado => {
                            if (resultado.ganador) {
                                // Mostrar mensaje de ganador
                                showNotification('success', `¡Felicitaciones! Has ganado la subasta del auto ${resultado.marca} ${resultado.modelo} por $${resultado.precioFinal}`);
                                playNotificationSound('success');
                            } else if (resultado.participaste) {
                                // Mostrar mensaje de no ganador solo si participó
                                showNotification('error', `No has ganado la subasta del auto ${resultado.marca} ${resultado.modelo}. Precio final: $${resultado.precioFinal}`);
                                playNotificationSound('notification');
                            }
                            // Actualizar la tabla de pujas
                            loadMisPujas();
                        })
                        .catch(error => console.error('Error al verificar resultado:', error));
                    }
                }, 500);
            }
        }
    });
}

// Iniciar la actualización del tiempo restante cada segundo
setInterval(actualizarTiempoRestante, 1000);

// Funciones de autenticación
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Mostrar indicador de carga
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando sesión...';

    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password')
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Error en la autenticación');
            });
        }
        return response.json();
    })
    .then(data => {
        if (!data.token || !data.usuario) {
            throw new Error('Respuesta del servidor inválida');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.usuario));
        currentUser = data.usuario;
        
        // Cerrar el modal de login
        const loginModal = document.getElementById('loginModal');
        const modal = bootstrap.Modal.getInstance(loginModal);
        modal.hide();
        
        updateUIForUser(currentUser);
        e.target.reset();
        showSuccessToast('Sesión iniciada correctamente');
        connectWebSocket();
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorToast(error.message);
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
});

// Función para verificar si hay una sesión activa al cargar la página
window.addEventListener('load', function() {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');
    
    if (token && savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUIForUser(currentUser);
            connectWebSocket();
        } catch (error) {
            console.error('Error al restaurar la sesión:', error);
            logout();
        }
    }
});

function logout() {
    // Limpiar datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    // Ocultar secciones de usuario
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('registerSection').classList.remove('d-none');
    document.getElementById('userSection').classList.add('d-none');
    document.getElementById('controlPanel').classList.add('d-none');
    
    // Ocultar secciones específicas por tipo de usuario
    document.getElementById('misAutosSection').style.display = 'none';
    document.getElementById('misSubastasSection').style.display = 'none';
    document.getElementById('misPujasSection').style.display = 'none';
    
    // Limpiar y ocultar secciones de administrador
    const adminUsersList = document.getElementById('adminUsersList');
    if (adminUsersList) {
        adminUsersList.innerHTML = '';
    }

    // Ocultar sección de subastas finalizadas
    const subastasFinalizadasSection = document.getElementById('subastasFinalizadasSection');
    if (subastasFinalizadasSection) {
        subastasFinalizadasSection.style.display = 'none';
    }
    const subastasFinalizadasList = document.getElementById('subastasFinalizadasList');
    if (subastasFinalizadasList) {
        subastasFinalizadasList.innerHTML = '';
    }
    
    // Desconectar WebSocket
    if (stompClient) {
        stompClient.disconnect();
        stompClient = null;
    }
    
    // Recargar solo las subastas activas
    loadActiveAuctions();
    
    showSuccessToast('Sesión cerrada correctamente');
}

// Funciones de UI
function updateUIForUser(user) {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const userSection = document.getElementById('userSection');
    const userInfo = document.getElementById('userInfo');
    const controlPanel = document.getElementById('controlPanel');
    const misAutosSection = document.getElementById('misAutosSection');
    const misSubastasSection = document.getElementById('misSubastasSection');
    const misPujasSection = document.getElementById('misPujasSection');
    const subastasActivasSection = document.getElementById('subastasActivasList');

    // Ocultar secciones de login/registro
    loginSection.classList.add('d-none');
    registerSection.classList.add('d-none');
    userSection.classList.remove('d-none');

    // Mostrar información del usuario
    userInfo.textContent = `${user.nombre} ${user.apellido} (${user.tipoUsuario})`;

    // Ocultar todas las secciones primero
    misAutosSection.style.display = 'none';
    misSubastasSection.style.display = 'none';
    misPujasSection.style.display = 'none';
    controlPanel.classList.add('d-none');

    if (user.tipoUsuario === 'ADMIN') {
        controlPanel.classList.remove('d-none');
        controlPanel.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h3 class="mb-0">
                        <i class="fas fa-tools me-2"></i>Panel de Administrador
                    </h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <button class="btn btn-primary w-100" onclick="showModal('crearSubastaModal')">
                                <i class="fas fa-plus-circle me-2"></i>Crear Nueva Subasta
                            </button>
                        </div>
                        <div class="col-md-4 mb-3">
                            <button class="btn btn-success w-100" onclick="showModal('registrarAutoModal')">
                                <i class="fas fa-car me-2"></i>Registrar Auto
                            </button>
                        </div>
                        <div class="col-md-4 mb-3">
                            <button class="btn btn-info w-100" onclick="showModal('adminRegisterModal')">
                                <i class="fas fa-user-plus me-2"></i>Registrar Usuario
                            </button>
                        </div>
                    </div>
                    <div id="usersListContainer" class="mt-4">
                        <h4>Gestión de Usuarios</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Nombre</th>
                                        <th>Tipo</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="adminUsersList"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar el modal de registro de usuarios para admin
        if (!document.getElementById('adminRegisterModal')) {
            const modalHtml = `
                <div class="modal fade" id="adminRegisterModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Registrar Nuevo Usuario</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="adminRegisterForm">
                                    <div class="mb-3">
                                        <label class="form-label">Nombre de Usuario</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Contraseña</label>
                                        <input type="password" class="form-control" name="password" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" name="email" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Nombre</label>
                                        <input type="text" class="form-control" name="nombre" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Apellido</label>
                                        <input type="text" class="form-control" name="apellido" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Tipo de Usuario</label>
                                        <select class="form-select" name="tipoUsuario" required>
                                            <option value="ADMIN">Administrador</option>
                                            <option value="VENDEDOR">Vendedor</option>
                                            <option value="COMPRADOR">Comprador</option>
                                        </select>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-user-plus me-2"></i>Registrar Usuario
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Agregar el event listener para el formulario de registro de admin
            document.getElementById('adminRegisterForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                // Validaciones del formulario
                const username = formData.get('username');
                const password = formData.get('password');
                const email = formData.get('email');
                const nombre = formData.get('nombre');
                const apellido = formData.get('apellido');
                const tipoUsuario = formData.get('tipoUsuario');
                
                if (!username || !password || !email || !nombre || !apellido || !tipoUsuario) {
                    showErrorToast('Por favor complete todos los campos');
                    return;
                }
                
                // Validar formato de email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    showErrorToast('Por favor ingrese un email válido');
                    return;
                }
                
                // Mostrar indicador de carga
                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';

                const userData = {
                    username: username.trim(),
                    password: password,
                    email: email.trim(),
                    nombre: nombre.trim(),
                    apellido: apellido.trim(),
                    tipoUsuario: tipoUsuario
                };

                const token = localStorage.getItem('token');
                fetch('/api/auth/registro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(userData)
                })
                .then(async response => {
                    const text = await response.text();
                    if (!response.ok) {
                        throw new Error(text || 'Error en el registro');
                    }
                    return JSON.parse(text);
                })
                .then(data => {
                    showSuccessToast('Usuario registrado exitosamente');
                    
                    // Cerrar el modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('adminRegisterModal'));
                    modal.hide();
                    
                    // Limpiar el formulario
                    e.target.reset();
                    
                    // Recargar la lista de usuarios
                    loadUsersList();
                })
                .catch(error => {
                    console.error('Error en el registro:', error);
                    showErrorToast(error.message || 'Error en el registro');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                });
            });
        }

        loadUsersList();
        loadActiveAuctions();
        document.getElementById('subastasFinalizadasSection').style.display = 'block';
        loadSubastasFinalizadas();
    } else if (user.tipoUsuario === 'VENDEDOR') {
        controlPanel.classList.remove('d-none');
        controlPanel.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h3 class="mb-0">
                        <i class="fas fa-tools me-2"></i>Panel de Vendedor
                    </h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <button class="btn btn-primary w-100" onclick="showModal('crearSubastaModal')">
                                <i class="fas fa-plus-circle me-2"></i>Crear Nueva Subasta
                            </button>
                        </div>
                        <div class="col-md-6 mb-3">
                            <button class="btn btn-success w-100" onclick="showModal('registrarAutoModal')">
                                <i class="fas fa-car me-2"></i>Registrar Auto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        misAutosSection.style.display = 'block';
        misSubastasSection.style.display = 'block';
        loadVendedorAutos();
        loadVendedorSubastas();
        loadActiveAuctions();
    } else if (user.tipoUsuario === 'COMPRADOR') {
        misPujasSection.style.display = 'block';
        loadMisPujas();
        loadActiveAuctions();
    }
}

// Función auxiliar para mostrar modales
function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

// Registro de auto
document.getElementById('registrarAutoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Validaciones mejoradas del formulario
    const marca = formData.get('marca');
    const modelo = formData.get('modelo');
    const anio = parseInt(formData.get('anio'));
    const descripcion = formData.get('descripcion');
    const precioBase = parseFloat(formData.get('precioBase'));

    // Validar campos requeridos
    if (!marca || !modelo || !formData.get('anio') || !descripcion || !formData.get('precioBase')) {
        showErrorToast('Por favor complete todos los campos');
        return;
    }

    // Validar marca y modelo
    if (marca.length < 2 || marca.length > 50) {
        showErrorToast('La marca debe tener entre 2 y 50 caracteres');
        return;
    }

    if (modelo.length < 2 || modelo.length > 50) {
        showErrorToast('El modelo debe tener entre 2 y 50 caracteres');
        return;
    }

    // Validar año
    const currentYear = new Date().getFullYear();
    if (isNaN(anio) || anio < 1900 || anio > currentYear + 1) {
        showErrorToast(`El año debe estar entre 1900 y ${currentYear + 1}`);
        return;
    }

    // Validar descripción
    if (descripcion.length < 10 || descripcion.length > 1000) {
        showErrorToast('La descripción debe tener entre 10 y 1000 caracteres');
        return;
    }

    // Validar precio base
    if (isNaN(precioBase) || precioBase <= 0 || precioBase > 1000000000) {
        showErrorToast('Por favor ingrese un precio base válido (mayor a 0 y menor a 1,000,000,000)');
        return;
    }

    // Mostrar indicador de carga
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';

    const token = localStorage.getItem('token');
    if (!token) {
        showErrorToast('No hay sesión activa');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }

    const autoData = {
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: anio,
        descripcion: descripcion.trim(),
        precioBase: precioBase
    };

    console.log('Enviando datos del auto:', autoData);

    fetch('/api/autos/registrar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(autoData)
    })
    .then(async response => {
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        console.log('Respuesta del servidor:', text);
        
        if (!response.ok) {
                throw new Error(text || 'Error al registrar el auto');
        }
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Error parseando respuesta:', e);
            throw new Error('Error en el formato de respuesta del servidor');
        }
        
        return data;
    })
    .then(auto => {
        console.log('Auto registrado:', auto);
        showSuccessToast('Auto registrado exitosamente');
        
        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('registrarAutoModal'));
        if (modal) {
            modal.hide();
        }
        
        // Limpiar el formulario
        e.target.reset();
        
        // Recargar las listas
        loadVendedorAutos();
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorToast(error.message || 'Error al registrar el auto');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
});

// Registro de usuario
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Validaciones mejoradas del formulario
    const username = formData.get('username');
    const password = formData.get('password');
    const email = formData.get('email');
    const nombre = formData.get('nombre');
    const apellido = formData.get('apellido');
    const tipoUsuario = formData.get('tipoUsuario');
    
    // Validar campos requeridos
    if (!username || !password || !email || !nombre || !apellido || !tipoUsuario) {
        showErrorToast('Por favor complete todos los campos');
        return;
    }
    
    // Validar longitud del nombre de usuario
    if (username.length < 4 || username.length > 20) {
        showErrorToast('El nombre de usuario debe tener entre 4 y 20 caracteres');
        return;
    }

    // Validar que el username solo contenga caracteres válidos
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showErrorToast('El nombre de usuario solo puede contener letras, números y guiones bajos');
        return;
    }

    // Validar contraseña
    if (password.length < 6) {
        showErrorToast('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/.test(password)) {
        showErrorToast('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número');
        return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showErrorToast('Por favor ingrese un email válido');
        return;
    }
    
    // Validar nombre y apellido
    if (nombre.length < 2 || apellido.length < 2) {
        showErrorToast('El nombre y apellido deben tener al menos 2 caracteres');
        return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre) || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        showErrorToast('El nombre y apellido solo pueden contener letras');
        return;
    }
    
    // Mostrar indicador de carga
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';

    const userData = {
        username: username.trim(),
        password: password,
        email: email.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        tipoUsuario: tipoUsuario
    };

    console.log('Enviando datos de registro:', { ...userData, password: '****' });

    fetch('/api/auth/registro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(async response => {
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        console.log('Respuesta del servidor:', text);
        
        if (!response.ok) {
                throw new Error(text || 'Error en el registro');
        }
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Error parseando respuesta:', e);
            throw new Error('Error en el formato de respuesta del servidor');
        }
        
        return data;
    })
    .then(data => {
        showSuccessToast('Usuario registrado exitosamente');
        
        // Cerrar el modal de registro
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        if (registerModal) {
            registerModal.hide();
        }
        
        // Limpiar el formulario
        e.target.reset();
    })
    .catch(error => {
        console.error('Error en el registro:', error);
        showErrorToast(error.message || 'Error en el registro');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
});

// Funciones de notificación
function showSuccessToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('successToast'));
    document.getElementById('successToastMessage').textContent = message;
    toast.show();
}

function showErrorToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('errorToast'));
    document.getElementById('errorToastMessage').textContent = message;
    toast.show();
}

// Habilitar pujas para compradores
function enableBidding() {
    const pujaButtons = document.querySelectorAll('.puja-btn');
    pujaButtons.forEach(btn => {
        btn.disabled = false;
        btn.addEventListener('click', realizarPuja);
    });
}

// Función para cargar las pujas del comprador
function loadMisPujas() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/pujas/comprador', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Error al cargar las pujas');
            });
        }
        return response.json();
    })
    .then(pujas => {
        const pujasList = document.getElementById('misPujasList');
        if (!pujasList) return;

        pujasList.innerHTML = '';
        if (pujas && pujas.length > 0) {
            pujas.forEach(puja => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${puja.tituloSubasta}</td>
                    <td>${puja.informacionAuto}</td>
                    <td>$${puja.monto ? puja.monto.toFixed(2) : '0.00'}</td>
                    <td>${puja.fecha ? new Date(puja.fecha).toLocaleString() : 'N/A'}</td>
                    <td>
                        ${puja.subastaFinalizada ? 
                            (puja.ganadora ? 
                                '<span class="badge bg-success">¡Ganador!</span>' : 
                                '<span class="badge bg-danger">No ganador</span>'
                            ) : 
                            '<span class="badge bg-warning">En proceso</span>'
                        }
                    </td>
                `;
                
                // Agregar clase especial si es ganador
                if (puja.ganadora) {
                    row.classList.add('table-success');
                }
                
                pujasList.appendChild(row);
            });
        } else {
            pujasList.innerHTML = '<tr><td colspan="5" class="text-center">No has realizado ninguna puja</td></tr>';
        }
    })
    .catch(error => {
        console.error('Error cargando pujas:', error);
        showErrorToast(error.message || 'Error al cargar las pujas');
    });
}

// Actualizar la función realizarPuja para recargar la lista de pujas después de una puja exitosa
async function realizarPuja(event) {
    event.preventDefault(); // Prevenir el envío del formulario por defecto
    
    const form = event.target;
    const subastaId = form.closest('.card').dataset.subastaId;
    const autoId = form.closest('.card').dataset.autoId;
    const montoInput = form.querySelector('input[name="montoPuja"]');
    const monto = parseFloat(montoInput.value);
    
    // Validar que sea un número válido
    if (isNaN(monto)) {
        showErrorToast('Por favor ingrese un monto válido');
        return;
    }
    
    // Validar que el monto sea positivo
    if (monto <= 0) {
        showErrorToast('El monto debe ser mayor a 0');
        return;
    }
    
    // Validar que el monto sea mayor al precio actual
    const precioActual = parseFloat(form.querySelector('input[name="montoPuja"]').min) - 1;
    if (monto <= precioActual) {
        showErrorToast('El monto debe ser mayor al precio actual');
        return;
    }

    // Deshabilitar el botón para evitar pujas duplicadas
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    // Mostrar indicador de carga
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Pujando...';

    // Enviar la puja al servidor
        const token = localStorage.getItem('token');
    if (!token) {
        showErrorToast('Debe iniciar sesión para realizar pujas');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }

    try {
        const response = await fetch(`/api/subastas/${subastaId}/autos/${autoId}/pujar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(monto)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Error al realizar la puja');
        }

        showSuccessToast('Puja realizada exitosamente');
        form.reset(); // Limpiar el formulario
        
        // Recargar las pujas y subastas
        loadMisPujas();
        loadActiveAuctions();
    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Funciones de subastas
function loadActiveAuctions() {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch('/api/subastas/activas', {
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar las subastas activas');
        }
        return response.json();
    })
    .then(subastas => {
        const subastasList = document.getElementById('subastasActivasList');
        if (!subastasList) return;

        subastasList.innerHTML = '';
        if (subastas && subastas.length > 0) {
        subastas.forEach(subasta => {
            const card = createAuctionCard(subasta);
            subastasList.appendChild(card);
        });
        } else {
            subastasList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle me-2"></i>No hay subastas activas en este momento
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error cargando subastas activas:', error);
        const subastasList = document.getElementById('subastasActivasList');
        if (subastasList) {
            subastasList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger text-center">
                        <i class="fas fa-exclamation-circle me-2"></i>${error.message}
                    </div>
                </div>
            `;
        }
    });
}

// Cargar subastas activas al iniciar la página
window.addEventListener('DOMContentLoaded', function() {
    loadActiveAuctions();
});

function createAuctionCard(subasta) {
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-4';
    
    // Determinar el estado de la subasta
    const ahora = new Date();
    const fechaInicio = new Date(subasta.fechaInicio);
    const fechaFin = new Date(subasta.fechaFin);
    
    let estado = 'En espera';
    let estadoClass = 'warning';
    
    if (subasta.cancelada) {
        estado = 'Cancelada';
        estadoClass = 'danger';
    } else if (subasta.finalizada) {
        estado = 'Finalizada';
        estadoClass = 'secondary';
    } else if (ahora >= fechaInicio && ahora <= fechaFin) {
        estado = 'Activa';
        estadoClass = 'success';
    }

    // Calcular tiempo restante
    let tiempoRestanteHtml = '';
    if (!subasta.finalizada && !subasta.cancelada) {
        if (ahora < fechaInicio) {
            const diferencia = fechaInicio - ahora;
            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
            tiempoRestanteHtml = `
                <div class="alert alert-warning tiempo-restante" data-fecha-inicio="${fechaInicio.toISOString()}" data-fecha-fin="${fechaFin.toISOString()}">
                    <i class="fas fa-clock me-2"></i>Comienza en: ${horas}h ${minutos}m ${segundos}s
                </div>
            `;
        } else if (ahora <= fechaFin) {
        const diferencia = fechaFin - ahora;
            const horas = Math.floor(diferencia / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);
            tiempoRestanteHtml = `
                <div class="alert alert-info tiempo-restante" data-fecha-inicio="${fechaInicio.toISOString()}" data-fecha-fin="${fechaFin.toISOString()}">
                    <i class="fas fa-clock me-2"></i>Tiempo restante: ${horas}h ${minutos}m ${segundos}s
                </div>
            `;
        }
    }
    
    // Preparar la información de los autos
    let autosHtml = '';
    if (subasta.autos && subasta.autos.length > 0) {
        autosHtml = subasta.autos.map(autoSubasta => {
            const auto = autoSubasta.auto;
            if (!auto) return '';

            const precioBase = auto.precioBase ? parseFloat(auto.precioBase) : 0;
            const precioActual = autoSubasta.precioFinal ? parseFloat(autoSubasta.precioFinal) : precioBase;
            const montoMinimo = (precioActual + 1).toFixed(2);
            
            // Formulario de puja solo para compradores y subastas activas
            let pujaHtml = '';
            if (currentUser && 
                currentUser.tipoUsuario === 'COMPRADOR' && 
                !subasta.finalizada && 
                !subasta.cancelada &&
                ahora >= fechaInicio && 
                ahora <= fechaFin) {
                pujaHtml = `
                    <form class="puja-form" onsubmit="realizarPuja(event)">
                        <input type="hidden" name="subastaId" value="${subasta.id}">
                        <input type="hidden" name="autoId" value="${auto.id}">
                        <div class="input-group">
                                    <span class="input-group-text">$</span>
                                    <input type="number" 
                                           class="form-control" 
                                           name="montoPuja" 
                                   min="${montoMinimo}" 
                                           step="0.01" 
                                           required
                                   value="${montoMinimo}"
                                   placeholder="Monto mayor a $${precioActual.toFixed(2)}">
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-gavel me-1"></i>Pujar
                            </button>
                        </div>
                    </form>
                `;
            }
            
            return `
                <div class="card mb-3" data-subasta-id="${subasta.id}" data-auto-id="${auto.id}">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0">
                            <i class="fas fa-car me-2"></i>${auto.marca} ${auto.modelo} (${auto.anio})
                        </h6>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${auto.descripcion}</p>
                        <div class="row mb-3">
                            <div class="col-6">
                                <div class="price-box border rounded p-2 text-center">
                                    <small class="text-muted d-block">Precio Base</small>
                                    <strong class="text-primary">$${precioBase.toFixed(2)}</strong>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="price-box border rounded p-2 text-center">
                                    <small class="text-muted d-block">Precio Actual</small>
                                    <strong class="text-success">$${precioActual.toFixed(2)}</strong>
                                </div>
                            </div>
                        </div>
                        ${pujaHtml}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        autosHtml = '<div class="alert alert-warning">No hay vehículos en esta subasta</div>';
    }

    // Botón de cancelar para vendedor
    let cancelarBtn = '';
    let editarBtn = '';
    if (currentUser && 
        (currentUser.tipoUsuario === 'VENDEDOR' || currentUser.tipoUsuario === 'ADMIN') &&
        currentUser.id === subasta.vendedor.id &&
        !subasta.finalizada && 
        !subasta.cancelada && 
        ahora < fechaInicio) {
        cancelarBtn = `
            <button class="btn btn-danger mt-3 me-2" onclick="cancelarSubasta(${subasta.id})">
                <i class="fas fa-times me-2"></i>Cancelar Subasta
            </button>
        `;
        editarBtn = `
            <button class="btn btn-primary mt-3" onclick="editarSubasta(${subasta.id})">
                <i class="fas fa-edit me-2"></i>Editar Subasta
            </button>
        `;
    }

    card.innerHTML = `
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="fas fa-gavel me-2"></i>${subasta.titulo || 'Subasta sin título'}
                </h5>
                <span class="badge bg-${estadoClass}">${estado}</span>
            </div>
            <div class="card-body">
                <p class="card-text">${subasta.descripcion || 'Sin descripción'}</p>
                <div class="mb-3">
                    <small class="text-muted">
                        <i class="fas fa-calendar me-2"></i>Inicio: ${new Date(subasta.fechaInicio).toLocaleString()}
                    </small><br>
                    <small class="text-muted">
                        <i class="fas fa-calendar-check me-2"></i>Fin: ${new Date(subasta.fechaFin).toLocaleString()}
                    </small>
                </div>
                ${tiempoRestanteHtml}
                <div class="autos-section">
                    <h6 class="border-bottom pb-2 mb-3">Vehículos en Subasta</h6>
                    ${autosHtml}
                </div>
                <div class="d-flex">
                    ${cancelarBtn}
                    ${editarBtn}
                </div>
            </div>
        </div>
    `;

    return card;
}

function updateAuctionUI(subasta) {
    const auctionCard = document.querySelector(`#subastasList .col-md-6:nth-child(${subasta.id % 2 === 0 ? 'even' : 'odd'})`);
    if (auctionCard) {
        const pujaBtn = auctionCard.querySelector('.puja-btn');
        if (pujaBtn) {
            pujaBtn.disabled = false;
            pujaBtn.addEventListener('click', () => realizarPuja({ target: pujaBtn, dataset: { subastaId: subasta.id, autoId: subasta.auto.id, precioActual: subasta.auto.precioBase } }));
        }
    }
}

// Manejo de formularios de subastas y autos
document.getElementById('crearSubastaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Validaciones mejoradas
    const titulo = formData.get('titulo')?.trim();
    const descripcion = formData.get('descripcion')?.trim();
    const fechaInicioStr = formData.get('fechaInicio');
    const fechaFinStr = formData.get('fechaFin');
    
    // Validar que todos los campos estén presentes
    if (!titulo || !descripcion || !fechaInicioStr || !fechaFinStr) {
        showErrorToast('Todos los campos son obligatorios');
        return;
    }

    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = new Date(fechaFinStr);

    // Validar que las fechas sean válidas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        showErrorToast('Las fechas ingresadas no son válidas');
        return;
    }

    // Validar título
    if (titulo.length < 5 || titulo.length > 100) {
        showErrorToast('El título debe tener entre 5 y 100 caracteres');
        return;
    }

    // Validar descripción
    if (descripcion.length < 10 || descripcion.length > 500) {
        showErrorToast('La descripción debe tener entre 10 y 500 caracteres');
        return;
    }

    // Validar fechas
    const ahora = new Date();
    if (fechaInicio < ahora) {
        showErrorToast('La fecha de inicio debe ser posterior a la fecha actual');
        return;
    }
    
    if (fechaFin <= fechaInicio) {
        showErrorToast('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
    }

    // Validar que la subasta dure al menos 10 minutos y máximo 2 horas
    const duracionMinutos = (fechaFin - fechaInicio) / (1000 * 60);
    if (duracionMinutos < 10) {
        showErrorToast('La subasta debe durar al menos 10 minutos');
        return;
    }
    if (duracionMinutos > 120) { // 2 horas
        showErrorToast('La subasta no puede durar más de 2 horas');
        return;
    }

    // Obtener los autos seleccionados
    const autosSeleccionados = Array.from(document.querySelectorAll('.auto-select'))
        .map(select => select.value)
        .filter(value => value !== "");

    if (autosSeleccionados.length === 0) {
        showErrorToast('Debe seleccionar al menos un auto para la subasta');
        return;
    }

    if (autosSeleccionados.length > 10) {
        showErrorToast('No puede incluir más de 10 autos en una subasta');
        return;
    }

    // Verificar que no haya autos duplicados
    const autosUnicos = new Set(autosSeleccionados);
    if (autosUnicos.size !== autosSeleccionados.length) {
        showErrorToast('No puede incluir el mismo auto más de una vez');
        return;
    }

    // Preparar datos para enviar
    const subastaData = {
        titulo: titulo,
        descripcion: descripcion,
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
        autosIds: autosSeleccionados
    };

    // Mostrar indicador de carga
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando...';

    const token = localStorage.getItem('token');
    if (!token) {
        showErrorToast('No hay sesión activa');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }

    fetch('/api/subastas/crear', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subastaData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Error al crear la subasta');
            });
        }
        return response.json();
    })
    .then(subasta => {
        showSuccessToast('Subasta creada exitosamente');
        bootstrap.Modal.getInstance(document.getElementById('crearSubastaModal')).hide();
        e.target.reset();
        loadActiveAuctions();
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorToast(error.message);
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
});

// Cargar autos disponibles al abrir el modal de crear subasta
document.getElementById('crearSubastaModal').addEventListener('show.bs.modal', function() {
    loadAutosDisponibles();
});

// Agregar botón para más autos
document.getElementById('agregarAutoBtn').addEventListener('click', function() {
    const container = document.getElementById('autosContainer');
    const newSelectContainer = document.createElement('div');
    newSelectContainer.className = 'auto-select-container mb-2 d-flex';
    newSelectContainer.innerHTML = `
        <select class="form-select auto-select me-2" required>
            <option value="">Seleccione un auto...</option>
        </select>
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newSelectContainer);
    loadAutosDisponibles();
});

// Cargar autos disponibles
function loadAutosDisponibles() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token disponible');
        return;
    }

    fetch('/api/autos/vendedor', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('No tiene permisos para ver los autos');
            }
            return response.text().then(text => {
                throw new Error(text || 'Error al cargar los autos disponibles');
            });
        }
        return response.json();
    })
    .then(autos => {
        document.querySelectorAll('.auto-select').forEach(select => {
            const selectedValue = select.value;
            select.innerHTML = '<option value="">Seleccione un auto...</option>';
            if (autos && autos.length > 0) {
            autos.forEach(auto => {
                    if (!auto.vendido) {
                const option = document.createElement('option');
                option.value = auto.id;
                option.textContent = `${auto.marca} ${auto.modelo} (${auto.anio}) - $${auto.precioBase}`;
                select.appendChild(option);
                    }
            });
            if (selectedValue) {
                select.value = selectedValue;
                }
            }
        });
    })
    .catch(error => {
        console.error('Error cargando autos:', error);
        showErrorToast(error.message || 'Error al cargar los autos disponibles');
        document.querySelectorAll('.auto-select').forEach(select => {
            select.innerHTML = '<option value="">Error al cargar autos</option>';
        });
    });
}

// Cargar subastas del vendedor
function loadVendedorSubastas() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/subastas/vendedor', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Error al cargar las subastas');
            });
        }
        return response.json();
    })
    .then(subastas => {
        const subastasList = document.getElementById('misSubastasList');
        if (subastasList) {
            subastasList.innerHTML = '';
            if (subastas && subastas.length > 0) {
            subastas.forEach(subasta => {
                    const card = document.createElement('div');
                    card.className = 'col-md-6 mb-4';
                    card.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${subasta.titulo}</h5>
                                <p class="card-text">${subasta.descripcion}</p>
                                <p>Fecha Inicio: ${new Date(subasta.fechaInicio).toLocaleString()}</p>
                                <p>Fecha Fin: ${new Date(subasta.fechaFin).toLocaleString()}</p>
                                <p>Estado: ${subasta.activa ? 'Activa' : 'Finalizada'}</p>
                            </div>
                        </div>
                    `;
                subastasList.appendChild(card);
            });
            } else {
                subastasList.innerHTML = '<div class="col-12"><p class="text-muted">No tiene subastas creadas</p></div>';
            }
        }
    })
    .catch(error => {
        console.error('Error cargando subastas del vendedor:', error);
        showErrorToast(error.message || 'Error al cargar las subastas del vendedor');
    });
}

// Función para crear tarjeta de auto
function createAutoCard(auto) {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    
    let estadoBtn = '';
    let editarBtn = '';
    
    if (auto.vendido) {
        estadoBtn = '<span class="badge bg-success">Vendido</span>';
    } else if (auto.enSubasta) {
        estadoBtn = '<span class="badge bg-warning">En Subasta</span>';
    } else {
        estadoBtn = '<span class="badge bg-primary">Disponible</span>';
        // Solo mostrar botón de editar si el auto está disponible
        editarBtn = `
            <button class="btn btn-sm btn-primary mt-2" onclick="editarAuto(${auto.id})">
                <i class="fas fa-edit me-1"></i>Editar
            </button>
        `;
    }

    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${auto.marca} ${auto.modelo}</h5>
                <p class="card-text">
                    <strong>Año:</strong> ${auto.anio}<br>
                    <strong>Precio Base:</strong> $${auto.precioBase.toFixed(2)}<br>
                    <strong>Estado:</strong> ${auto.vendido ? 'Vendido' : (auto.enSubasta ? 'En Subasta' : 'Disponible')}
                </p>
                <p class="card-text">${auto.descripcion}</p>
                <div class="d-flex justify-content-between align-items-center">
                ${estadoBtn}
                    ${editarBtn}
                </div>
            </div>
        </div>
    `;

    return card;
}

// Función para agregar auto a nueva subasta
function agregarAutoANuevaSubasta(autoId) {
    const modal = new bootstrap.Modal(document.getElementById('crearSubastaModal'));
    const autoSelect = document.querySelector('.auto-select');
    if (autoSelect) {
        autoSelect.value = autoId;
    }
    modal.show();
}

// Cargar autos del vendedor
function loadVendedorAutos() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No hay token disponible');
        return;
    }

    fetch('/api/autos/vendedor', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('No tiene permisos para ver los autos');
            }
            return response.text().then(text => {
                throw new Error(text || 'Error al cargar los autos');
            });
        }
        return response.json();
    })
    .then(autos => {
        const autosList = document.getElementById('misAutosList');
        if (autosList) {
            autosList.innerHTML = '';
            if (autos && autos.length > 0) {
            autos.forEach(auto => {
                const card = createAutoCard(auto);
                autosList.appendChild(card);
            });
            } else {
                autosList.innerHTML = '<div class="col-12"><p class="text-muted">No tiene autos registrados</p></div>';
            }
        }
    })
    .catch(error => {
        console.error('Error cargando autos del vendedor:', error);
        showErrorToast(error.message || 'Error al cargar los autos');
        const autosList = document.getElementById('misAutosList');
        if (autosList) {
            autosList.innerHTML = '<div class="col-12"><p class="text-danger">Error al cargar los autos</p></div>';
        }
    });
}

// Verificar estado de subastas periódicamente
function checkAuctionsStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/subastas/activas', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(subastas => {
        subastas.forEach(subasta => {
            const fechaFin = new Date(subasta.fechaFin);
            if (fechaFin <= new Date() && subasta.activa) {
                fetch(`/api/subastas/${subasta.id}/finalizar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(() => {
                    loadActiveAuctions();
                    loadVendedorSubastas();
                    loadVendedorAutos();
                })
                .catch(error => console.error('Error finalizando subasta:', error));
            }
        });
    })
    .catch(error => console.error('Error verificando estado de subastas:', error));
}

// Iniciar verificación periódica de subastas
setInterval(checkAuctionsStatus, 60000); // Verificar cada minuto

// Funciones de administración
async function toggleUserStatus(userId, isActive) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorToast('No hay sesión activa');
            return;
        }

        const endpoint = isActive ? 'activar' : 'desactivar';
        const response = await fetch(`/api/admin/usuarios/${userId}/${endpoint}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const usuario = await response.json();
        showSuccessToast(`Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`);
        
        // Actualizar la UI inmediatamente
        const row = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            const statusCell = row.querySelector('.status-cell');
            const actionButton = row.querySelector('.toggle-status-btn');
            
            if (statusCell) {
                statusCell.textContent = isActive ? 'Activo' : 'Inactivo';
                statusCell.className = `status-cell ${isActive ? 'text-success' : 'text-danger'}`;
            }
            
            if (actionButton) {
                actionButton.textContent = isActive ? 'Desactivar' : 'Activar';
                actionButton.onclick = () => toggleUserStatus(userId, !isActive);
            }
        }

        // Recargar la lista de usuarios para asegurar que todo esté actualizado
        await loadUsersList();

    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message || 'Error al cambiar el estado del usuario');
    }
}

// Función para editar usuario
async function editarUsuario(userId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorToast('No hay sesión activa');
            return;
        }

        // Obtener los datos actuales del usuario
        const response = await fetch(`/api/admin/usuarios/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const usuario = await response.json();
        
        // Crear y mostrar el modal de edición
        const modalHtml = `
            <div class="modal fade" id="editarUsuarioModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Usuario: ${usuario.username}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editarUsuarioForm">
                                <input type="hidden" name="userId" value="${usuario.id}">
                                <div class="mb-3">
                                    <label class="form-label">Nombre</label>
                                    <input type="text" class="form-control" name="nombre" value="${usuario.nombre}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Apellido</label>
                                    <input type="text" class="form-control" name="apellido" value="${usuario.apellido}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" name="email" value="${usuario.email}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Usuario</label>
                                    <select class="form-select" name="tipoUsuario" required>
                                        <option value="ADMIN" ${usuario.tipoUsuario === 'ADMIN' ? 'selected' : ''}>Administrador</option>
                                        <option value="VENDEDOR" ${usuario.tipoUsuario === 'VENDEDOR' ? 'selected' : ''}>Vendedor</option>
                                        <option value="COMPRADOR" ${usuario.tipoUsuario === 'COMPRADOR' ? 'selected' : ''}>Comprador</option>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-save me-2"></i>Guardar Cambios
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const oldModal = document.getElementById('editarUsuarioModal');
        if (oldModal) {
            oldModal.remove();
        }

        // Agregar el nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('editarUsuarioModal'));
        modal.show();

        // Manejar el envío del formulario
        document.getElementById('editarUsuarioForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const userData = {
                nombre: formData.get('nombre').trim(),
                apellido: formData.get('apellido').trim(),
                email: formData.get('email').trim(),
                tipoUsuario: formData.get('tipoUsuario')
            };

            try {
                const response = await fetch(`/api/admin/usuarios/${formData.get('userId')}/actualizar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(userData)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }

                showSuccessToast('Usuario actualizado correctamente');
                modal.hide();
                loadUsersList(); // Recargar la lista de usuarios
            } catch (error) {
                console.error('Error:', error);
                showErrorToast(error.message || 'Error al actualizar el usuario');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message || 'Error al cargar los datos del usuario');
    }
}

function loadUsersList() {
    const token = localStorage.getItem('token');
    if (!token) {
        showErrorToast('No hay sesión activa');
        return;
    }

    fetch('/api/admin/usuarios', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(async response => {
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Error al cargar la lista de usuarios');
        }
        return response.json();
    })
    .then(usuarios => {
        const adminUsersList = document.getElementById('adminUsersList');
        if (!adminUsersList) return;

        adminUsersList.innerHTML = '';
        if (usuarios && usuarios.length > 0) {
            usuarios.forEach(usuario => {
                const isActive = usuario.activo;
                const row = document.createElement('tr');
                row.setAttribute('data-user-id', usuario.id);
                row.innerHTML = `
                    <td>${usuario.username}</td>
                    <td>${usuario.nombre} ${usuario.apellido}</td>
                    <td>${usuario.tipoUsuario}</td>
                    <td class="status-cell ${isActive ? 'text-success' : 'text-danger'}">
                        ${isActive ? 'Activo' : 'Inactivo'}
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-primary me-2" onclick="editarUsuario(${usuario.id})">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                        <button class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'} toggle-status-btn" 
                                onclick="toggleUserStatus(${usuario.id}, ${!isActive})">
                            ${isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        </div>
                    </td>
                `;
                adminUsersList.appendChild(row);
            });
        } else {
            adminUsersList.innerHTML = '<tr><td colspan="5" class="text-center">No hay usuarios registrados</td></tr>';
        }
    })
    .catch(error => {
        console.error('Error cargando usuarios:', error);
        showErrorToast(error.message || 'Error al cargar la lista de usuarios');
        const adminUsersList = document.getElementById('adminUsersList');
        if (adminUsersList) {
            adminUsersList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar la lista de usuarios</td></tr>';
        }
    });
}

function loadSubastasFinalizadas() {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/subastas/admin/finalizadas', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(async response => {
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Error al cargar subastas finalizadas: ${text}`);
        }
        return response.json();
    })
    .then(subastas => {
        const container = document.getElementById('subastasFinalizadasList');
        container.innerHTML = '';

        if (subastas.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-center">No hay subastas finalizadas.</p></div>';
            return;
        }

        subastas.forEach(subasta => {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    card.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                        <h5 class="card-title">${subasta.titulo}</h5>
                <p class="card-text">
                            <strong>Descripción:</strong> ${subasta.descripcion}<br>
                            <strong>Fecha Finalización:</strong> ${new Date(subasta.fechaFin).toLocaleString()}<br>
                            <strong>Estado:</strong> ${subasta.finalizada ? 'Finalizada' : 'En proceso'}<br>
                            <strong>Vendedor:</strong> ${subasta.vendedor.username}
                        </p>
                        <div class="mt-3">
                            <h6>Autos en la subasta:</h6>
                            ${subasta.autos.map(autoSubasta => `
                                <div class="mb-2">
                                    <strong>${autoSubasta.auto.marca} ${autoSubasta.auto.modelo}</strong><br>
                                    Precio Final: $${autoSubasta.precioFinal}<br>
                                    Estado: ${autoSubasta.vendido ? 'Vendido' : 'No vendido'}
                                    ${autoSubasta.vendido && autoSubasta.comprador ? 
                                        `<br>Comprador: ${autoSubasta.comprador.username}` : ''}
                                </div>
                            `).join('')}
                        </div>
            </div>
        </div>
    `;
            container.appendChild(card);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('subastasFinalizadasList').innerHTML = 
            '<div class="col-12"><p class="text-center text-danger">Error al cargar subastas finalizadas.</p></div>';
    });
}

// Función para cancelar subasta
async function cancelarSubasta(subastaId) {
    if (!confirm('¿Está seguro que desea cancelar esta subasta? Esta acción no se puede deshacer.')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showErrorToast('No hay sesión activa');
        return;
    }

    try {
        const response = await fetch(`/api/subastas/${subastaId}/cancelar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Error al cancelar la subasta');
        }

        showSuccessToast('Subasta cancelada exitosamente');
        
        // Remover la subasta de la vista con animación
        const subastaCard = document.querySelector(`[data-subasta-id="${subastaId}"]`);
        if (subastaCard) {
            const card = subastaCard.closest('.col-md-6');
            card.style.transition = 'all 0.5s ease-out';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
                card.remove();
                // Recargar las listas después de la animación
                loadActiveAuctions();
                if (currentUser && currentUser.tipoUsuario === 'VENDEDOR') {
                    loadVendedorSubastas();
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message);
    }
}

// Función para editar auto
async function editarAuto(autoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorToast('No hay sesión activa');
            return;
        }

        // Obtener los datos actuales del auto
        const response = await fetch(`/api/autos/${autoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const auto = await response.json();
        
        // Crear y mostrar el modal de edición
        const modalHtml = `
            <div class="modal fade" id="editarAutoModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-car me-2"></i>Editar Auto
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editarAutoForm">
                                <input type="hidden" name="autoId" value="${auto.id}">
                                <div class="mb-3">
                                    <label class="form-label">Marca</label>
                                    <input type="text" class="form-control" name="marca" value="${auto.marca}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Modelo</label>
                                    <input type="text" class="form-control" name="modelo" value="${auto.modelo}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Año</label>
                                    <input type="number" class="form-control" name="anio" value="${auto.anio}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3" required>${auto.descripcion}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Precio Base</label>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input type="number" class="form-control" name="precioBase" value="${auto.precioBase}" required>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-save me-2"></i>Guardar Cambios
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const oldModal = document.getElementById('editarAutoModal');
        if (oldModal) {
            oldModal.remove();
        }

        // Agregar el nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('editarAutoModal'));
        modal.show();

        // Manejar el envío del formulario
        document.getElementById('editarAutoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Validaciones
            const marca = formData.get('marca').trim();
            const modelo = formData.get('modelo').trim();
            const anio = parseInt(formData.get('anio'));
            const descripcion = formData.get('descripcion').trim();
            const precioBase = parseFloat(formData.get('precioBase'));

            // Validar marca y modelo
            if (marca.length < 2 || marca.length > 50) {
                showErrorToast('La marca debe tener entre 2 y 50 caracteres');
                return;
            }

            if (modelo.length < 2 || modelo.length > 50) {
                showErrorToast('El modelo debe tener entre 2 y 50 caracteres');
                return;
            }

            // Validar año
            const currentYear = new Date().getFullYear();
            if (isNaN(anio) || anio < 1900 || anio > currentYear + 1) {
                showErrorToast(`El año debe estar entre 1900 y ${currentYear + 1}`);
                return;
            }

            // Validar descripción
            if (descripcion.length < 10 || descripcion.length > 1000) {
                showErrorToast('La descripción debe tener entre 10 y 1000 caracteres');
                return;
            }

            // Validar precio base
            if (isNaN(precioBase) || precioBase <= 0 || precioBase > 1000000000) {
                showErrorToast('Por favor ingrese un precio base válido (mayor a 0 y menor a 1,000,000,000)');
                return;
            }

            const autoData = {
                marca: marca,
                modelo: modelo,
                anio: anio,
                descripcion: descripcion,
                precioBase: precioBase
            };

            try {
                const response = await fetch(`/api/autos/${formData.get('autoId')}/actualizar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(autoData)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }

                showSuccessToast('Auto actualizado correctamente');
                modal.hide();
                loadVendedorAutos(); // Recargar la lista de autos
            } catch (error) {
                console.error('Error:', error);
                showErrorToast(error.message || 'Error al actualizar el auto');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message || 'Error al cargar los datos del auto');
    }
}

// Función para editar subasta
async function editarSubasta(subastaId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorToast('No hay sesión activa');
            return;
        }

        // Obtener los datos actuales de la subasta
        const response = await fetch(`/api/subastas/${subastaId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const subasta = await response.json();
        
        // Crear y mostrar el modal de edición
        const modalHtml = `
            <div class="modal fade" id="editarSubastaModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-gavel me-2"></i>Editar Subasta
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editarSubastaForm">
                                <input type="hidden" name="subastaId" value="${subasta.id}">
                                <div class="mb-3">
                                    <label class="form-label">Título</label>
                                    <input type="text" class="form-control" name="titulo" value="${subasta.titulo}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3" required>${subasta.descripcion}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha de Inicio</label>
                                    <input type="datetime-local" class="form-control" name="fechaInicio" 
                                           value="${subasta.fechaInicio.slice(0, 16)}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha de Fin</label>
                                    <input type="datetime-local" class="form-control" name="fechaFin" 
                                           value="${subasta.fechaFin.slice(0, 16)}" required>
                                </div>
                                <div class="mb-3">
                                    <h6>Autos en la subasta:</h6>
                                    <div id="autosSubastaContainer">
                                        ${subasta.autos.map(autoSubasta => `
                                            <div class="card mb-2">
                                                <div class="card-body">
                                                    <h6>${autoSubasta.auto.marca} ${autoSubasta.auto.modelo} (${autoSubasta.auto.anio})</h6>
                                                    <p class="mb-2">Precio Base: $${autoSubasta.auto.precioBase}</p>
                                                    <div class="form-check">
                                                        <input class="form-check-input auto-subasta-check" type="checkbox" 
                                                               value="${autoSubasta.auto.id}" checked>
                                                        <label class="form-check-label">Mantener en la subasta</label>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="fas fa-save me-2"></i>Guardar Cambios
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const oldModal = document.getElementById('editarSubastaModal');
        if (oldModal) {
            oldModal.remove();
        }

        // Agregar el nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('editarSubastaModal'));
        modal.show();

        // Manejar el envío del formulario
        document.getElementById('editarSubastaForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Validaciones
            const titulo = formData.get('titulo').trim();
            const descripcion = formData.get('descripcion').trim();
            const fechaInicio = new Date(formData.get('fechaInicio'));
            const fechaFin = new Date(formData.get('fechaFin'));
            const autosSeleccionados = Array.from(document.querySelectorAll('.auto-subasta-check:checked'))
                .map(checkbox => parseInt(checkbox.value));

            // Validar título
            if (titulo.length < 5 || titulo.length > 100) {
                showErrorToast('El título debe tener entre 5 y 100 caracteres');
                return;
            }

            // Validar descripción
            if (descripcion.length < 10 || descripcion.length > 500) {
                showErrorToast('La descripción debe tener entre 10 y 500 caracteres');
                return;
            }

            // Validar fechas
            const ahora = new Date();
            if (fechaInicio < ahora) {
                showErrorToast('La fecha de inicio debe ser posterior a la fecha actual');
                return;
            }

            if (fechaFin <= fechaInicio) {
                showErrorToast('La fecha de fin debe ser posterior a la fecha de inicio');
                return;
            }

            // Validar duración de la subasta (entre 10 minutos y 2 horas)
            const duracionMinutos = (fechaFin - fechaInicio) / (1000 * 60);
            if (duracionMinutos < 10) {
                showErrorToast('La subasta debe durar al menos 10 minutos');
                return;
            }
            if (duracionMinutos > 120) {
                showErrorToast('La subasta no puede durar más de 2 horas');
                return;
            }

            // Validar autos seleccionados
            if (autosSeleccionados.length === 0) {
                showErrorToast('Debe mantener al menos un auto en la subasta');
                return;
            }

            const subastaData = {
                titulo: titulo,
                descripcion: descripcion,
                fechaInicio: formData.get('fechaInicio'),
                fechaFin: formData.get('fechaFin'),
                autosIds: autosSeleccionados
            };

            try {
                const response = await fetch(`/api/subastas/${formData.get('subastaId')}/actualizar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(subastaData)
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }

                showSuccessToast('Subasta actualizada correctamente');
                modal.hide();
                loadActiveAuctions();
                if (currentUser.tipoUsuario === 'VENDEDOR') {
                    loadVendedorSubastas();
                }
            } catch (error) {
                console.error('Error:', error);
                showErrorToast(error.message || 'Error al actualizar la subasta');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        showErrorToast(error.message || 'Error al cargar los datos de la subasta');
    }
}