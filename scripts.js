// Core Variables
let currentLanguage = 'es';
let currentTheme = 'light';
let currentWorker = null;
let currentIndex = 0;
let currentInspectionData = {};
let currentItemStatus = null;
let lastCaptureTime = 0;
let inspectionStartTime = null;
let inspectionEndTime = null;
let currentPage = 1;
let workers = {};
const recordsPerPage = 10;
//declarada al inicio para evitar errores
async function handleImageProcessing(file) {
    if (!file) {
        console.error('No file provided');
        return null;
    }

    const photoPreview = document.getElementById('photoPreview');
    const spinner = document.getElementById('imageLoadingSpinner');

    try {
        if (spinner) spinner.style.display = 'block';
        if (photoPreview) photoPreview.classList.add('processing');

        // Process and compress the image
        const processedImage = await compressImage(file);

        // Update UI
        if (photoPreview) {
            photoPreview.src = processedImage;
            photoPreview.style.display = 'block';
            photoPreview.classList.remove('processing');
        }

        return processedImage;

    } catch (error) {
        console.error('Error processing image:', error);
        showNotification('Error al procesar la imagen', 'error');
        return null;
    } finally {
        if (spinner) spinner.style.display = 'none';
        if (photoPreview) photoPreview.classList.remove('processing');
    }
}
//event listeners
function initializeLoginButtons() {
    const loginBtn = document.querySelector('.btn:not(.btn-secondary)');
    const demoBtn = document.querySelector('.btn.btn-secondary');
    
    if(loginBtn) loginBtn.addEventListener('click', login);
    if(demoBtn) demoBtn.addEventListener('click', startDemoMode);
}
// Lista de items de inspección
const inspectionItems = [
    { 
        id: 'tires', 
        name: { en: 'Tires', es: 'Llantas' }, 
        icon: '🚗', 
        description: { 
            en: 'Check for proper inflation, no visible damage, and sufficient tread depth.', 
            es: 'Verifique que estén correctamente infladas, sin daños visibles y con suficiente profundidad de dibujo.' 
        },
        requiredPhotos: 1  // Se requieren 4 fotos (una por cada llanta)
    },
    { 
        id: 'mirrors', 
        name: { en: 'Rearview Mirrors', es: 'Espejos Retrovisores' }, 
        icon: '🪞', 
        description: { 
            en: 'Ensure both mirrors are properly aligned, clean, and free from damage.', 
            es: 'Asegúrese de que ambos espejos estén correctamente alineados, limpios y sin daños.' 
        },
        requiredPhotos: 0  // Se requieren 2 fotos (espejo izquierdo y derecho)
    },
    { 
        id: 'license_plates', 
        name: { en: 'License Plates', es: 'Placas Delantera y Trasera' }, 
        icon: '🔖', 
        description: { 
            en: 'Confirm that both plates are securely attached and clearly visible.', 
            es: 'Confirme que ambas placas estén firmemente sujetas y sean claramente visibles.' 
        },
        requiredPhotos: 0  // Se requieren 2 fotos (placa delantera y trasera)
    },
    { 
        id: 'cleanliness', 
        name: { en: 'Cleanliness', es: 'Limpieza' }, 
        icon: '🧼', 
        description: { 
            en: 'Ensure the vehicle is clean, both exterior and interior.', 
            es: 'Asegúrese de que el vehículo esté limpio, tanto exterior como interior.' 
        },
	requiredPhotos: 0 //unica foto central pasillo
    },
    { 
        id: 'scratches', 
        name: { en: 'Exterior Scratches', es: 'Rayones del Exterior' }, 
        icon: '🔍', 
        description: { 
            en: 'Check for any visible scratches or dents on the exterior.', 
            es: 'Verifique si hay rayones o abolladuras visibles en el exterior.' 
        },
        requiredPhotos: 0  // Se requieren 3 fotos (lateral izquierdo, derecho y frontal)
    },
    { 
        id: 'headlights_taillights', 
        name: { en: 'Headlights and Taillights', es: 'Faros Delanteros y Traseros' }, 
        icon: '💡', 
        description: { 
            en: 'Ensure they are not broken or foggy and are functioning properly.', 
            es: 'Asegúrese de que no estén rotos u opacos y que funcionen correctamente.' 
        },
        requiredPhotos: 0  // Se requieren 2 fotos (faros delanteros y traseros)
    },
    { 
        id: 'compartments', 
        name: { en: 'Compartments', es: 'Gavetas' }, 
        icon: '🗄️', 
        description: { 
            en: 'Check the compartments for cleanliness and general condition.', 
            es: 'Verifique la limpieza y el estado general de las gavetas.' 
        },
        requiredPhotos: 0  // Se requieren 2 fotos (lado izquierdo y derecho)
    }
];

// Notification Messages
const notificationMessages = {
    welcome: { en: 'Welcome', es: 'Bienvenido' },
    invalidWorker: { en: 'Invalid Worker ID or Password', es: 'ID de Trabajador o Contraseña inválidos' },
    truckSelected: { en: 'Truck selected:', es: 'Camión seleccionado:' },
    invalidTruckId: { en: 'Invalid Truck ID', es: 'ID de Camión inválido' },
    imageProcessing: { en: 'Processing image...', es: 'Procesando imagen...' }
};

// Initialize Application
function initializeApp() {
    try {
        // Load saved data
        loadSavedData();
        
        // Initialize language and theme
        //initializeLanguage();
       // initializeTheme();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize mobile optimizations
        initializeMobileOptimizations();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error initializing application', 'error');
    }
}

function loadSavedData() {
    try {
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage) currentLanguage = savedLanguage;
        
        const savedTheme = localStorage.getItem('preferredTheme');
        if (savedTheme) {
            currentTheme = savedTheme;
            document.body.classList.toggle('dark-theme', savedTheme === 'dark');
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

function setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.display = 'block';
            loginScreen.classList.add('active');
        }
    });

    window.addEventListener('beforeunload', () => {
        try {
            localStorage.setItem('preferredLanguage', currentLanguage);
            localStorage.setItem('preferredTheme', currentTheme);
        } catch (error) {
            console.error('Error saving data:', error);
        }
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeApp);
// Authentication Functions
async function login() {
    try {
        const workerId = document.getElementById('workerId')?.value?.trim();
        const password = document.getElementById('workerPassword')?.value?.trim();

        if (!workerId || !password) {
            throw new Error('Please fill in both fields');
        }

        console.log('Data sent to API:', { workerId, password });

        // Autenticación en el backend
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId, password }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Invalid credentials');
        }

        // Asignar el usuario autenticado a currentWorker
        currentWorker = data.user; // Variable global

        console.log('Authenticated user:', currentWorker);

        // Guardar en localStorage para persistencia
        localStorage.setItem('currentWorker', JSON.stringify(currentWorker));

        // Mostrar bienvenida al usuario
        showNotification(`Welcome, ${currentWorker.name}!`, 'success');

        // Cerrar todos los modales
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });

        // Ocultar pantallas actuales
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
        });

        // Actualizar último inicio de sesión en el backend
        await fetch('/api/updateLastLogin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId: currentWorker.id }),
        });

        // Validar y navegar según el rol del usuario
        if (!['admin', 'user'].includes(currentWorker.role)) {
            throw new Error('Invalid role assigned to user');
        }

        if (currentWorker.role === 'admin') {
            showAdminDashboard();
        } else {
            showScreen('truckIdScreen');
        }
    } catch (error) {
        console.error('Login error:', error); // Más detalle en la consola
        handleError(error, 'login'); // Reutilizar la función de manejo de errores
    }
}

function startDemoMode() {
    currentWorker = { 
        id: '000', 
        name: 'Demo User', 
        role: 'user',
        inspections: []
    };

    showNotification('Demo mode started', 'success');
    resetScreens();
    showScreen('truckIdScreen');
}

// Screen Management
function showScreen(screenId) {
    // Close modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });

    // Show selected screen
    const selectedScreen = document.getElementById(screenId);
    if (selectedScreen) {
        selectedScreen.style.display = 'block';
        selectedScreen.classList.add('active');
        
        // Update screen-specific content
        if (screenId === 'adminScreen') {
            updateAdminStats();
            updateRecentInspections();
        }
    }

    // Update mobile optimizations
    updateScreenForMobile(screenId);
}

// Mobile Screen Optimization
function updateScreenForMobile(screenId) {
    const screen = document.getElementById(screenId);
    if (!screen) return;

    screen.style.overflow = 'auto';
    screen.style.webkitOverflowScrolling = 'touch';

    const navButtons = screen.querySelector('.nav-buttons');
    if (navButtons) {
        screen.style.paddingBottom = `${navButtons.offsetHeight + 16}px`;
    }
}

function resetScreens() {
    currentInspectionData = {};
    currentIndex = 0;
    currentItemStatus = null;
    
    const photoPreview = document.getElementById('photoPreview');
    const commentBox = document.getElementById('commentBox');
    
    if (photoPreview) {
        photoPreview.style.display = 'none';
        photoPreview.src = '';
    }
    
    if (commentBox) {
        commentBox.value = '';
    }
}

// Language and Theme Management
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'es' : 'en';
    const btnSpans = document.querySelectorAll('#languageToggleBtn span');
    btnSpans.forEach(span => {
        span.style.display = span.getAttribute('data-lang') === currentLanguage ? 'inline' : 'none';
    });
    updateLanguage();
    localStorage.setItem('preferredLanguage', currentLanguage);
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('preferredTheme', currentTheme);
}
// New functions for settings
function updateDefaultLanguage(lang) {
    localStorage.setItem('defaultLanguage', lang);
    showNotification('Default language updated', 'success');
}

function updateThemePreference(theme) {
    localStorage.setItem('defaultTheme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
    showNotification('Theme preference updated', 'success');
}
//funcion para traducir en vivo
function updateLanguage() {
    // Cambiar la visibilidad de los elementos según el idioma
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = el.getAttribute('data-lang') === currentLanguage ? 'inline' : 'none';
    });

    // Mantener la visibilidad de los botones de estado
    document.querySelectorAll('.status-btn span').forEach(span => {
        if (span.getAttribute('data-lang') === currentLanguage) {
            span.style.display = 'inline';
        } else {
            span.style.display = 'none';
        }
    });

    // Manejar las traducciones para el elemento de inspección actual
    if (currentIndex !== undefined && inspectionItems[currentIndex]) {
        const item = inspectionItems[currentIndex];
        const nameElement = document.getElementById('currentName');
        const descElement = document.getElementById('currentDescription');
        
        if (nameElement && item.name) {
            nameElement.textContent = `${item.icon} ${item.name[currentLanguage]}`;
        }
        
        if (descElement && item.description) {
            descElement.textContent = item.description[currentLanguage];
        }
    }
}
//  showSettings function
function showSettings() {
    toggleSidebar();
    showScreen('settingsScreen');
    
    // Load saved preferences
    const savedLang = localStorage.getItem('defaultLanguage') || 'en';
    const savedTheme = localStorage.getItem('defaultTheme') || 'light';
    
    document.getElementById('defaultLanguage').value = savedLang;
    document.getElementById('themePreference').value = savedTheme;
}
// Inspection Management
async function startInspection() {
    try {
        // Registrar el tiempo de inicio de la inspección
        inspectionStartTime = new Date();
        const truckId = document.getElementById('truckId').value.trim().toUpperCase();

        // Validar si el ID del camión está en el formato correcto
        const truckIdPattern = /^T\d{3}$/;
        if (!truckIdPattern.test(truckId)) {
            showNotification('Invalid truck ID format. Must be T followed by 3 digits (e.g., T001)', 'error');
            return;
        }

        // Show loading state
        const startButton = document.querySelector('[onclick="startInspection()"]');
        startButton.disabled = true;
        startButton.innerHTML = '<span class="loading-spinner"></span> Validating...';

        // Fetch truck data from Supabase
        const response = await fetch(`/api/getTruck?truckId=${truckId}`);
        const data = await response.json();

        if (!response.ok) {
            showNotification(data.error || 'Error validating truck ID', 'error');
            return;
        }

        // Validate truck status
        if (data.status !== 'active') {
            showNotification(`Truck ${truckId} is currently ${data.status}`, 'warning');
            return;
        }

        showNotification(`Selected: ${data.model} (${data.year})`, 'success');

        // Asignar datos del trabajador actual a la inspección
        if (currentWorker) {
            console.log(`Inspection started by: ${currentWorker.name}`);
            currentInspectionData.worker = currentWorker.name;
            currentInspectionData.worker_id = currentWorker.id;
        } else {
            console.warn('No authenticated worker found. Assigning inspection without worker data.');
            currentInspectionData.worker = 'Unknown';
            currentInspectionData.worker_id = 'N/A';
        }

        // Save truck information in the inspection data
        currentInspectionData.truckId = truckId;
        currentInspectionData.truckModel = data.model;
        currentInspectionData.truckYear = data.year;

        // Reiniciar datos de la inspección y actualizar la UI
        resetInspection();
        showScreen('inspectionScreen');
        updateInspectionDisplay();
        updateProgressBar();

    } catch (error) {
        console.error('Error starting inspection:', error);
        showNotification('Error starting inspection', 'error');
    } finally {
        // Reset button state
        const startButton = document.querySelector('[onclick="startInspection()"]');
        startButton.disabled = false;
        startButton.innerHTML = `
            <span data-lang="en">Start Inspection</span>
            <span data-lang="es">Iniciar Inspección</span>
        `;
    }
}
/*function startInspection() {
    // Registrar el tiempo de inicio de la inspección
    inspectionStartTime = new Date();
    const truckId = document.getElementById('truckId').value.trim();

    // Validar si el ID del camión es válido
    if (!trucks[truckId]) {
        showNotification('Invalid truck ID', 'error');
        return;
    }

    // Recuperar los datos del camión seleccionado
    const truck = trucks[truckId];
    showNotification(`Truck selected: ${truck.model}, ${truck.year}`, 'success');

    // Asignar datos del trabajador actual a la inspección
    if (currentWorker) {
        console.log(`Inspection started by: ${currentWorker.name}`);
        currentInspectionData.worker = currentWorker.name;
        currentInspectionData.worker_id = currentWorker.id;
    } else {
        console.warn('No authenticated worker found. Assigning inspection without worker data.');
        currentInspectionData.worker = 'Unknown';
        currentInspectionData.worker_id = 'N/A';
    }

    // Reiniciar datos de la inspección y actualizar la UI
    resetInspection();
    showScreen('inspectionScreen');
    updateInspectionDisplay();
    updateProgressBar();
}*/

function resetInspection() {
    currentIndex = 0;
    currentInspectionData = {};
    currentItemStatus = null;
    
    const elements = {
        photoPreview: document.getElementById('photoPreview'),
        commentBox: document.getElementById('commentBox'),
        charCount: document.getElementById('charCount')
    };
    
    if (elements.photoPreview) {
        elements.photoPreview.style.display = 'none';
        elements.photoPreview.src = '';
    }
    
    if (elements.commentBox) {
        elements.commentBox.value = '';
    }
    
    if (elements.charCount) {
        elements.charCount.textContent = '0/150';
    }
  cleanupImages();
}
function updateInspectionDisplay() {
    const item = inspectionItems[currentIndex];
    if (!item) {
        console.error('Invalid inspection index');
        return;
    }

    // Retrieve current data for this item or set defaults
    const currentData = currentInspectionData[item.id] || { comment: '', photos: [], status: null };

    // Update UI elements
    document.getElementById('currentName').textContent = `${item.icon} ${item.name[currentLanguage]}`;
    document.getElementById('currentDescription').textContent = item.description[currentLanguage];

    // Update comment box
    const commentBox = document.getElementById('commentBox');
    if (commentBox) {
        commentBox.value = currentData.comment || '';
    }
    updateCharCount();

    // Update photo preview
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        // Always clear the previous photo first
        photoPreview.src = '';
        photoPreview.style.display = 'none';

        // Only show a photo if we have photos for this specific item
        if (currentData.photos && currentData.photos.length > 0) {
            photoPreview.src = currentData.photos[currentData.photos.length - 1];
            photoPreview.style.display = 'block';
        }
    }

    // Reset all status buttons and highlight the saved one if exists
    document.querySelectorAll('.status-btn').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.status === currentData.status) {
            button.classList.add('active');
        }
    });

    // Validate next button if necessary
    validateNextButton(currentData.comment?.length || 0, 30, 150);
}
// Add overall condition
function calculateOverallCondition(inspectionData) {
    if (!inspectionData || Object.keys(inspectionData).length === 0) {
        return { score: 100, criticalCount: 0, warningCount: 0 }; // Valores predeterminados
    }

    const items = Object.values(inspectionData);
    const totalItems = items.length;
    let criticalCount = 0;
    let warningCount = 0;

    items.forEach(item => {
        if (item.status === 'critical') criticalCount++;
        if (item.status === 'warning') warningCount++;
    });

    // Calcular porcentaje:
    const baseScore = 100;
    const criticalDeduction = criticalCount * 20;
    const warningDeduction = warningCount * 10;

    let overallScore = baseScore - criticalDeduction - warningDeduction;
    overallScore = Math.max(0, Math.min(100, overallScore)); // Mantener entre 0-100

    return {
        score: overallScore,
        criticalCount,
        warningCount
    };
}
//session manager
const SessionManager = {
    timeout: 30 * 60 * 1000, // 30 minutes
    timer: null,

    startSession: () => {
        SessionManager.resetTimer();
        document.addEventListener('mousemove', SessionManager.resetTimer);
        document.addEventListener('keypress', SessionManager.resetTimer);
    },

    resetTimer: () => {
        clearTimeout(SessionManager.timer);
        SessionManager.timer = setTimeout(() => {
            showNotification('Session expired. Please login again.', 'warning');
            backToLogin();
        }, SessionManager.timeout);
    },

    endSession: () => {
        clearTimeout(SessionManager.timer);
        document.removeEventListener('mousemove', SessionManager.resetTimer);
        document.removeEventListener('keypress', SessionManager.resetTimer);
    }
};
//Loading states
function setLoadingState(isLoading, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const originalText = element.innerText;
    
    if (isLoading) {
        element.disabled = true;
        element.innerHTML = '<span class="loading-spinner"></span> Loading...';
    } else {
        element.disabled = false;
        element.innerText = originalText;
    }
}
//validate input
function validateInput(value, type) {
    const patterns = {
        workerId: /^\d{4,6}$/,
        password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/,
        truckId: /^[A-Z]\d{3}$/
    };

    return patterns[type]?.test(value) || false;
}
//Storage management
const StorageManager = {
    save: async (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            handleError(error, 'StorageManager.save');
            return false;
        }
    },
    
    get: async (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            handleError(error, 'StorageManager.get');
            return null;
        }
    }
};

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = ((currentIndex + 1) / inspectionItems.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
}
function setItemStatus(status) {
    // Set the current status
    currentItemStatus = status;

    // Get all status buttons and the clicked one
    const buttons = document.querySelectorAll('.status-btn');
    const clickedButton = document.querySelector(`.status-btn[data-status="${status}"]`);

    // Remove active class from all buttons
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    // Add active class to clicked button
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // Save item state in currentInspectionData
    const item = inspectionItems[currentIndex];
    if (!currentInspectionData[item.id]) {
        currentInspectionData[item.id] = {};
    }
    
    currentInspectionData[item.id] = {
        ...currentInspectionData[item.id],
        status: status,
        comment: document.getElementById('commentBox')?.value || '',
        photo: document.getElementById('photoPreview')?.src || null
    };

    // Update character count and validate next button
    updateCharCount();
}


// Add event listeners to status buttons
document.querySelectorAll('.status-btn').forEach(button => {
    button.addEventListener('click', function() {
        const status = this.getAttribute('data-status');
        setItemStatus(status);
    });
});


function initializeStatusButtons() {
    document.querySelectorAll('.status-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const status = this.getAttribute('data-status');
            setItemStatus(status);
        });
    });
}

async function nextItem() {
    console.log('nextItem fue llamado');

    // Obtener el ítem actual y detalles necesarios
    const item = inspectionItems[currentIndex];
    const requiredPhotos = item.requiredPhotos ?? 1; // Fotos requeridas, por defecto 1
    const currentPhotos = currentInspectionData[item.id]?.photos || []; // Fotos actuales
    const comment = document.getElementById('commentBox')?.value.trim() || ''; // Comentario del inspector

    console.log('Current inspection item:', JSON.stringify(item, null, 2));
    console.log('Required photos:', requiredPhotos);
    console.log('Current photos count:', currentPhotos.length);

    // Caso especial: Si no se requieren fotos, avanzar directamente
    if (requiredPhotos === 0) {
        console.log(`El ítem "${item.name[currentLanguage]}" no requiere fotos, avanzando...`);
        currentInspectionData[item.id] = {
            ...currentInspectionData[item.id],
            comment: comment,
            status: currentItemStatus,
            timestamp: new Date().toISOString(),
            aiComment: 'No se requiere análisis de IA para este ítem.',
        };
        advanceToNextItem();
        return;
    }

    // Validar si se han cargado las fotos requeridas antes de avanzar
    if (currentPhotos.length < requiredPhotos) {
        const missingPhotos = requiredPhotos - currentPhotos.length;
        console.warn(`Faltan ${missingPhotos} fotos para completar este ítem.`);
        showNotification(`Faltan ${missingPhotos} fotos para completar este ítem.`, 'error');
        return;
    }

    // Guardar los datos del ítem actual
    currentInspectionData[item.id] = {
        ...currentInspectionData[item.id],
        comment: comment,
        status: currentItemStatus,
        timestamp: new Date().toISOString(),
    };

    // Procesar las fotos y comentarios con OpenAI si aplica
    if (currentPhotos.length > 0 && comment.length >= 30) {
        console.log('Llamando a OpenAI con fotos cargadas y comentario válido.');
        try {
            showNotification('Procesando imágenes con OpenAI...');

            // Llamada a la función para analizar fotos
            const aiComment = await analyzePhotoWithOpenAI(currentPhotos);

            // Validar y formatear el comentario de IA
            if (Array.isArray(aiComment)) {
                console.log('AI Comment recibido como array:', aiComment);
                const formattedAIComment = aiComment.map((comment, index) => `Imagen ${index + 1}: ${comment}`).join('\n');
                currentInspectionData[item.id].aiComment = formattedAIComment;
            } else if (typeof aiComment === 'string') {
                console.log('AI Comment recibido como string:', aiComment);
                currentInspectionData[item.id].aiComment = aiComment;
            } else {
                console.error('Formato inesperado del comentario de AI:', aiComment);
                currentInspectionData[item.id].aiComment = 'Error: Formato inesperado del comentario de AI.';
            }

            console.log(`AI Comment added for ${item.name[currentLanguage]}:`, currentInspectionData[item.id].aiComment);
            showNotification('Análisis de OpenAI completado.');
        } catch (error) {
            console.error('Error al procesar con OpenAI:', error);
            showNotification('Error al procesar las imágenes con OpenAI.', 'error');
            currentInspectionData[item.id].aiComment = 'Error al procesar las imágenes con OpenAI.';
        }
    } else {
        console.log('No hay suficientes fotos o el comentario es insuficiente, se omite el envío a OpenAI.');
        currentInspectionData[item.id].aiComment = 'No hay suficientes fotos o comentario válido.';
    }

    // Avanzar al siguiente ítem o completar la inspección
    if (currentIndex < inspectionItems.length - 1) {
        currentIndex++;
        console.log(`Avanzando al siguiente ítem: ${inspectionItems[currentIndex].name[currentLanguage]}`);
        updateInspectionDisplay();
        updateProgressBar();
        currentItemStatus = null; // Reiniciar el estado del ítem actual
    } else {
        console.log('Inspección completada.');
        completeInspection();
    }
}
function advanceToNextItem() {
    if (currentIndex < inspectionItems.length - 1) {
        console.log('Avanzando al siguiente ítem.');
        currentIndex++;
        updateInspectionDisplay();
        updateProgressBar();
        currentItemStatus = null; // Resetear el estado para el siguiente ítem
        document.getElementById('photoPreview').style.display = 'none'; // Ocultar vista previa de foto
        document.getElementById('photoPreview').src = ''; // Limpiar el src de la foto
    } else {
        console.log('Inspección completada.');
        completeInspection();
    }
}

function previousItem() {
    if (currentIndex > 0) {
        currentIndex--;
        updateInspectionDisplay();
        updateProgressBar();
        currentItemStatus = null;
    } else {
        showNotification('This is the first item', 'warning');
    }
}
async function generateInspectionPDF(inspection) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        console.error('PDF generation library not loaded');
        showNotification('Error: PDF generation library not available', 'error');
        return null;
    }

    try {
        const doc = new jsPDF();

        // Header with styling
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('FleetGuard Inspection Report', 20, 20);

        // Reset text color for body
        doc.setTextColor(0, 0, 0);
        let y = 40;
        doc.setFontSize(12);

        // Basic Info Section
	const basicInfo = [
	    `Inspector: ${inspection.worker}`,
	    `Vehicle ID: ${inspection.truckId}`,
	    `Model: ${inspection.truckModel || 'N/A'}`,
	    `Year: ${inspection.truckYear || 'N/A'}`,
	    `Date: ${inspection.date}`,
	];

        basicInfo.forEach(info => {
            doc.text(info, 20, y);
            y += 10;
        });
        y += 10;

        // Overall metric
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Overall Vehicle Condition', 20, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
	const condition = {
	    score: inspection.overall_condition,
	    criticalCount: inspection.critical_count,
	    warningCount: inspection.warning_count
	};
	
	const conditionText = [
	    `Puntuacion General: ${condition.score.toFixed(1)}%`,
	    `Problemas Criticos: ${condition.criticalCount}`,
	    `Problemas de Precaucion: ${condition.warningCount}`
	];

        conditionText.forEach(text => {
            doc.text(text, 20, y);
            y += 10;
        });
        y += 10;

        // Inspection Items Section
        Object.entries(inspection.data).forEach(([key, value]) => {
            const item = inspectionItems.find(i => i.id === key);
            if (!item) return;

            if (y > doc.internal.pageSize.getHeight() - 60) {
                doc.addPage();
                y = 20;
            }

            // Item Header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${item.name[currentLanguage]} - Status: ${value.status.toUpperCase()}`, 20, y);
            y += 10;

            // Inspector Comments
            if (value.comment) {
                const commentLines = doc.splitTextToSize(`Inspector Comments: ${value.comment}`, 170);
                doc.text(commentLines, 20, y);
                y += commentLines.length * 6;
            }

            // AI Comments
            if (value.aiComment) {
                const aiCommentLines = doc.splitTextToSize(`AI Analysis: ${value.aiComment}`, 170);
                doc.text(aiCommentLines, 20, y);
                y += aiCommentLines.length * 6;
            }

            // Photos
            if (value.photos && value.photos.length > 0) {
                value.photos.forEach((photo, index) => {
                    if (y + 70 > doc.internal.pageSize.getHeight() - 20) {
                        doc.addPage();
                        y = 20;
                    }

                    try {
                        doc.addImage(photo, 'JPEG', 20, y, 50, 50);
                        y += 55;
                    } catch (error) {
                        console.error(`Error adding image for photo ${index + 1}:`, error);
                        doc.text(`Error: Unable to add image ${index + 1}`, 20, y);
                        y += 10;
                    }
                });
            }

            y += 10; // Add spacing between items
        });

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.getHeight() - 15);

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const filename = `FleetGuard_Inspection_${inspection.truckId}_${timestamp}.pdf`;

        // Convert to base64
        const pdfBase64 = doc.output('datauristring');

        showNotification('Uploading PDF...', 'info');

        // Upload as base64 to Supabase
        const response = await fetch('/api/uploadPDF', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pdfData: pdfBase64,
                filename: filename
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload PDF');
        }

        const result = await response.json();
        showNotification('PDF uploaded successfully', 'success');

        // Save locally as well
        doc.save(filename);

        return result.url;

    } catch (error) {
        console.error('Error generating/uploading PDF:', error);
        showNotification(`Error with PDF operation: ${error.message}`, 'error');
        return null;
    }
}


async function getTruckInfo(truckId) {
    // Simula una consulta a la base de datos o API
    const mockDatabase = {
        T001: { model: 'Freightliner Cascadia', year: '2022' },
        T002: { model: 'Kenworth T680', year: '2021' },
        T003: { model: 'Volvo VNL', year: '2023' },
    };
    return mockDatabase[truckId] || null;
}
//funcion para terminar la inspeccion de manera correcta
async function completeInspection() {
    try {
        const inspectionEndTime = new Date();
        const duration = (inspectionEndTime - inspectionStartTime) / 1000;
        const truckId = document.getElementById('truckId')?.value?.trim();

        // Validaciones iniciales
        if (!inspectionStartTime) {
            throw new Error('Inspection start time is not defined.');
        }

        if (!currentInspectionData || Object.keys(currentInspectionData).length === 0) {
            throw new Error('Inspection data is empty or undefined.');
        }

        // Calcular la condición general
        const condition = calculateOverallCondition(currentInspectionData);
        if (!condition || typeof condition.score === 'undefined') {
            throw new Error('Invalid condition object. Missing properties.');
        }

        // Obtener información adicional del camión (si es necesario)
        const truckInfo = await getTruckInfo(truckId); // Implementar esta función si aún no existe
        const model = truckInfo?.model || 'N/A';
        const year = truckInfo?.year || 'N/A';

        // Crear el registro de inspección
        const inspectionRecord = {
            worker: currentWorker.name,
            worker_id: currentWorker.id,
            truck_id: truckId,
            model: model,
            year: year,
            start_time: inspectionStartTime.toISOString(),
            end_time: inspectionEndTime.toISOString(),
            duration: duration,
            overall_condition: condition.score || null,
            critical_count: condition.criticalCount || 0,
            warning_count: condition.warningCount || 0,
            date: new Date().toLocaleString(),
            data: { ...currentInspectionData },
        };

        console.log('Inspection record before saving:', inspectionRecord);

        // Generar el PDF de la inspección
        const pdfUrl = await generateInspectionPDF(inspectionRecord);
        inspectionRecord.pdf_url = pdfUrl;

        // Crear los datos para guardar en el backend o localStorage
        const inspectionData = {
            worker_id: inspectionRecord.worker_id,
            truck_id: inspectionRecord.truck_id,
            model: inspectionRecord.model,
            year: inspectionRecord.year,
            start_time: inspectionRecord.start_time,
            end_time: inspectionRecord.end_time,
            duration: inspectionRecord.duration,
            overall_condition: inspectionRecord.overall_condition,
            pdf_url: inspectionRecord.pdf_url,
            critical_count: inspectionRecord.critical_count,
            warning_count: inspectionRecord.warning_count,
            date: inspectionRecord.date,
            status: 'completed',
            dynamic_status:
                inspectionRecord.critical_count > 0
                    ? 'critical'
                    : inspectionRecord.warning_count > 0
                    ? 'warning'
                    : 'ok',
            created_at: new Date().toISOString(),
        };

        console.log('Inspection data sent to backend:', inspectionData);

        // Guardar la inspección en el backend
        const response = await fetch('/api/saveInspection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inspectionData),
        });

        if (!response.ok) throw new Error('Failed to save inspection');

        // Actualizar los registros locales
        if (!Array.isArray(window.records)) {
            window.records = [];
        }
        window.records.push({ ...inspectionRecord, pdfUrl });
        localStorage.setItem('inspectionRecords', JSON.stringify(window.records));

        // Notificar y cambiar de pantalla
        showNotification('Inspection completed and saved successfully', 'success');
        showScreen('recordsScreen');
        displayRecords();
    } catch (error) {
        console.error('Error completing inspection:', error);
        showNotification('Error saving inspection', 'error');
    }
}


function validateNextButton(charCount, minCharLimit, maxCharLimit) {
    const nextButton = document.getElementById('nextButton');

    // Verificar si el ítem actual tiene fotos suficientes
    const item = inspectionItems[currentIndex];
    const requiredPhotos = item?.requiredPhotos || 0;
    const currentPhotos = currentInspectionData[item.id]?.photos?.length || 0;

    // Validar si se cumplen todas las condiciones
    const isValid = 
        charCount >= minCharLimit && 
        charCount <= maxCharLimit && 
        currentItemStatus !== null && 
        currentPhotos >= requiredPhotos;

    // Actualizar estado del botón
    if (isValid) {
        nextButton.classList.remove('disabled');
        nextButton.disabled = false;
    } else {
        nextButton.classList.add('disabled');
        nextButton.disabled = true;
    }
}
function updateCharCount() {
    const commentBox = document.getElementById('commentBox');
    const charCountDisplay = document.getElementById('charCount');

    if (!commentBox || !charCountDisplay) {
        console.error('Required elements not found in DOM.');
        return;
    }

    const charCount = commentBox.value.length;
    const minCharLimit = 30;
    const maxCharLimit = 150;

    // Mostrar el conteo de caracteres
    charCountDisplay.textContent = `${charCount}/${maxCharLimit}`;
    charCountDisplay.style.color = charCount < minCharLimit ? 'red' : 'green';

    // Validar el botón "Next Item"
    validateNextButton(charCount, minCharLimit, maxCharLimit);
}
// Image Processing and Camera Functions
async function openCamera() {
    const item = inspectionItems[currentIndex];
    const requiredPhotos = item.requiredPhotos || 0;

    // Si no se requieren fotos, notificar y avanzar al siguiente ítem
    if (requiredPhotos === 0) {
        showNotification(`El ítem \"${item.name[currentLanguage]}\" no requiere fotos.`, 'info');
        return;
    }
 	// Inicializar el array de fotos si no existe
    if (!currentInspectionData[item.id]) {
        currentInspectionData[item.id] = { photos: [] };
    } else if (!currentInspectionData[item.id].photos) {
        currentInspectionData[item.id].photos = [];
    }

    // Verificar si ya tenemos todas las fotos requeridas
    if (currentInspectionData[item.id].photos.length >= requiredPhotos) {
        showNotification('Ya se han tomado todas las fotos requeridas.', 'warning');
        return;
    }
    // Evitar múltiples aperturas rápidas de la cámara
    if (Date.now() - lastCaptureTime < 1000) {
        console.log('Preventing multiple rapid camera opens');
        return;
    }

    lastCaptureTime = Date.now();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true; // Permitir seleccionar múltiples fotos

    input.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);

        if (!files.length) {
            console.log('No se seleccionaron archivos');
            return;
        }

        // Asegurarse de inicializar el array de fotos
        if (!currentInspectionData[item.id]) {
            currentInspectionData[item.id] = { photos: [] };
        } else if (!Array.isArray(currentInspectionData[item.id].photos)) {
            currentInspectionData[item.id].photos = [];
        }

        for (let file of files) {
            try {
                // Validar el tamaño de la imagen
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('La imagen es demasiado grande. Máximo 10MB.', 'error');
                    continue;
                }

                // Procesar la imagen usando handleImageProcessing
		    const processedImage = await handleImageProcessing(file);
		    if (!processedImage) {
		        showNotification('Error al procesar la imagen', 'error');
		        return;
		    }
                // Guarda la imagen procesada en el ítem actual
                currentInspectionData[item.id].photos.push(processedImage);

                showNotification('Foto procesada y cargada exitosamente.', 'success');

                // Actualiza la vista previa de la foto
                const photoPreview = document.getElementById('photoPreview');
                if (photoPreview) {
                    photoPreview.src = processedImage;
                    photoPreview.style.display = 'block';
                }

            } catch (error) {
                console.error('Error al procesar la imagen:', error);
                showNotification('Error al procesar la imagen.', 'error');
            }
        }

        // Validar si se alcanzó la cantidad de fotos requerida
        const currentPhotos = currentInspectionData[item.id].photos.length;
        if (currentPhotos >= requiredPhotos) {
            showNotification('Se han cargado todas las fotos requeridas.', 'success');
        } else {
            showNotification(
                `Faltan ${requiredPhotos - currentPhotos} fotos.`,
                'warning'
            );
        }
    });

    input.click();
}

async function compressImage(file, maxWidth = 1280, maxHeight = 960, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to WebP if supported
                const mimeType = 'image/webp';
                const compressedImage = canvas.toDataURL(mimeType, quality);
                
                // Clean up
                canvas.width = 0;
                canvas.height = 0;
                URL.revokeObjectURL(img.src);
                resolve(compressedImage);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
function cleanupCharts() {
  const chartIds = ['inspectionTimesChart', 'fleetConditionChart'];
  chartIds.forEach(id => {
    const chart = Chart.getChart(id);
    if (chart) {
      chart.destroy();
    }
  });
}
function cleanupImages() {
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        URL.revokeObjectURL(photoPreview.src);
        photoPreview.src = '';
    }
}
function downloadPDF(index) {
    const records = JSON.parse(localStorage.getItem('inspectionRecords') || '[]');
    const record = records[index];
    
    if (!record) {
        showNotification('Error: Record not found', 'error');
        return;
    }
    
    generateInspectionPDF(record);
}
//Funcion para obtencion de datos para mostrar
async function fetchInspectionRecords(workerId, isAdmin = false) {
  try {
    // Log inicial para depuración
    console.log('Fetching inspections with parameters:', { workerId, isAdmin });

    // Construcción dinámica de la URL con parámetros
    const queryParams = new URLSearchParams();
    if (workerId) queryParams.append('worker_id', workerId);
    if (isAdmin) queryParams.append('isAdmin', 'true');
    const url = `/api/getInspections?${queryParams.toString()}`;

    // Log para verificar la URL final
    console.log('Fetching inspections from URL:', url);

    // Realizar la solicitud al backend
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // Manejo de errores en la respuesta
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.error || 'Failed to fetch inspection records');
    }

    // Parsear los datos devueltos por el backend
    const data = await response.json();
    console.log('Fetched inspection records:', data);

    // Validación del formato de datos recibidos
    if (!data || !Array.isArray(data.inspections)) {
      console.error('Invalid data format received:', data);
      throw new Error('Invalid data format received from backend');
    }

    // Devolver los registros de inspección
    return data.inspections;

  } catch (error) {
    // Manejo centralizado de errores y notificación al usuario
    console.error('Error in fetchInspectionRecords:', error);
    showNotification(
      'Error fetching inspection records. Please try again.',
      'error'
    );
    throw error; // Lanza el error para manejarlo en niveles superiores si es necesario
  }
}

// Function to display records
async function displayRecords(page = 1) {
    const recordsContainer = document.getElementById('recordsContainer');
    if (!recordsContainer) return;

    try {
        // Log del inicio de la función y el parámetro de página
        console.log('Displaying records for page:', page);

        // Validar si el trabajador actual está disponible
        console.log('Current worker state:', currentWorker);
        if (!currentWorker || !currentWorker.id) {
            throw new Error('No worker information available');
        }

        // Mostrar estado de carga
        recordsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // Obtener registros desde el backend o localStorage
        console.log('Fetching inspection records...');
        const records = await fetchInspectionRecords(
            currentWorker.id,
            currentWorker.role === 'admin'
        );
        console.log('Fetched records:', records);

        // Limpiar el estado de carga
        recordsContainer.innerHTML = '';

        // Validar si no hay registros
        if (!records || records.length === 0) {
            console.warn('No inspection records found.');
            recordsContainer.innerHTML = `
                <p class="text-center">
                    <span data-lang="en">No inspection records found.</span>
                    <span data-lang="es">No se encontraron registros de inspección.</span>
                </p>
            `;
            return;
        }

        // Filtrar registros según el rol del usuario
        let filteredRecords = records;
        console.log('Current worker role:', currentWorker.role);
        if (currentWorker.role !== 'admin') {
            filteredRecords = filteredRecords.filter(record =>
                record.worker_id === currentWorker.id || record.worker === currentWorker.name
            );
            console.log('Filtered records for non-admin user:', filteredRecords);
        } else {
            // Manejar búsqueda y filtros para administradores
            console.log('Admin search and filters active...');
            const searchTerm = document.getElementById('recordSearchInput')?.value?.toLowerCase();
            const statusFilter = document.getElementById('recordFilterStatus')?.value;

            if (searchTerm) {
                console.log('Applying search term filter:', searchTerm);
                filteredRecords = filteredRecords.filter(record =>
                    (record.worker?.toLowerCase().includes(searchTerm) ||
                        record.worker_id?.toLowerCase().includes(searchTerm)) ||
                    (record.truckId?.toLowerCase().includes(searchTerm) ||
                        record.truck_id?.toLowerCase().includes(searchTerm))
                );
                console.log('Records after search term filter:', filteredRecords);
            }

            if (statusFilter && statusFilter !== 'all') {
                console.log('Applying status filter:', statusFilter);
                filteredRecords = filteredRecords.filter(record =>
                    (record.status === statusFilter) ||
                    (Object.values(record.data || {}).some(item => item.status === statusFilter))
                );
                console.log('Records after status filter:', filteredRecords);
            }
        }

        // Ordenar registros por fecha (los más recientes primero)
        console.log('Sorting records by date...');
        filteredRecords.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
        console.log('Sorted records:', filteredRecords);

        // Paginación
        const recordsPerPage = 10;
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        const startIndex = (page - 1) * recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);
        console.log(`Paginated records (Page ${page}):`, paginatedRecords);

        // Mostrar mensaje si no hay registros en la página actual
        if (paginatedRecords.length === 0) {
            console.warn('No inspection records found for this page.');
            recordsContainer.innerHTML = `
                <p class="text-center">
                    <span data-lang="en">No inspection records found.</span>
                    <span data-lang="es">No se encontraron registros de inspección.</span>
                </p>
            `;
            return;
        }

        // Renderizar los registros
        console.log('Rendering records...');
        paginatedRecords.forEach((record) => {
            const criticalCount = record.critical_count || Object.values(record.data || {}).filter(item => item.status === 'critical').length;
            const warningCount = record.warning_count || Object.values(record.data || {}).filter(item => item.status === 'warning').length;

            const recordItem = document.createElement('div');
            recordItem.className = 'record-item';

            recordItem.innerHTML = `
                <div class="record-details">
                    <strong>${record.worker || record.worker_id}</strong>
                    <div class="record-metadata">
                        <span class="record-timestamp">${new Date(record.created_at || record.date).toLocaleString()}</span>
                        ${criticalCount > 0 ?
                            `<span class="record-status status-critical">${criticalCount} Critical</span>` :
                            ''}
                        ${warningCount > 0 ?
                            `<span class="record-status status-warning">${warningCount} Warning</span>` :
                            ''}
                    </div>
                    <div>Truck ID: ${record.truckId || record.truck_id}</div>
                </div>
                <div class="record-actions">
                    <button class="btn btn-secondary" onclick="viewRecordDetails('${record.id || record.truckId}')">
                        <span data-lang="en">Details</span>
                        <span data-lang="es">Detalles</span>
                    </button>
                    ${record.pdf_url || record.pdfUrl ?
                        `<a href="${record.pdf_url || record.pdfUrl}" target="_blank" class="btn btn-secondary">PDF</a>` :
                        `<button class="btn btn-secondary" onclick="downloadPDF('${record.id || record.truckId}')">
                            <span data-lang="en">Generate PDF</span>
                            <span data-lang="es">Generar PDF</span>
                        </button>`
                    }
                </div>
            `;

            recordsContainer.appendChild(recordItem);
        });

        // Actualizar controles de paginación
        const pageInfo = document.getElementById('pageInfo');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
        if (prevPage) prevPage.disabled = page === 1;
        if (nextPage) nextPage.disabled = page === totalPages;

        console.log('Pagination updated.');

        // Actualizar idioma
        updateLanguage();
        console.log('Language updated.');

    } catch (error) {
        console.error('Error in displayRecords:', error);
        recordsContainer.innerHTML = `
            <p class="text-center text-error">
                <span data-lang="en">Error loading inspection records.</span>
                <span data-lang="es">Error al cargar los registros de inspección.</span>
            </p>
        `;
        showNotification('Error loading inspection records', 'error');
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize pagination controls
    const searchInput = document.getElementById('recordSearchInput');
    const filterSelect = document.getElementById('recordFilterStatus');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            displayRecords(currentPage);
        }, 300));
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            currentPage = 1;
            displayRecords(currentPage);
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayRecords(currentPage);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const records = filterRecords();
            const totalPages = Math.ceil(records.length / recordsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displayRecords(currentPage);
            }
        });
    }
});
/*document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('recordSearchInput')?.addEventListener('input', 
        debounce(() => displayRecords(1), 300));
    document.getElementById('recordFilterStatus')?.addEventListener('change', 
        () => displayRecords(1));
    document.getElementById('prevPage')?.addEventListener('click', 
        () => displayRecords(--currentPage));
    document.getElementById('nextPage')?.addEventListener('click', 
        () => displayRecords(++currentPage));
});*/

async function resizeImage(file, maxWidth = 1280, maxHeight = 960, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;

                // Draw and compress image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64
                resolve(canvas.toDataURL('image/jpeg', quality));
            };

            img.onerror = () => reject(new Error('Error loading image'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsDataURL(file);
    });
}
//funcion principal de analisis de IA
async function analyzePhotoWithOpenAI(base64Images) {
    console.log('Starting analyzePhotoWithOpenAI function...');

    // Crear y mostrar overlay
    const overlay = document.createElement('div');
    overlay.className = 'processing-overlay';
    overlay.innerHTML = `
        <div class="processing-message">
            <div class="loading-spinner"></div>
            <p>Analyzing photo with AI...</p>
        </div>
    `;
    document.body.appendChild(overlay);

    const item = inspectionItems[currentIndex];

    if (!item) {
        console.error('No current inspection item found!');
        document.body.removeChild(overlay); // Asegurarse de quitar el overlay si hay error
        return 'Error: No current inspection item found';
    }

    const componentName = item.name[currentLanguage];
    console.log('Current inspection item:', JSON.stringify(item, null, 2));
    console.log('Component name:', componentName);
    console.log('Base64 images count:', base64Images.length);

    // Verificar si el ítem no requiere fotos
    if (item.requiredPhotos === 0) {
        console.log(`No photo analysis required for component: ${componentName}`);
        document.body.removeChild(overlay); // Quitar el overlay antes de salir
        return `Component: ${componentName}\nStatus: No photo analysis required`;
    }

    if (!Array.isArray(base64Images) || base64Images.length === 0) {
        console.error('No images provided for analysis');
        document.body.removeChild(overlay); // Quitar el overlay antes de salir
        return `Error: No images provided for analysis for ${componentName}`;
    }

    // Listas predefinidas de estados y problemas
    const validStatuses = [
        "Condición óptima",
        "Leve desgaste",
        "Desgaste moderado",
        "Requiere reparación menor",
        "Requiere reparación urgente",
        "No funcional",
        "Llanta ponchada"
    ];

    const validIssues = [
        "No presenta problemas",
        "Daño cosmético menor",
        "Daño estructural",
        "Problema funcional",
        "Conexión floja",
        "Falta de ajuste adecuado",
        "Acumulación de suciedad",
        "Pérdida total de presión",
        "Objeto punzante visible"
    ];

    try {
        const responses = await Promise.allSettled(
            base64Images.map(async (base64Image, index) => {
                const payload = {
                    prompt: componentName,
                    image: base64Image.split(',')[1], // Base64 sin el prefijo
                };

                console.log(`Payload enviado al backend para imagen ${index + 1}:`, JSON.stringify(payload, null, 2));

                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                console.log(`Response status for image ${index + 1}:`, response.status);

                if (!response.ok) {
                    const errorDetails = await response.text();
                    console.error(`HTTP error for image ${index + 1}:`, response.status, errorDetails);
                    throw new Error(`HTTP error: ${response.status} - ${errorDetails}`);
                }

                const data = await response.json();
                console.log(`Response data for image ${index + 1}:`, JSON.stringify(data, null, 2));

                if (data.refusal) {
                    console.warn(`Refusal for image ${index + 1}:`, data.refusal);
                    return `Refusal for image ${index + 1}: ${data.refusal}`;
                }

                if (data.result?.component && data.result?.status) {
                    const status = data.result.status;
                    const issues = data.result.issues || [];

                    // Validar el estado y los problemas
                    if (!validStatuses.includes(status)) {
                        console.error(`Invalid status received for image ${index + 1}:`, status);
                        return `Error: Invalid status received for image ${index + 1}`;
                    }

                    const invalidIssues = issues.filter(issue => !validIssues.includes(issue));
                    if (invalidIssues.length > 0) {
                        console.error(`Invalid issues received for image ${index + 1}:`, invalidIssues);
                        return `Error: Invalid issues received for image ${index + 1}`;
                    }

                    return `Component: ${data.result.component}\nStatus: ${status}\nIssues: ${issues.join(', ') || 'Ninguno'}`;
                } else {
                    console.error(`Invalid response format for image ${index + 1}:`, JSON.stringify(data, null, 2));
                    return `Error: Invalid response format for image ${index + 1}`;
                }
            })
        );

        const processedResponses = responses.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Error processing image ${index + 1}:`, result.reason);
                return `Error processing image ${index + 1}: ${result.reason.message}`;
            }
        });

        console.log('All responses processed:', JSON.stringify(processedResponses, null, 2));
        return processedResponses.join('\n');
    } catch (error) {
        console.error('Unexpected error analyzing photos:', error);
        return 'Error analyzing photos';
    } finally {
        // Quitar el overlay cuando termine el proceso
        document.body.removeChild(overlay);
    }
}

/*async function analyzePhotoWithOpenAI(base64Images) {
    console.log('Starting analyzePhotoWithOpenAI function...');

    const item = inspectionItems[currentIndex];

    if (!item) {
        console.error('No current inspection item found!');
        return 'Error: No current inspection item found';
    }

    const componentName = item.name[currentLanguage];
    console.log('Current inspection item:', JSON.stringify(item, null, 2));
    console.log('Component name:', componentName);
    console.log('Base64 images count:', base64Images.length);

    // Verificar si el ítem no requiere fotos
    if (item.requiredPhotos === 0) {
        console.log(`No photo analysis required for component: ${componentName}`);
        return `Component: ${componentName}\nStatus: No photo analysis required`;
    }

    if (!Array.isArray(base64Images) || base64Images.length === 0) {
        console.error('No images provided for analysis');
        return `Error: No images provided for analysis for ${componentName}`;
    }

    // Listas predefinidas de estados y problemas
	const validStatuses = [
	    "Condición óptima",
	    "Leve desgaste",
	    "Desgaste moderado",
	    "Requiere reparación menor",
	    "Requiere reparación urgente",
	    "No funcional",
	    "Llanta ponchada"
	];
	
	const validIssues = [
	    "No presenta problemas",
	    "Daño cosmético menor",
	    "Daño estructural",
	    "Problema funcional",
	    "Conexión floja",
	    "Falta de ajuste adecuado",
	    "Acumulación de suciedad",
	    "Pérdida total de presión",
	    "Objeto punzante visible"
	];

    try {
        const responses = await Promise.allSettled(
            base64Images.map(async (base64Image, index) => {
                const payload = {
                    prompt: componentName,
                    image: base64Image.split(',')[1], // Base64 sin el prefijo
                };

                console.log(`Payload enviado al backend para imagen ${index + 1}:`, JSON.stringify(payload, null, 2));

                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                console.log(`Response status for image ${index + 1}:`, response.status);

                if (!response.ok) {
                    const errorDetails = await response.text();
                    console.error(`HTTP error for image ${index + 1}:`, response.status, errorDetails);
                    throw new Error(`HTTP error: ${response.status} - ${errorDetails}`);
                }

                const data = await response.json();
                console.log(`Response data for image ${index + 1}:`, JSON.stringify(data, null, 2));

                if (data.refusal) {
                    console.warn(`Refusal for image ${index + 1}:`, data.refusal);
                    return `Refusal for image ${index + 1}: ${data.refusal}`;
                }

                if (data.result?.component && data.result?.status) {
                    const status = data.result.status;
                    const issues = data.result.issues || [];

                    // Validar el estado y los problemas
                    if (!validStatuses.includes(status)) {
                        console.error(`Invalid status received for image ${index + 1}:`, status);
                        return `Error: Invalid status received for image ${index + 1}`;
                    }

                    const invalidIssues = issues.filter(issue => !validIssues.includes(issue));
                    if (invalidIssues.length > 0) {
                        console.error(`Invalid issues received for image ${index + 1}:`, invalidIssues);
                        return `Error: Invalid issues received for image ${index + 1}`;
                    }

                    return `Component: ${data.result.component}\nStatus: ${status}\nIssues: ${issues.join(', ') || 'Ninguno'}`;
                } else {
                    console.error(`Invalid response format for image ${index + 1}:`, JSON.stringify(data, null, 2));
                    return `Error: Invalid response format for image ${index + 1}`;
                }
            })
        );

        const processedResponses = responses.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Error processing image ${index + 1}:`, result.reason);
                return `Error processing image ${index + 1}: ${result.reason.message}`;
            }
        });

        console.log('All responses processed:', JSON.stringify(processedResponses, null, 2));
        return processedResponses.join('\n');
    } catch (error) {
        console.error('Unexpected error analyzing photos:', error);
        return 'Error analyzing photos';
    }
}*/

// Admin Dashboard Functions
function showAdminDashboard() {
    try {
        // Validar el rol del usuario antes de mostrar el dashboard
        if (!currentWorker || currentWorker.role !== 'admin') {
            showNotification('Access denied. Admins only.', 'error');
            return;
        }

        // Mostrar la pantalla del administrador
        showScreen('adminScreen');

        // Mostrar el botón del menú si está oculto
        const menuToggleBtn = document.getElementById('menuToggleBtn');
        if (menuToggleBtn) {
            menuToggleBtn.style.display = 'block';
        }

        // Actualizar estadísticas y datos recientes
        updateAdminStats();
        updateRecentInspections();

        // Mostrar notificación de bienvenida
        showNotification(`Welcome back, ${currentWorker.name}!`, 'success');
    } catch (error) {
        console.error('Error showing admin dashboard:', error);
        showNotification('An error occurred while loading the admin dashboard.', 'error');
    }
}

function updateAdminStats() {
    if (!window.records) window.records = [];
    
    const stats = {
        totalInspections: window.records.length,
        criticalCount: 0,
        activeVehicles: new Set()
    };

    window.records.forEach(record => {
        stats.activeVehicles.add(record.truckId);
        
        const hasCritical = Object.values(record.data).some(
            item => item.status === 'critical'
        );
        if (hasCritical) stats.criticalCount++;
    });

    // Update UI
    document.getElementById('totalInspections').textContent = stats.totalInspections;
    document.getElementById('criticalIssues').textContent = stats.criticalCount;
    document.getElementById('activeVehicles').textContent = stats.activeVehicles.size;
}

function updateRecentInspections() {
    const tableBody = document.getElementById('recentInspectionsTable');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const recentInspections = window.records?.slice(-5).reverse() || [];

    recentInspections.forEach(inspection => {
        const hasCritical = Object.values(inspection.data).some(
            item => item.status === 'critical'
        );
        const hasWarning = Object.values(inspection.data).some(
            item => item.status === 'warning'
        );
        
        const status = hasCritical ? 'Critical' : hasWarning ? 'Warning' : 'OK';
        const statusColor = hasCritical ? '#ef4444' : hasWarning ? '#f59e0b' : '#10b981';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${inspection.date}</td>
            <td>${inspection.worker}</td>
            <td>${inspection.truckId}</td>
            <td><span style="color: ${statusColor}; font-weight: bold;">${status}</span></td>
            <td>
                <button class="btn" onclick="viewInspectionDetails('${inspection.truckId}')">
                    View Details
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// User Management Functions
async function showUserManagement() {
    toggleSidebar();
    showScreen('userManagementScreen');
    await displayUsers();
}
/*function showUserManagement() {
    toggleSidebar();
    showScreen('userManagementScreen');
    displayUsers();
}*/
//funcion de pantalla de metricas que se limpia
function showMetrics() {
    cleanupCharts(); // Add this line
    toggleSidebar();
    showScreen('metricsScreen');
    updateMetricsDisplay();
    console.log('Metrics screen shown and charts initialized');
}
//ver los detalles de los registros
function viewRecordDetails(recordId) {
    try {
        console.log('Viewing details for record:', recordId);
        // For now, just show an alert with the record ID
        showNotification(`Viewing details for inspection ${recordId}`, 'info');
        // TODO: Implement detailed view modal or screen
    } catch (error) {
        console.error('Error viewing record details:', error);
        showNotification('Error viewing record details', 'error');
    }
}
//Funcion para ver los usuarios dentro de admin
async function displayUsers() {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;
    
    try {
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';
        
        // Fetch workers from Supabase
        const response = await fetch('/api/getWorkers');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.workers) {
            throw new Error('No workers data received');
        }
        
        // Clear loading state
        tableBody.innerHTML = '';
        
        // Display workers
        data.workers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id || ''}</td>
                <td>${user.name || ''}</td>
                <td>${user.role || ''}</td>
                <td>${formatDateTime(user.last_activity) || 'No activity'}</td>
                <td><span class="status-badge ${user.status}">${user.status || 'inactive'}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="editUser('${user.id}')">Edit</button>
                    <button class="btn btn-secondary" onclick="toggleUserStatus('${user.id}')">
                        ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching workers:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-error">
                    Error loading users. Please try again.
                </td>
            </tr>
        `;
        showNotification('Error loading users', 'error');
    }
}

// Add this helper function for date formatting
function formatDateTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
}
/*async function displayUsers() {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;
    
    try {
        // Fetch workers from Supabase
        const response = await fetch('/api/getWorkers');
        const data = await response.json();
        
        if (!data.workers) {
            throw new Error('No workers data received');
        }
        
        workers = data.workers.reduce((acc, worker) => {
            acc[worker.id] = worker;
            return acc;
        }, {});
        
        tableBody.innerHTML = '';
        
        Object.entries(workers).forEach(([id, user]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.role}</td>
                <td>${user.last_activity || 'No activity'}</td>
                <td>${user.status}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editUser('${id}')">Edit</button>
                    <button class="btn btn-secondary" onclick="toggleUserStatus('${id}')">
                        ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching workers:', error);
        showNotification('Error loading users', 'error');
    }
}*/
/*function displayUsers() {
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    Object.entries(workers).forEach(([id, user]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.role}</td>
            <td>${user.lastActivity || 'No activity'}</td>
            <td>${user.status}</td>
            <td>
                <button class="btn btn-secondary" onclick="editUser('${id}')">Edit</button>
                <button class="btn btn-secondary" onclick="toggleUserStatus('${id}')">
                    ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}*/
function updateMetricsDisplay() {
    // Get all inspection records
    const records = JSON.parse(localStorage.getItem('inspectionRecords') || '[]');
    const fleetConditions = records.map(record => record.overallCondition?.score || 0);
    //calculate average overallcondition
    const averageCondition = fleetConditions.length > 0
    ? fleetConditions.reduce((acc, curr) => acc + curr, 0) / fleetConditions.length
    : 0;
    // Calculate average inspection time
    const timesWithDuration = records.filter(record => record.duration);
    const averageTime = timesWithDuration.length > 0
        ? timesWithDuration.reduce((acc, curr) => acc + curr.duration, 0) / timesWithDuration.length
        : 0;
        
    // Calculate times by inspector
    const inspectorTimes = {};
    timesWithDuration.forEach(record => {
        if (!inspectorTimes[record.worker]) {
            inspectorTimes[record.worker] = [];
        }
        inspectorTimes[record.worker].push(record.duration);
    });

    // Format time for display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Update the average time card
    const averageTimeDisplay = document.getElementById('averageTimeValue');
    if (averageTimeDisplay) {
        averageTimeDisplay.textContent = formatTime(averageTime);
    }
     // Update the overall condition card
    const fleetConditionDisplay = document.getElementById('fleetConditionValue');
    if (fleetConditionDisplay) {
    fleetConditionDisplay.textContent = `${averageCondition.toFixed(1)}%`;
    }
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart('inspectionTimesChart');
    if (existingChart) {
        existingChart.destroy();
    }

    // Create data for the chart
    const chartData = Object.entries(inspectorTimes).map(([inspector, times]) => ({
        inspector,
        averageTime: times.reduce((acc, curr) => acc + curr, 0) / times.length
    }));
    
    // Update the chart
    const ctx = document.getElementById('inspectionTimesChart');
    if (ctx && window.Chart) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => d.inspector),
                datasets: [{
                    label: 'Average Inspection Time (seconds)',
                    data: chartData.map(d => d.averageTime),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        }
                    }
                }
            }
        });
    }
    // Create fleet condition chart
    const fleetCtx = document.getElementById('fleetConditionChart');
	if (fleetCtx && window.Chart) {
	    new Chart(fleetCtx, {
	        type: 'line',
	        data: {
	            labels: records.map(r => new Date(r.date).toLocaleDateString()),
	            datasets: [{
	                label: 'Vehicle Condition %',
	                data: fleetConditions,
	                borderColor: '#3b82f6',
	                tension: 0.1
	            }]
	        },
	        options: {
	            responsive: true,
	            scales: {
	                y: {
	                    beginAtZero: true,
	                    max: 100
	                }
	            }
	        }
	    });
	  }

}
//funcion para mostrar y seleccionar los records basandome en el usuario
async function displayRecords(page = 1) {
    const recordsContainer = document.getElementById('recordsContainer');
    if (!recordsContainer) return;

    try {
        // Mostrar estado de carga
        recordsContainer.innerHTML = '<div class="loading-spinner"></div>';

        // Obtener registros desde la base de datos o localStorage según sea necesario
        let records = await fetchInspectionRecords?.() || JSON.parse(localStorage.getItem('inspectionRecords') || '[]');

        // Filtrar registros según el rol del usuario
        let filteredRecords = records;

        if (currentWorker.role === 'admin') {
            // Si es admin, permitir filtro manual por worker_id o mostrar todos los registros
            const workerFilter = document.getElementById('workerFilterInput')?.value.trim();

            if (workerFilter) {
                filteredRecords = filteredRecords.filter(record => record.worker_id === workerFilter);
            }
        } else {
            // Si no es admin, filtrar solo por el worker_id actual
            filteredRecords = filteredRecords.filter(record => record.worker_id === currentWorker.id);
        }

        // Manejar búsqueda y filtros (solo para vista admin)
        if (currentWorker.role === 'admin') {
            const searchTerm = document.getElementById('recordSearchInput')?.value?.toLowerCase();
            const statusFilter = document.getElementById('recordFilterStatus')?.value;

            if (searchTerm) {
                filteredRecords = filteredRecords.filter(record => 
                    (record.worker?.toLowerCase().includes(searchTerm) ||
                    record.worker_id?.toLowerCase().includes(searchTerm)) ||
                    (record.truckId?.toLowerCase().includes(searchTerm) ||
                    record.truck_id?.toLowerCase().includes(searchTerm))
                );
            }

            if (statusFilter && statusFilter !== 'all') {
                filteredRecords = filteredRecords.filter(record => 
                    (record.status === statusFilter) ||
                    (Object.values(record.data || {}).some(item => item.status === statusFilter))
                );
            }
        }

        // Ordenar registros por fecha (los más recientes primero)
        filteredRecords.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

        // Paginación
        const recordsPerPage = 10;
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        const startIndex = (page - 1) * recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);

        // Limpiar el estado de carga
        recordsContainer.innerHTML = '';

        // Mostrar mensaje si no hay registros
        if (paginatedRecords.length === 0) {
            recordsContainer.innerHTML = `
                <p class="text-center">
                    <span data-lang="en">No inspection records found.</span>
                    <span data-lang="es">No se encontraron registros de inspección.</span>
                </p>
            `;
            return;
        }

        // Renderizar los registros
        paginatedRecords.forEach((record) => {
            const criticalCount = record.critical_count || Object.values(record.data || {}).filter(item => item.status === 'critical').length;
            const warningCount = record.warning_count || Object.values(record.data || {}).filter(item => item.status === 'warning').length;

            const recordItem = document.createElement('div');
            recordItem.className = 'record-item';

            recordItem.innerHTML = `
                <div class="record-details">
                    <strong>${record.worker || record.worker_id}</strong>
                    <div class="record-metadata">
                        <span class="record-timestamp">${new Date(record.created_at || record.date).toLocaleString()}</span>
                        ${criticalCount > 0 ? 
                            `<span class="record-status status-critical">${criticalCount} Critical</span>` : 
                            ''}
                        ${warningCount > 0 ? 
                            `<span class="record-status status-warning">${warningCount} Warning</span>` : 
                            ''}
                    </div>
                    <div>Truck ID: ${record.truckId || record.truck_id}</div>
                </div>
                <div class="record-actions">
                    <button class="btn btn-secondary" onclick="viewRecordDetails('${record.id || record.truckId}')">
                        <span data-lang="en">Details</span>
                        <span data-lang="es">Detalles</span>
                    </button>
                    ${record.pdf_url || record.pdfUrl ? 
                        `<a href="${record.pdf_url || record.pdfUrl}" target="_blank" class="btn btn-secondary">PDF</a>` : 
                        `<button class="btn btn-secondary" onclick="downloadPDF('${record.id || record.truckId}')">
                            <span data-lang="en">Generate PDF</span>
                            <span data-lang="es">Generar PDF</span>
                        </button>`
                    }
                </div>
            `;

            recordsContainer.appendChild(recordItem);
        });

        // Actualizar controles de paginación
        const pageInfo = document.getElementById('pageInfo');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
        if (prevPage) prevPage.disabled = page === 1;
        if (nextPage) nextPage.disabled = page === totalPages;

        // Actualizar idioma
        updateLanguage();

    } catch (error) {
        console.error('Error displaying records:', error);
        recordsContainer.innerHTML = `
            <p class="text-center text-error">
                <span data-lang="en">Error loading inspection records.</span>
                <span data-lang="es">Error al cargar los registros de inspección.</span>
            </p>
        `;
        showNotification('Error loading inspection records', 'error');
    }
}
function showAddUserForm() {
    const userModal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const userForm = document.getElementById('userForm');
    
    modalTitle.textContent = 'Add User';
    userForm.reset();
    userModal.style.display = 'block';
}

function editUser(userId) {
    const user = workers[userId];
    if (!user) return;

    const elements = {
        modal: document.getElementById('userModal'),
        title: document.getElementById('modalTitle'),
        id: document.getElementById('userId'),
        name: document.getElementById('userName'),
        role: document.getElementById('userRole'),
        password: document.getElementById('userPassword')
    };

    elements.title.textContent = 'Edit User';
    elements.id.value = user.id;
    elements.name.value = user.name;
    elements.role.value = user.role;
    elements.password.value = user.password;
    elements.modal.style.display = 'block';
}
//Funcion para crear usuarios a la base de datos
async function handleUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        const userData = {
            id: form.userId.value,
            name: form.userName.value,
            email: form.userEmail.value,
            password_hash: form.userPassword.value,
            role: form.userRole.value
        };

        // Log the request for debugging
        console.log('Sending request to:', '/api/createWorker');
        console.log('User data:', userData);

        const response = await fetch('/api/createWorker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        // Log the response for debugging
        console.log('Response status:', response.status);
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create user');
        }

        closeUserModal();
        await displayUsers();
        showNotification('User created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(
            'Failed to create user. Please try again or contact support.', 
            'error'
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save';
    }
}
/*async function handleUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Saving...';
        
        const userData = {
            id: form.userId.value,
            name: form.userName.value,
            email: form.userEmail.value,
            password_hash: form.userPassword.value,
            role: form.userRole.value
        };

        const response = await fetch('/api/createWorker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        const data = await response.json();
        
        closeUserModal();
        await displayUsers(); // Refresh the users list
        showNotification('User created successfully', 'success');
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(error.message, 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = 'Save';
    }
}*/
/*function handleUserSubmit(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const userData = {
        id: userId,
        name: document.getElementById('userName').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value,
        status: 'active',
        lastActivity: new Date().toLocaleString()
    };

    workers[userId] = userData;
    closeUserModal();
    displayUsers();
    showNotification('User saved successfully', 'success');
}*/

function toggleUserStatus(userId) {
    if (!workers[userId]) return;
    
    workers[userId].status = workers[userId].status === 'active' ? 'inactive' : 'active';
    displayUsers();
    showNotification(
        `User ${workers[userId].status === 'active' ? 'activated' : 'deactivated'} successfully`,
        'success'
    );
}

function closeUserModal() {
    const userModal = document.getElementById('userModal');
    if (userModal) userModal.style.display = 'none';
}

// Sidebar Management
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('open');
    
    const menuBtn = document.getElementById('menuToggleBtn');
    if (menuBtn) {
        menuBtn.innerHTML = sidebar.classList.contains('open') ? '✕' : '☰';
    }
}
// Utility Functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('customNotification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `custom-notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
// New function for handling back to login
function backToLogin() {
    if (confirm('Are you sure you want to logout?')) {
        currentWorker = null;
        // Hide admin menu
        const menuBtn = document.getElementById('menuToggleBtn');
        const sidebar = document.getElementById('adminSidebar');
        if (menuBtn) menuBtn.style.display = 'none';
        if (sidebar) sidebar.classList.remove('open');
        
        // Reset any open screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Show login screen
        showScreen('loginScreen');
        
        // Clear any stored data
        localStorage.removeItem('currentWorker');
    }
}
// Initialize records screen events
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('recordSearchInput');
    const filterSelect = document.getElementById('recordFilterStatus');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            displayRecords(currentPage);
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            currentPage = 1;
            displayRecords(currentPage);
        });
    }
    
    // Initialize pagination buttons
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayRecords(currentPage);
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', () => {
        const records = filterRecords();
        const totalPages = Math.ceil(records.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayRecords(currentPage);
        }
    });
});
function showInspectionRecords() {
    // First toggle the sidebar
    toggleSidebar();
    
    // Show the records screen
    showScreen('recordsScreen');
    
    // Reset to first page
    currentPage = 1;
    
    // Display the records
    displayRecords(currentPage);
    
    // Initialize any filters to default state
    const searchInput = document.getElementById('recordSearchInput');
    const filterSelect = document.getElementById('recordFilterStatus');
    if (searchInput) searchInput.value = '';
    if (filterSelect) filterSelect.value = 'all';
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function validateInputs() {
    const workerId = document.getElementById('workerId').value.trim();
    const password = document.getElementById('workerPassword').value.trim();

    const workerIdPattern = /^\d{4,6}$/;
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/;

    if (!workerIdPattern.test(workerId)) {
        showNotification('Worker ID must contain 4-6 digits', 'error');
        return false;
    }

    if (!passwordPattern.test(password)) {
        showNotification('Password must contain letters and numbers, 6-12 characters', 'error');
        return false;
    }

    return true;
}
//funcion para los filtros de pagina de administrador
function filterRecords() {
    let filteredRecords = [];
    
    try {
        // Get all records
        const records = JSON.parse(localStorage.getItem('inspectionRecords') || '[]');
        
        // Get filter values
        const searchTerm = document.getElementById('recordSearchInput')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('recordFilterStatus')?.value || 'all';
        
        // Apply filters
        filteredRecords = records.filter(record => {
            // Search filter
            const searchMatch = 
                record.worker?.toLowerCase().includes(searchTerm) ||
                record.truckId?.toLowerCase().includes(searchTerm) ||
                record.worker_id?.toLowerCase().includes(searchTerm);
                
            // Status filter
            let statusMatch = true;
            if (statusFilter !== 'all') {
                statusMatch = record.dynamic_status === statusFilter;
            }
            
            return searchMatch && statusMatch;
        });
        
        return filteredRecords;
    } catch (error) {
        console.error('Error filtering records:', error);
        return [];
    }
}
// Mobile Optimization Functions
function initializeMobileOptimizations() {
    setupTouchHandling();
    fixIOSIssues();
    handleOrientationChanges();
    setupScrolling();
}

function setupTouchHandling() {
    // Remove the existing event listeners for buttons, inputs, and selects
    document.querySelectorAll('button').forEach(element => {
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            element.click();
        });
    });

    // Add passive touch handlers
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
}

function fixIOSIssues() {
    // Fix input zoom
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }

    // Fix iOS input focus
    document.addEventListener('focus', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            document.body.scrollTop = 0;
        }
    }, true);
}

function handleOrientationChanges() {
    window.addEventListener('orientationchange', () => {
        // Reset scroll position
        window.scrollTo(0, 0);
        
        // Update viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Recalculate layouts after orientation change
        setTimeout(() => {
            updateScreenForMobile(
                document.querySelector('.screen.active')?.id
            );
        }, 300);
    });
}

function setupScrolling() {
    // Enable smooth scrolling
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.overflow = 'auto';
        screen.style.webkitOverflowScrolling = 'touch';
        screen.addEventListener('scroll', handleScroll);
    });
}

function handleScroll(e) {
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return;

    const scrollHeight = e.target.scrollHeight;
    const scrollTop = e.target.scrollTop;
    const clientHeight = e.target.clientHeight;

    // Show/hide navigation based on scroll position
    navButtons.classList.toggle(
        'nav-buttons-visible',
        scrollHeight - scrollTop === clientHeight
    );
}

// Error Handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification('An error occurred. Please try again.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('Operation failed. Please try again.', 'error');
});

// Cache Management
const CacheManager = {
    set: async (key, data, expiry = 3600) => {
        try {
            const item = {
                data,
                timestamp: Date.now(),
                expiry
            };
            await localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    },
    
    get: async (key) => {
        try {
            const item = JSON.parse(await localStorage.getItem(key));
            if (!item) return null;
            
            if (Date.now() - item.timestamp > item.expiry * 1000) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
};
document.addEventListener('DOMContentLoaded', function() {
    // Initialize buttons
    initializeStatusButtons();
    initializeLoginButtons();
    initializeScrollBehavior();
    updateLanguage();
    setupEventListeners();
});
function initializeScrollBehavior() {
    // Add scroll lock to login screen
    const loginScreen = document.getElementById('loginScreen');
    
    if (loginScreen && loginScreen.style.display === 'block') {
        document.body.classList.add('login-screen');
    }
    
    // Remove scroll lock when moving to other screens
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', () => {
            document.body.classList.remove('login-screen');
        });
    });
    
    // Re-add scroll lock when returning to login
    if (typeof backToLogin === 'function') {
        const originalBackToLogin = backToLogin;
        backToLogin = function() {
            originalBackToLogin();
            document.body.classList.add('login-screen');
        };
    }
}
/*function initializeScrollBehavior() {
    // Add scroll lock to login screen
    const loginScreen = document.getElementById('loginScreen');
    
    if (loginScreen && loginScreen.style.display === 'block') {
        document.body.classList.add('login-screen');
    }
    
    // Remove scroll lock when moving to other screens
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', () => {
            document.body.classList.remove('login-screen');
        });
    });
    
    // Re-add scroll lock when returning to login
    if (typeof backToLogin === 'function') {
        const originalBackToLogin = backToLogin;
        backToLogin = function() {
            originalBackToLogin();
            document.body.classList.add('login-screen');
        };
    }
}*/
/*function initializeScrollBehavior() {
    if (window.innerWidth <= 768) {  // Mobile devices
        document.body.classList.add('login-screen');
        
        // Remove the class when moving to other screens
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', () => {
                document.body.classList.remove('login-screen');
            });
        });
    }
}*/
//error handler
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    showNotification(`Error: ${error.message}`, 'error');
}
//funcion de filtro para la pantalla de admin
function filterUsers() {
  console.log("filterUsers function called. Functionality to be implemented.");
  // Aquí agregarás la lógica para filtrar usuarios en el futuro
}

// Export functions to window
Object.assign(window, {
    login,
    startDemoMode,
    showScreen,
    startInspection,
    previousItem,
    nextItem,
    openCamera,
    toggleLanguage,
    toggleTheme,
    showUserManagement,
    toggleSidebar
});
