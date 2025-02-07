// Core Variables
const MAX_PHOTOS_PER_ITEM = 3;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const recordsPerPage = 10;


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

//Declarada al inicio para evitar errores
//Funcion para el manejo de las fotos y optimizacion
function cleanupMemory() {
    // Cleanup image data
    if (currentInspectionData[inspectionItems[currentIndex]?.id]?.photos) {
        currentInspectionData[inspectionItems[currentIndex].id].photos = 
            currentInspectionData[inspectionItems[currentIndex].id].photos.slice(-1);
    }
    
    // Release old image URLs
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview?.src) {
        URL.revokeObjectURL(photoPreview.src);
        photoPreview.src = '';
    }
    
    // Clear any cached data
    if (window.records?.length > 50) {
        window.records = window.records.slice(-50);
    }
    
    // Force garbage collection hint
    if (window.gc) window.gc();
}

// Your image processing functions
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

        // Process and compress the image with smaller dimensions
        const processedImage = await compressImage(file, 800, 600, 0.6);

        // Clean up old preview if it exists
        if (photoPreview?.src) {
            URL.revokeObjectURL(photoPreview.src);
        }

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
function updatePhotoPreview(photoUrl) {
    const photoPreview = document.getElementById('photoPreview');
    if (!photoPreview) return;

    // Clean up old preview
    if (photoPreview.src) {
        URL.revokeObjectURL(photoPreview.src);
    }

    photoPreview.src = photoUrl;
    photoPreview.style.display = 'block';
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
        requiredPhotos: 2  // Se requieren 2 fotos (espejo izquierdo y derecho)
    },
    { 
        id: 'license_plates', 
        name: { en: 'License Plates', es: 'Placas Delantera y Trasera' }, 
        icon: '🔖', 
        description: { 
            en: 'Confirm that both plates are securely attached and clearly visible.', 
            es: 'Confirme que ambas placas estén firmemente sujetas y sean claramente visibles.' 
        },
        requiredPhotos: 2  // Se requieren 2 fotos (placa delantera y trasera)
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
        requiredPhotos: 2  // Se requieren 3 fotos (lateral izquierdo, derecho y frontal)
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
        requiredPhotos: 2  // Se requieren 2 fotos (lado izquierdo y derecho)
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
	document.body.classList.add('logged-in');
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
//funcion para actualizar la pantalla de inspeccion
function updateInspectionDisplay() {
    const item = inspectionItems[currentIndex];
    if (!item) {
        console.error('Invalid inspection index');
        return;
    }

    // Recuperar datos actuales del ítem o establecer valores por defecto
    const currentData = currentInspectionData[item.id] || { comment: '', photos: [], status: null, overallCondition: null };

    // Actualizar elementos de la UI
    document.getElementById('currentName').textContent = `${item.icon} ${item.name[currentLanguage]}`;
    document.getElementById('currentDescription').textContent = item.description[currentLanguage];

    // Actualizar caja de comentarios
    const commentBox = document.getElementById('commentBox');
    if (commentBox) {
        commentBox.value = currentData.comment || '';
    }

    updateCharCount();

    // Limpiar el contenedor de fotos antes de actualizarlo
    const photoContainer = document.getElementById('photoPreviewContainer');
    if (photoContainer) {
        photoContainer.innerHTML = ''; // Borra todas las fotos previas
    }

    // Mostrar vista previa de la última foto si hay fotos disponibles
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) {
        photoPreview.src = '';
        photoPreview.style.display = 'none';

        if (currentData.photos && currentData.photos.length > 0) {
            photoPreview.src = currentData.photos[currentData.photos.length - 1];
            photoPreview.style.display = 'block';
        }
    }

    // Mostrar todas las fotos del ítem actual
    updatePhotoPreview(item.id);

    // Resetear botones de estado
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    currentItemStatus = null;
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
/*funcion para seleccionar y guardar el boton de estado*/
function setItemStatus(status) {
    // Set the current status
    currentItemStatus = status;

    // Get all status buttons and the clicked one
    const buttons = document.querySelectorAll('.status-btn');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-status') === status) {
            button.classList.add('active');
        }
    });

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
    validateNextButton();
}
/*funcion para verificar los requerimientos*/
function checkRequirements() {
    const item = inspectionItems[currentIndex];
    const currentData = currentInspectionData[item.id] || {};
    const comment = document.getElementById('commentBox')?.value || '';
    const photoCount = currentData.photos?.length || 0;
    const requiredPhotos = item.requiredPhotos || 0;
    const status = currentData.status;

    let missingItems = [];

    if (!status) {
        missingItems.push('Select a status (OK/Warning/Critical)');
    }
    if (comment.length < 30) {
        missingItems.push('Add a comment (minimum 30 characters)');
    }
    if (photoCount < requiredPhotos) {
        missingItems.push(`Take ${requiredPhotos - photoCount} more photo${requiredPhotos - photoCount > 1 ? 's' : ''}`);
    }

    if (missingItems.length > 0) {
        showNotification('Missing requirements:\n' + missingItems.join('\n'), 'warning');
        return false;
    }

    return true;
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
//funcion para el siguiente item en la lista
async function nextItem() {
    console.log('nextItem fue llamado');
    if (!checkRequirements()) {
        return;
    }

    const item = inspectionItems[currentIndex];
    const requiredPhotos = item.requiredPhotos ?? 1;
    const currentPhotos = currentInspectionData[item.id]?.photos || [];
    const comment = document.getElementById('commentBox')?.value.trim() || '';

    if (requiredPhotos === 0) {
        console.log(`El ítem "${item.name[currentLanguage]}" no requiere fotos, avanzando...`);
        currentInspectionData[item.id] = {
            ...currentInspectionData[item.id],
            comment: comment,
            status: 'No requiere evaluación',
            issues: [],
            aiComment: 'No se requiere análisis de IA para este ítem.'
        };
        cleanupMemory();
        advanceToNextItem();
        return;
    }

    if (currentPhotos.length < requiredPhotos) {
        const missingPhotos = requiredPhotos - currentPhotos.length;
        showNotification(`Faltan ${missingPhotos} fotos para completar este ítem.`, 'error');
        return;
    }

    // 🔹 Obtener análisis de OpenAI
    try {
        showNotification('Analizando imágenes con OpenAI...', 'info');
        const aiResults = await analyzePhotoWithOpenAI(currentPhotos, item.name.es);

        console.log(`Resultados de IA para ${item.name[currentLanguage]}:`, aiResults);

        currentInspectionData[item.id] = {
            ...currentInspectionData[item.id],
            comment: comment,
            status: aiResults[0]?.status || 'No determinado',
            issues: aiResults[0]?.issues || [],
            aiComment: aiResults[0]?.details || 'No se pudo obtener información de IA.',
            timestamp: new Date().toISOString()
        };

        showNotification('Análisis de OpenAI completado.');
    } catch (error) {
        console.error('Error al procesar con OpenAI:', error);
        showNotification('Error al procesar las imágenes con OpenAI.', 'error');
        currentInspectionData[item.id].aiComment = 'Error al procesar las imágenes con OpenAI.';
    }

    // Avanzar al siguiente ítem
    advanceToNextItem();
}



function advanceToNextItem() {
    if (currentIndex < inspectionItems.length - 1) {
        console.log('Avanzando al siguiente ítem.');
        currentIndex++;
        updateInspectionDisplay();
        updateProgressBar();
        currentItemStatus = null; // Resetear el estado para el siguiente ítem

        // Verificar si el elemento photoPreview existe antes de modificarlo
        const photoPreview = document.getElementById('photoPreview');
        if (photoPreview) {
            photoPreview.style.display = 'none'; 
            photoPreview.src = ''; 
        }

        // Verificar si el contenedor de imágenes existe y limpiarlo
        const photoContainer = document.getElementById('photoPreviewContainer');
        if (photoContainer) {
            photoContainer.innerHTML = ''; // Limpiar imágenes previas
        }

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
//funcion para generar el PDF
async function generateInspectionPDF(inspection) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        console.error('PDF generation library not loaded');
        return null;
    }

    try {
        const doc = new jsPDF();
        let y = 40;

        // Header with company logo and title
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('FleetGuard Inspection Report', 20, 20);

        // Basic inspection information
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        const basicInfo = [
            `Inspector: ${inspection.worker}`,
            `Vehicle ID: ${inspection.truckId}`,
            `Date: ${new Date(inspection.start_time).toLocaleString()}`,
            `Duration: ${Math.round(inspection.duration / 60)} minutes`,
            `Overall Condition: ${inspection.overall_condition}%`,
            `Critical Issues: ${inspection.critical_count}`,
            `Warnings: ${inspection.warning_count}`
        ];

        basicInfo.forEach(info => {
            doc.text(info, 20, y);
            y += 10;
        });

        // Inspection Items
        Object.entries(inspection.data).forEach(([itemId, itemData]) => {
            const item = inspectionItems.find(i => i.id === itemId);
            if (!item) return;

            // Check if we need a new page
            if (y > doc.internal.pageSize.getHeight() - 60) {
                doc.addPage();
                y = 20;
            }

            y += 15;
            
            // Item header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${item.name[currentLanguage]}`, 20, y);
            y += 10;

            // Status and condition
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            const statusColor = 
                itemData.status === 'critical' ? '#ef4444' : 
                itemData.status === 'warning' ? '#f59e0b' : '#10b981';
            doc.setTextColor(...hexToRGB(statusColor));
            doc.text(`Status: ${itemData.status.toUpperCase()}`, 20, y);
            doc.setTextColor(0, 0, 0);
            y += 10;

            // AI Analysis
            if (itemData.aiComment) {
                doc.setFont('helvetica', 'italic');
                const aiLines = doc.splitTextToSize(`AI Analysis: ${itemData.aiComment}`, 170);
                doc.text(aiLines, 20, y);
                y += aiLines.length * 6;
            }

            // Issues
            if (itemData.issues && itemData.issues.length > 0) {
                y += 5;
                doc.setFont('helvetica', 'bold');
                doc.text('Detected Issues:', 20, y);
                y += 7;
                doc.setFont('helvetica', 'normal');
                itemData.issues.forEach(issue => {
                    doc.text(`• ${issue}`, 25, y);
                    y += 7;
                });
            }

            // Inspector Comments
            if (itemData.comment) {
                y += 5;
                doc.setFont('helvetica', 'bold');
                doc.text('Inspector Comments:', 20, y);
                y += 7;
                doc.setFont('helvetica', 'normal');
                const commentLines = doc.splitTextToSize(itemData.comment, 165);
                doc.text(commentLines, 25, y);
                y += commentLines.length * 7;
            }

            // Add photos if available
            if (itemData.photos && itemData.photos.length > 0) {
                y += 10;
                const photoWidth = 60;
                const photoHeight = 45;
                let xOffset = 20;

                itemData.photos.forEach((photo, photoIndex) => {
                    if (xOffset + photoWidth > doc.internal.pageSize.getWidth() - 20) {
                        xOffset = 20;
                        y += photoHeight + 20;
                    }

                    if (y + photoHeight > doc.internal.pageSize.getHeight() - 20) {
                        doc.addPage();
                        y = 20;
                    }

                    try {
                        doc.addImage(photo, 'JPEG', xOffset, y, photoWidth, photoHeight);
                        doc.setFontSize(8);
                        doc.text(`Photo ${photoIndex + 1}`, xOffset, y + photoHeight + 5);
                        xOffset += photoWidth + 10;
                    } catch (error) {
                        console.error(`Error adding photo ${photoIndex + 1}:`, error);
                    }
                });

                y += photoHeight + 20;
            }

            y += 10; // Space between items
        });

        // Footer
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.getHeight() - 10);

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
        const filename = `FleetGuard_${inspection.truckId}_${timestamp}.pdf`;

        // Save PDF
        doc.save(filename);

        // Upload to backend if not in demo mode
        if (currentWorker.id !== '000') {
            const pdfBase64 = doc.output('datauristring');
            try {
                const response = await fetch('/api/uploadPDF', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        pdfData: pdfBase64, 
                        filename,
                        inspectionId: inspection.id
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to upload PDF');
                }

                const { url } = await response.json();
                return url;
            } catch (error) {
                console.error('Error uploading PDF:', error);
                showNotification('PDF generated but upload failed', 'warning');
                return null;
            }
        }

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF', 'error');
        return null;
    }
}

// Helper function to convert hex color to RGB
function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
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

        // Obtener información del camión
        const truckInfo = await getTruckInfo(truckId);
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

        // **Limpieza de memoria después de generar el PDF**
        cleanupMemory();

        // **Modo Demo: No guardar en base de datos**
        if (currentWorker.id === '000') {
            console.warn('Modo demo: No se guardará en la base de datos.');
            showNotification('Modo demo: PDF generado, pero no se guardará la inspección.', 'info');

            // Mostrar enlace al PDF en pantalla
            const pdfLinkContainer = document.getElementById('pdfLinkContainer');
            if (pdfLinkContainer) {
                pdfLinkContainer.innerHTML = `<a href="${pdfUrl}" target="_blank">Descargar PDF de Inspección</a>`;
                pdfLinkContainer.style.display = 'block';
            }
            showScreen('recordsScreen');
            return;
        }

        // Crear los datos para guardar en el backend o localStorage
        const inspectionData = {
            ...inspectionRecord,
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

/*funcion para validar el boton de Siguiente Item*/
function validateNextButton(charCount, minCharLimit, maxCharLimit) {
    const nextButton = document.getElementById('nextButton');
    if (!nextButton) return;

    // Get current item and its data
    const item = inspectionItems[currentIndex];
    const currentData = currentInspectionData[item.id] || {};
    const comment = document.getElementById('commentBox')?.value || '';
    const photoCount = currentData.photos?.length || 0;
    const requiredPhotos = item?.requiredPhotos || 0;

    // Check all conditions
    const hasValidStatus = currentItemStatus !== null;
    const hasValidComment = comment.length >= 30 && comment.length <= 150;
    const hasRequiredPhotos = requiredPhotos === 0 || photoCount >= requiredPhotos;

    // Enable button if all conditions are met
    nextButton.disabled = !(hasValidStatus && hasValidComment && hasRequiredPhotos);
    
    if (nextButton.disabled) {
        nextButton.classList.add('disabled');
    } else {
        nextButton.classList.remove('disabled');
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
    const maxPhotos = item.requiredPhotos || 0;

    if (!currentInspectionData[item.id]) {
        currentInspectionData[item.id] = { photos: [] };
    }

    if (currentInspectionData[item.id].photos?.length >= maxPhotos) {
        showNotification(`Máximo ${maxPhotos} fotos permitidas`, 'warning');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const processedImage = await handleImageProcessing(file);
        if (processedImage) {
            if (!currentInspectionData[item.id].photos) {
                currentInspectionData[item.id].photos = [];
            }
            currentInspectionData[item.id].photos.push(processedImage);
            updatePhotoPreview(item.id);
        }
    });

    input.click();
}
//funcion para generar el prompt dinamico
function generateAIPrompt(item) {
    const itemPrompts = {
        tires: `Analiza la llanta enfocándote en:
- Estado de inflado y deformaciones
- Condición del dibujo y desgaste
- Daños visibles (cortes, grietas)
- Estado general de la banda lateral`,
        
        mirrors: `Analiza el espejo enfocándote en:
- Integridad del cristal
- Estabilidad del montaje
- Visibilidad y limpieza
- Estado del marco`,
        
        license_plates: `Analiza la placa enfocándote en:
- Estado físico (dobladuras, daños)
- Sujeción y montaje
- Visibilidad y legibilidad
- Presencia de obstrucciones`,
        
        cleanliness: `Analiza la limpieza enfocándote en:
- Limpieza general de superficies
- Acumulación de suciedad
- Manchas visibles
- Claridad de ventanas y luces`,
        
        scratches: `Analiza el exterior enfocándote en:
- Rayones o marcas visibles
- Estado de la pintura
- Abolladuras o daños
- Condición de defensas`,
        
        headlights_taillights: `Analiza las luces enfocándote en:
- Claridad del lente
- Integridad de la carcasa
- Daños o grietas
- Señales de humedad`,
        
        compartments: `Analiza los compartimentos enfocándote en:
- Funcionamiento de puertas
- Estado de sellos
- Limpieza interior
- Bisagras y cerraduras`
    };

    return `Analiza este componente y proporciona un reporte técnico conciso en español. 
Enfócate solo en la condición física observable.
${itemPrompts[item.id] || ''}`;
}

function updatePhotoPreview(itemId) {
    const photoContainer = document.getElementById('photoPreviewContainer'); 
    if (!photoContainer) return;

    // Limpiar la vista previa
    photoContainer.innerHTML = '';

    // Obtener la lista de fotos
    const photos = currentInspectionData[itemId]?.photos || [];

    // Agregar cada imagen a la vista previa
    photos.forEach((photoUrl, index) => {
        const img = document.createElement('img');
        img.src = photoUrl;
        img.style.maxWidth = '100px';
        img.style.marginRight = '5px';
        img.setAttribute('alt', `Foto ${index + 1}`);

        photoContainer.appendChild(img);
    });
}
/*Funcion para comprimir la imagen*/
async function compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
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
                
                // Convert to WebP with lower quality
                const compressedImage = canvas.toDataURL('image/webp', quality);
                
                // Cleanup
                canvas.width = 0;
                canvas.height = 0;
                URL.revokeObjectURL(img.src);
                img.src = '';
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

    const recordsPerPage = 10;
    
    try {
        console.log('Displaying records for page:', page);

        console.log('Current worker state:', currentWorker);
        if (!currentWorker || !currentWorker.id) {
            throw new Error('No worker information available');
        }

        recordsContainer.innerHTML = '<div class="loading-spinner"></div>';

        console.log('Fetching inspection records...');
        const records = await fetchInspectionRecords(
            currentWorker.id,
            currentWorker.role === 'admin'
        );
        console.log('Fetched records:', records);

        recordsContainer.innerHTML = '';

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

        let filteredRecords = records;
        console.log('Current worker role:', currentWorker.role);
        if (currentWorker.role !== 'admin') {
            filteredRecords = filteredRecords.filter(record =>
                record.worker_id === currentWorker.id || record.worker === currentWorker.name
            );
            console.log('Filtered records for non-admin user:', filteredRecords);
        } else {
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

        console.log('Sorting records by date...');
        filteredRecords.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
        console.log('Sorted records:', filteredRecords);

        // Paginación
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
        console.log(`Paginated records (Page ${page}):`, paginatedRecords);

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

        console.log('Updating pagination controls...');
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;

        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        if (prevPageBtn) prevPageBtn.disabled = page <= 1;
        if (nextPageBtn) nextPageBtn.disabled = page >= totalPages;

        console.log('Pagination updated.');
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
//funcion para filtrar
function filterRecords() {
    let records = JSON.parse(localStorage.getItem('inspectionRecords') || '[]');
    
    // Date filter
    const dateFilter = document.getElementById('dateFilter')?.value;
    if (dateFilter) {
        records = records.filter(record => {
            const recordDate = new Date(record.date).toLocaleDateString();
            return recordDate === dateFilter;
        });
    }

    // Admin-only filters
    if (currentWorker?.role === 'admin') {
        const workerFilter = document.getElementById('workerFilter')?.value;
        if (workerFilter) {
            records = records.filter(record => 
                record.worker_id === workerFilter || 
                record.worker?.toLowerCase().includes(workerFilter.toLowerCase())
            );
        }

        const statusFilter = document.getElementById('recordFilterStatus')?.value;
        if (statusFilter && statusFilter !== 'all') {
            records = records.filter(record => {
                const hasStatus = Object.values(record.data || {}).some(
                    item => item.status === statusFilter
                );
                return hasStatus;
            });
        }
    }

    return records;
}
// Add event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    const filters = ['dateFilter', 'workerFilter', 'recordFilterStatus'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => {
                currentPage = 1;
                displayRecords(1);
            });
        }
    });
});
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

/*Funcion para rescalar la imagen*/
async function resizeImage(file, maxWidth = 1280, maxHeight = 960, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 🔹 Validar formato de imagen antes de procesarla
                if (!img.src.startsWith('data:image/')) {
                    return reject(new Error('Formato de imagen no válido.'));
                }

                // 🔹 Calcular nuevas dimensiones
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

                // 🔹 Ajustar tamaño del canvas
                canvas.width = width;
                canvas.height = height;

                // 🔹 Dibujar y comprimir la imagen
                ctx.drawImage(img, 0, 0, width, height);

                // 🔹 Convertir a base64 en formato JPG
                const resizedBase64 = canvas.toDataURL('image/jpeg', quality);

                // 🔹 Validar que la imagen redimensionada tiene un formato válido
                if (!resizedBase64.startsWith('data:image/jpeg;base64,')) {
                    return reject(new Error('Error al convertir imagen a base64.'));
                }

                resolve(resizedBase64);
            };

            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

// Replace the existing analyzePhotoWithOpenAI function
async function analyzePhotoWithOpenAI(photos, itemName) {
    const item = inspectionItems[currentIndex];
    const prompt = generateAIPrompt(item);
    let overlay = null;

    try {
        // Create overlay
        overlay = document.createElement('div');
        overlay.className = 'processing-overlay';
        overlay.innerHTML = `
            <div class="processing-message">
                <div class="loading-spinner"></div>
                <p>Analizando imagen con IA...</p>
            </div>
        `;

        // Add overlay to document
        if (document.body) {
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        }

        showNotification('Analizando imágenes...', 'info');

        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt,
                images: photos,
                itemType: item.id
            })
        });

        if (!response.ok) {
            throw new Error(`Error en API: ${response.status}`);
        }

        const data = await response.json();
        return processAIResponse(data.results, item);

    } catch (error) {
        console.error('Error en análisis:', error);
        showNotification('Error en análisis de imágenes', 'error');
        return [{
            status: 'error',
            issues: ['Error en análisis'],
            details: error.message
        }];
    } finally {
        // Cleanup: remove overlay and restore scrolling
        try {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (document.body) {
                document.body.style.overflow = '';
            }
        } catch (cleanupError) {
            console.error('Error cleaning up overlay:', cleanupError);
        }
    }
}
//para obtener la respuesta de la IA
// 🔹 Función que analiza la respuesta de OpenAI y la categoriza
function processAIAnalysis(description, prompt) {
    const conditions = {
        tires: {
            statuses: ["Óptimo", "Desgaste normal", "Desgaste avanzado", "Desinflado", "Ponchado", "Crítico"],
            issues: ["Sin problemas", "Presión baja", "Desgaste irregular", "Desgaste en bordes", "Grietas", "Objeto punzante", "Deformación"]
        },
        mirrors: {
            statuses: ["Óptimo", "Funcional", "Dañado", "Crítico"],
            issues: ["Sin problemas", "Rayones menores", "Rajadura", "Desajustado", "Visibilidad reducida", "Roto"]
        },
        license_plates: {
            statuses: ["Óptimo", "Legible", "Parcialmente legible", "Ilegible"],
            issues: ["Sin problemas", "Suciedad", "Decoloración", "Dobladura", "Daño físico", "Baja reflectividad"]
        },
        headlights: {
            statuses: ["Óptimo", "Funcional", "Deteriorado", "No funcional"],
            issues: ["Sin problemas", "Opacidad", "Humedad", "Grietas", "Bajo brillo", "Daño estructural"]
        },
        cleanliness: {
            statuses: ["Excelente", "Aceptable", "Requiere limpieza", "Inaceptable"],
            issues: ["Sin problemas", "Polvo", "Manchas", "Suciedad excesiva", "Residuos"]
        },
        scratches: {
            statuses: ["Sin daños", "Daños menores", "Daños moderados", "Daños severos"],
            issues: ["Sin problemas", "Rayones superficiales", "Rayones profundos", "Abolladuras", "Pintura dañada"]
        }
    };

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
        // Mostrar estado de carga
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';

        // ✅ Obtener TODOS los usuarios en lugar de un solo usuario
        const response = await fetch(`/api/getWorkers`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const workerList = data.workers; // Extraer lista de trabajadores

        if (!Array.isArray(workerList)) {
            throw new Error('La respuesta de la API no contiene una lista válida de trabajadores');
        }

        // Vaciar y actualizar la lista de trabajadores en memoria
        workers = {};
        workerList.forEach(worker => {
            workers[worker.id] = worker;
        });

        console.log('Usuarios cargados en workers:', workers);

        // Limpiar la tabla antes de renderizar los usuarios
        tableBody.innerHTML = '';

        // Renderizar usuarios en la tabla
        workerList.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id || ''}</td>
                <td>${user.name || ''}</td>
                <td>${user.role || ''}</td>
                <td>${formatDateTime(user.last_activity) || 'No activity'}</td>
                <td><span class="status-badge ${user.status}">${user.status || 'inactive'}</span></td>
                <td>
                    <button class="btn btn-secondary edit-user-btn" data-user-id="${user.id}">Edit</button>
                    <button class="btn btn-secondary" onclick="toggleUserStatus('${user.id}')">
                        ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // ✅ Asegurar que los botones de edición tengan el evento correcto
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', function () {
                let userId = this.getAttribute('data-user-id'); // Obtener el ID correcto
                if (!userId) {
                    console.error('Error: userId es nulo o indefinido');
                    return;
                }
                userId = userId.trim(); // Asegurar que no haya espacios en blanco
                editUser(userId);
            });
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
//Funcion para guardar los cambios del modal de usuarios
async function saveUserEdits() {
    const userId = document.getElementById('userId')?.value?.trim();
    const name = document.getElementById('userName')?.value?.trim();
    const email = document.getElementById('userEmail')?.value?.trim();
    const role = document.getElementById('userRole')?.value?.trim();
    const password = document.getElementById('userPassword')?.value?.trim();

    const userData = { id: userId, name, email, password_hash: password, role };

    console.log("Enviando datos de usuario:", userData);

    // 📌 Detectar si el usuario ya existe en `workers`
    const isExistingUser = workers?.hasOwnProperty(userId);

    const method = isExistingUser ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(`/api/getWorkers`, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        console.log('Respuesta del servidor:', result);

        if (!response.ok) {
            throw new Error(result.error || `Error ${isExistingUser ? 'updating' : 'creating'} user`);
        }

        showNotification(`User ${isExistingUser ? 'updated' : 'created'} successfully`, 'success');

        // 📌 Verificar si `closeModal` existe, si no, cerrar manualmente
        if (typeof closeModal === 'function') {
            closeModal();
        } else {
            const modal = document.getElementById('userModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        displayUsers(); // Recargar la lista de usuarios

    } catch (error) {
        console.error(`Error ${isExistingUser ? 'updating' : 'creating'} user:`, error);
        showNotification(`Error ${isExistingUser ? 'updating' : 'creating'} user`, 'error');
    }
}

// Formateo de la fecha
function formatDateTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
}
//Funcion para crear las metricas
function updateMetricsDisplay() {
    // Obtener todos los registros de inspección
    const records = JSON.parse(localStorage.getItem('inspectionRecords') || '[]');
    const fleetConditions = records.map(record => record.overallCondition?.score || 0);
    
    // Calcular promedio de condición general
    const averageCondition = fleetConditions.length > 0
        ? fleetConditions.reduce((acc, curr) => acc + curr, 0) / fleetConditions.length
        : 0;
    
    // Calcular tiempo promedio de inspección
    const timesWithDuration = records.filter(record => record.duration);
    const averageTime = timesWithDuration.length > 0
        ? timesWithDuration.reduce((acc, curr) => acc + curr.duration, 0) / timesWithDuration.length
        : 0;
    
    // Calcular tiempos por inspector
    const inspectorTimes = {};
    timesWithDuration.forEach(record => {
        if (!inspectorTimes[record.worker]) {
            inspectorTimes[record.worker] = [];
        }
        inspectorTimes[record.worker].push(record.duration);
    });
    
    // Formatear tiempo para visualización
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };
    
    // Actualizar valores en UI
	const avgTimeElem = document.getElementById('averageTimeValue');
		if (avgTimeElem) avgTimeElem.textContent = formatTime(averageTime);
		
		const fleetConditionElem = document.getElementById('fleetConditionValue');
		if (fleetConditionElem) fleetConditionElem.textContent = `${averageCondition.toFixed(1)}%`;

    //document.getElementById('averageTimeValue')?.textContent = formatTime(averageTime);
    //document.getElementById('fleetConditionValue')?.textContent = `${averageCondition.toFixed(1)}%`;
    
    // Datos de ejemplo
    const weeklyData = { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [8, 12, 15, 10, 14, 6, 4] };
    const issueData = { labels: ['Critical', 'Warning', 'OK'], data: [15, 25, 60] };
    const performanceData = { labels: ['John', 'Maria', 'Carlos', 'Sarah'], data: [92, 88, 95, 87] };
    
    // Eliminar gráficos existentes
    const existingCharts = [
        'inspectionTimesChart', 'weeklyInspectionsChart', 'issueDistributionChart',
        'inspectorPerformanceChart', 'fleetConditionChart'
    ];
    existingCharts.forEach(chartId => Chart.getChart(chartId)?.destroy());
    
    // Crear datos para el gráfico de tiempos por inspector
    const chartData = Object.entries(inspectorTimes).map(([inspector, times]) => ({
        inspector,
        averageTime: times.reduce((acc, curr) => acc + curr, 0) / times.length
    }));
    
    // Crear gráficos
    const createChart = (id, type, labels, data, options = {}) => {
        const ctx = document.getElementById(id);
        if (ctx) {
            new Chart(ctx, {
                type,
                data: { labels, datasets: [{ label: options.label || '', data, backgroundColor: options.backgroundColor || '#3b82f6', borderRadius: options.borderRadius || 0 }] },
                options: { responsive: true, plugins: { legend: { display: options.legend !== false } }, scales: options.scales || {} }
            });
        }
    };
    
    createChart('inspectionTimesChart', 'bar', chartData.map(d => d.inspector), chartData.map(d => d.averageTime), { label: 'Average Inspection Time (seconds)', scales: { y: { beginAtZero: true, title: { display: true, text: 'Time (seconds)' } } } });
    createChart('weeklyInspectionsChart', 'bar', weeklyData.labels, weeklyData.data, { label: 'Inspections', borderRadius: 6, legend: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 5 } } } });
    createChart('issueDistributionChart', 'doughnut', issueData.labels, issueData.data, { backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], legend: true });
    createChart('inspectorPerformanceChart', 'bar', performanceData.labels, performanceData.data, { label: 'Performance Score', borderRadius: 6, legend: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: value => value + '%' } } } });
    createChart('fleetConditionChart', 'line', records.map(r => new Date(r.date).toLocaleDateString()), fleetConditions, { label: 'Vehicle Condition %', borderColor: '#3b82f6', tension: 0.1, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: value => value + '%' } } } });
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
/*Funcion para editar a los usuarios dentro de la pantalla de admin*/
async function editUser(userId) {
    try {
        // 🔹 Asegurar que userId es un string
        userId = String(userId).trim();

        console.log('Buscando usuario con ID:', userId);

        // 🔹 Hacer la solicitud a la API
        const response = await fetch(`/api/getWorkers?id=${encodeURIComponent(userId)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const data = await response.json();

        console.log('Respuesta de la API:', data);

        // 🔹 Si la API devuelve una lista, buscar el usuario correcto
        let user = null;
        if (Array.isArray(data.workers)) {
            user = data.workers.find(worker => String(worker.id) === userId);
        }

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        const elements = {
            modal: document.getElementById('userModal'),
            title: document.getElementById('modalTitle'),
            id: document.getElementById('userId'),
            name: document.getElementById('userName'),
            email: document.getElementById('userEmail'),
            role: document.getElementById('userRole'),
            password: document.getElementById('userPassword')
        };

        // 🔹 Actualizar los valores en el modal
        elements.title.textContent = 'Edit User';
        elements.id.value = user.id || ''; 
        elements.id.readOnly = true; // ID no editable
        elements.name.value = user.name || ''; // Evita null/undefined
        elements.email.value = user.email || ''; // Evita null/undefined
        elements.role.value = user.role || 'user'; // Valor por defecto
        elements.password.value = ''; // No mostrar la contraseña existente

        // 🔹 Mostrar el modal
        elements.modal.style.display = 'block';

    } catch (error) {
        console.error('Error editing user:', error);
        showNotification('Error loading user data', 'error');
    }
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
        document.body.classList.remove('logged-in');
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
//Funcion para bloquear el scroll en el login (es que se ven todas las pantallas XD)
function initializeScrollBehavior() {
    const loginScreen = document.getElementById('loginScreen');

    if (!loginScreen) return; // Evita errores si no existe el loginScreen

    // Función para bloquear/desbloquear el scroll
    function toggleScrollLock(enable) {
        if (enable) {
            document.body.classList.add('login-screen');
        } else {
            document.body.classList.remove('login-screen');
        }
    }

    // Bloquear scroll si el login está visible
    if (loginScreen.style.display === 'block') {
        toggleScrollLock(true);
    }

    // Remover scroll lock cuando se navega a otras pantallas
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', () => toggleScrollLock(false));
    });

    // Volver a bloquear el scroll al regresar al login
    if (typeof backToLogin === 'function') {
        const originalBackToLogin = backToLogin;
        backToLogin = function() {
            originalBackToLogin();
            toggleScrollLock(true);
        };
    }
}

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
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all buttons and event handlers
    initializeLoginButtons();
    initializeStatusButtons();
    initializeScrollBehavior();
    updateLanguage();
    setupEventListeners();
});
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
    toggleSidebar,
    handleImageProcessing,
    updatePhotoPreview
});

