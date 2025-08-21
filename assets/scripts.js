// ====== EVENT LISTENER MANAGEMENT ======
/**
 * @type {Map<HTMLElement, Map<string, {handler: Function, options: Object}[]>>}
 */
const eventListeners = new Map();

/**
 * Safely manages event listeners to prevent leaks and duplicates
 * @param {HTMLElement} element - The target element
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 * @param {Object} [options] - Optional event listener options
 * @returns {Function} A function to remove just this event listener
 */
/**
 * Safely manages event listeners to prevent leaks and duplicates
 * @param {HTMLElement|string} element - Target element or selector
 * @param {string|string[]} events - Event type or array of event types
 * @param {Function} handler - The event handler
 * @param {Object} [options={}] - Optional event listener options
 * @param {boolean} [debug=false] - Enable debug logging
 * @returns {Function} A function to remove all added listeners
 */
function manageEventListener(element, events, handler, options = {}, debug = false) {
    // Debug helper
    const log = (message, data) => {
        if (debug) console.log(`[EventManager] ${message}`, data || '');
    };

    // Enhanced input validation
    if (!element) {
        const error = '[EventManager] No element provided';
        console.warn(error);
        return () => log(error);
    }
    
    // Handle different element types
    let targetElement = element;
    if (element === document || element === window) {
        // Special case for document and window objects
        targetElement = element;
    } else if (typeof element === 'string') {
        // Handle selector strings
        targetElement = document.querySelector(element);
        if (!targetElement) {
            const error = `[EventManager] No element found for selector: ${element}`;
            console.warn(error);
            return () => log(error);
        }
    } else if (!(element instanceof Element) && !(element instanceof Window)) {
        const error = `[EventManager] Invalid element type. Expected HTMLElement, Window, Document, or selector string, got: ${element?.constructor?.name || typeof element}`;
        console.warn(error, { element });
        return () => log(error);
    }
    
    // Normalize events to array
    const eventList = Array.isArray(events) ? events : [events];
    if (!eventList.length) {
        const error = '[EventManager] No events provided';
        console.warn(error);
        return () => log(error);
    }
    
    if (typeof handler !== 'function') {
        const error = '[EventManager] Handler must be a function';
        console.warn(error);
        return () => log(error);
    }
    
    // Store cleanup functions for each event
    const cleanupFns = [];
    
    // Process each event type
    eventList.forEach(event => {
        if (typeof event !== 'string' || !event.trim()) {
            log('Skipping invalid event type:', event);
            return;
        }
        
        // Initialize element in the map if not exists
        if (!eventListeners.has(targetElement)) {
            eventListeners.set(targetElement, new Map());
        }
        
        const elementListeners = eventListeners.get(targetElement);
        
        // Initialize event array if not exists
        if (!elementListeners.has(event)) {
            elementListeners.set(event, []);
        }
        
        const handlers = elementListeners.get(event);
        const handlerObj = { handler, options };
        
        // Remove existing listener with the same handler
        removeMatchingListener(targetElement, event, handler, options);
        
        // Add the new listener
        targetElement.addEventListener(event, handler, options);
        handlers.push(handlerObj);
        log(`Added ${event} listener to`, targetElement);
        
        // Store cleanup function for this event
        cleanupFns.push(() => {
            log(`Removing ${event} listener from`, targetElement);
            removeMatchingListener(targetElement, event, handler, options);
        });
    });
    
    // Return a cleanup function that removes all added listeners
    return () => {
        log('Cleaning up event listeners for', targetElement);
        cleanupFns.forEach(cleanup => cleanup());
    };
}

/**
 * Removes all event listeners for a specific element and event
 * @param {HTMLElement|string} element - Target element or selector
 * @param {string|string[]} [events] - Optional event type(s) to remove
 * @param {boolean} [debug=false] - Enable debug logging
 * @returns {boolean} True if any listeners were removed
 */
function removeEventListeners(element, events, debug = false) {
    // Debug helper
    const log = (message, data) => {
        if (debug) console.log(`[EventManager] ${message}`, data || '');
    };

    // Handle selector strings
    let targetElement = element;
    if (typeof element === 'string') {
        targetElement = document.querySelector(element);
        if (!targetElement) {
            log('No element found for selector:', element);
            return false;
        }
    }
    
    if (!eventListeners.has(targetElement)) {
        log('No listeners found for element:', targetElement);
        return false;
    }
    
    const elementListeners = eventListeners.get(targetElement);
    let removed = false;
    
    // If no specific events provided, remove all listeners for the element
    if (!events) {
        log(`Removing all listeners from element:`, targetElement);
        for (const [event, handlers] of elementListeners.entries()) {
            handlers.forEach(({ handler, options }) => {
                targetElement.removeEventListener(event, handler, options);
                log(`Removed ${event} listener from:`, targetElement);
            });
            removed = true;
        }
        eventListeners.delete(targetElement);
        return removed;
    }
    
    // Handle single event or array of events
    const eventList = Array.isArray(events) ? events : [events];
    
    eventList.forEach(event => {
        if (!elementListeners.has(event)) {
            log(`No ${event} listeners found for element:`, targetElement);
            return;
        }
        
        const handlers = elementListeners.get(event);
        handlers.forEach(({ handler, options }) => {
            targetElement.removeEventListener(event, handler, options);
            log(`Removed ${event} listener from:`, targetElement);
        });
        
        elementListeners.delete(event);
        removed = true;
    });
    
    // Clean up if no more listeners for this element
    if (elementListeners.size === 0) {
        eventListeners.delete(targetElement);
    }
    
    return removed;
}

/**
 * Removes a specific event listener
 * @private
 * @param {HTMLElement|string} element - Target element or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler to remove
 * @param {Object} [options] - Event listener options
 * @param {boolean} [debug=false] - Enable debug logging
 * @returns {boolean} True if the listener was found and removed
 */
function removeMatchingListener(element, event, handler, options = {}, debug = false) {
    // Debug helper
    const log = (message, data) => {
        if (debug) console.log(`[EventManager] ${message}`, data || '');
    };
    
    // Handle selector strings
    let targetElement = element;
    if (typeof element === 'string') {
        targetElement = document.querySelector(element);
        if (!targetElement) {
            log('No element found for selector:', element);
            return false;
        }
    }
    
    if (!eventListeners.has(targetElement)) {
        log('No listeners found for element:', targetElement);
        return false;
    }
    
    const elementListeners = eventListeners.get(targetElement);
    if (!elementListeners.has(event)) {
        log(`No ${event} listeners found for element:`, targetElement);
        return false;
    }
    
    const handlers = elementListeners.get(event);
    const index = handlers.findIndex(
        h => h.handler === handler && 
             JSON.stringify(h.options) === JSON.stringify(options || {})
    );
    
    if (index === -1) {
        log('Matching listener not found for event:', event);
        return false;
    }
    
    const { handler: handlerToRemove, options: optionsToRemove } = handlers[index];
    targetElement.removeEventListener(event, handlerToRemove, optionsToRemove);
    handlers.splice(index, 1);
    log(`Removed matching ${event} listener from:`, targetElement);
    
    // Clean up if no more handlers for this event
    if (handlers.length === 0) {
        elementListeners.delete(event);
        log(`No more ${event} listeners for element:`, targetElement);
    }
    
    // Clean up if no more events for this element
    if (elementListeners.size === 0) {
        eventListeners.delete(targetElement);
        log('No more listeners for element:', targetElement);
    }
    
    return true;
}

// Clean up all event listeners when the page is unloaded
window.addEventListener('beforeunload', () => {
    for (const [element, elementListeners] of eventListeners.entries()) {
        for (const [event, handlers] of elementListeners.entries()) {
            handlers.forEach(({ handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        }
    }
    eventListeners.clear();
});

// ====== DOM UTILITIES ======
/**
 * Creates a DOM element with optional class and innerHTML
 * @param {string} tag - The HTML tag name
 * @param {string} [className] - Optional class name(s)
 * @param {string} [innerHTML] - Optional innerHTML content
 * @returns {HTMLElement} The created element
 */
function createElement(tag, className = '', innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

/**
 * Toggles a class on an element
 * @param {HTMLElement} element - The target element
 * @param {string} className - The class to toggle
 * @param {boolean} [force] - Force add or remove the class
 */
function toggleClass(element, className, force) {
    if (!element) return;
    element.classList.toggle(className, force);
}

// ====== GLOBAL VARIABLES ======
// Application state
let currentTheme = 'light';
let cart = [];

// Admin form elements
let dishFormContainer;
let dishId;
let dishCategory;
let dishName;
let dishIngredients;
let dishCalories;
let dishProteins;
let dishPrice;
let dishImageUrl;
let dishImageFile;
let saveDishBtn;
let cancelEditBtn;
let favorites = [];
let menuData = {};

let longPressTimer;
let longPressDuration = 2000; // 2 secondes
let adminActivatedFromLongPress = false;

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const logo = document.getElementById('logo');
const navCategories = document.getElementById('navCategories');
const menuContainer = document.getElementById('menuContainer');
const homeSection = document.getElementById('homeSection');
const menuSection = document.getElementById('menuSection');
const menuCategoryTitle = document.getElementById('menuCategoryTitle');
const cartIcon = document.getElementById('cartIcon');
const cartModal = document.getElementById('cartModal');
const cartItems = document.getElementById('cartItems');
const cartCount = document.querySelector('.cart-count');
const subtotal = document.getElementById('subtotal');
const clearCart = document.getElementById('clearCart');
const checkout = document.getElementById('checkout');
const closeCart = document.querySelector('.close-cart');
// Search UI
const searchToggle = document.getElementById('searchToggle');
const searchWrapper = document.getElementById('searchWrapper');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchOverlayClose = document.querySelector('.search-overlay-close');
// Options et méthodes de paiement (peuvent ne pas exister)
//const paymentOptions = document.getElementById('paymentOptions');
//const payOnDelivery = document.getElementById('payOnDelivery');
//const payOnline = document.getElementById('payOnline');
//const orangeMoney = document.getElementById('orangeMoney');
//const wave = document.getElementById('wave');
const specialRequest = document.getElementById('specialRequest');
const cartNotification = document.getElementById('cartNotification');
//const floatingCart = document.getElementById('floatingCart');
//const cartCountBadge = document.getElementById('cartCountBadge');
// const exportExcel = document.getElementById('exportExcel');
// const statsPeriod = document.getElementById('statsPeriod');
// const refreshStats = document.getElementById('refreshStats');
// const topDishes = document.getElementById('topDishes');
// const topCategories = document.getElementById('topCategories');

// Admin Modal elements - these will be initialized in initAdmin
const btnAddDish = document.getElementById('btnAddDish');
const btnImport = document.getElementById('btnImport');
const excelImport = document.getElementById('excelImport');
const btnExport = document.getElementById('btnExport');
const btnResetMenu = document.getElementById('btnResetMenu');
const topDishesList = document.getElementById('topDishesList');
const topCategoriesList = document.getElementById('topCategoriesList');

// Initialize admin form elements when the DOM is fully loaded
function initFormElements() {
    dishFormContainer = document.getElementById('dishFormContainer');
    dishId = document.getElementById('dishId');
    dishCategory = document.getElementById('dishCategory');
    dishName = document.getElementById('dishName');
    dishIngredients = document.getElementById('dishIngredients');
    dishCalories = document.getElementById('dishCalories');
    dishProteins = document.getElementById('dishProteins');
    dishPrice = document.getElementById('dishPrice');
    dishImageUrl = document.getElementById('dishImageUrl');
    dishImageFile = document.getElementById('dishImageFile');
    saveDishBtn = document.getElementById('saveDish');
    cancelEditBtn = document.getElementById('cancelEdit');
    
    // Add event listeners
    if (saveDishBtn) {
        saveDishBtn.removeEventListener('click', handleSaveDish);
        saveDishBtn.addEventListener('click', handleSaveDish);
    }
}

/**
 * Handle cancel edit button click
 * @param {Event} [e] - Optional event object
 */
function handleCancelEdit(e) {
    if (e) e.preventDefault();
    
    if (confirm('Voulez-vous annuler les modifications ? Les changements non enregistrés seront perdus.')) {
        if (dishFormContainer) {
            dishFormContainer.style.display = 'none';
            // Reset form fields
            if (dishId) dishId.value = '';
            if (dishFormContainer.tagName === 'FORM') {
                dishFormContainer.reset();
            }
        }
    }
}

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    // Initialize form elements first
    initFormElements();
    
    // Charger les données du menu
    loadMenuData();
    
    // Initialiser le thème
    initTheme();
    
    // Initialiser les écouteurs d'événements
    initEventListeners();
    
    // Initialiser l'admin modal (si le markup est présent)
    initAdmin();
    
    // Charger le panier depuis le localStorage
    loadCart();
    
    // Charger les favoris depuis le localStorage
    loadFavorites();
});

// Enregistrement du Service Worker (PWA)
// -_- Bug: No check if the page is served over HTTPS (required for service workers in production)
// -_- Bug: No offline handling or cache versioning strategy mentioned
if ('serviceWorker' in navigator) {
    // -_- Bug: Using 'load' event might delay service worker registration
    window.addEventListener('load', async () => {
        // Ne pas essayer d'enregistrer le Service Worker en développement local (file://)
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            try {
                // Essayer d'abord avec le chemin relatif à la racine
                const reg = await navigator.serviceWorker.register('/sw.js', { 
                    scope: '/',
                    updateViaCache: 'none'  // Toujours récupérer la dernière version du SW
                });

                console.log('Service Worker enregistré avec succès:', reg);

                // Vérifier les mises à jour du Service Worker
                if (reg.installing) {
                    console.log('Service Worker installation en cours');
                } else if (reg.waiting) {
                    console.log('Service Worker installé et en attente');
                } else if (reg.active) {
                    console.log('Service Worker actif');
                }

                // Écouter les mises à jour
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        console.log('Nouvel état du Service Worker:', newWorker.state);
                    });
                });

            } catch (err) {
                console.warn('Échec de l\'enregistrement du Service Worker:', err);
                // Désactiver les fonctionnalités hors ligne ou afficher un message à l'utilisateur
            }
        } else {
            console.log('Mode développement local - Service Worker désactivé');
        }
    });
}

// Charger les données du menu
function loadMenuData() {
    // -_- Bug: No loading state or error handling for the UI
    // -_- Suggestion: Add a loading indicator
    
    // -_- Bug: No validation of the structure of menuDataCustom
    const custom = localStorage.getItem('menuDataCustom');
    if (custom) {
        try {
            menuData = JSON.parse(custom);
            // -_- Suggestion: Validate menuData structure before using
        } catch (e) {
            console.warn('menuDataCustom invalide, fallback DOM:', e);
            // -_- Bug: Should clear invalid data from localStorage
            // localStorage.removeItem('menuDataCustom');
        }
    }
    
    // -_- Bug: Should validate menuData structure more thoroughly
    if (!menuData || !Array.isArray(menuData.dishes) || !Array.isArray(menuData.categories)) {
        const menuDataElement = document.getElementById('menuData');
        if (menuDataElement && menuDataElement.textContent) {
            try {
                menuData = JSON.parse(menuDataElement.textContent);
                // -_- Suggestion: Validate the parsed data
            } catch (e) {
                console.error('Failed to parse menuData from DOM:', e);
                menuData = { categories: [], dishes: [] };
            }
        } else {
            console.error('menuData introuvable');
            menuData = { categories: [], dishes: [] };
        }
    }
    
    // Initialize menu rendering
    try {
        renderCategories();
        renderAllDishes();
    } catch (error) {
        console.error('Error initializing menu:', error);
        // -_- Suggestion: Show error state to user
    }
}

// Initialiser le thème
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Définir le thème
function setTheme(theme) {
    currentTheme = theme;
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
    localStorage.setItem('theme', theme);
    
    // Mettre à jour l'icône du bouton de thème
    const moonIcon = themeToggle.querySelector('.fa-moon');
    const sunIcon = themeToggle.querySelector('.fa-sun');
    
    if (theme === 'dark') {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'inline-block';
    } else {
        moonIcon.style.display = 'inline-block';
        sunIcon.style.display = 'none';
    }
}

// Initialize event listeners with proper cleanup
function initEventListeners() {
    // Theme toggle button
    manageEventListener(themeToggle, 'click', toggleTheme);
    
    // Logo - click/tap for home, long press for admin
    let longPressTimer;
    const longPressDuration = 1000; // 1 second
    
    // Mouse events
    manageEventListener(logo, 'mousedown', startLongPress);
    manageEventListener(logo, 'mouseup', endLongPress);
    manageEventListener(logo, 'mouseleave', endLongPress);
    
    // Touch events
    manageEventListener(logo, 'touchstart', (e) => {
        window.longPressActive = false;
        longPressTimer = setTimeout(() => {
            window.longPressActive = true;
            startLongPress(e);
        }, longPressDuration);
    });
    
    manageEventListener(logo, 'touchend', (e) => {
        clearTimeout(longPressTimer);
        if (!window.longPressActive) {
            // Handle short tap
            goToHome();
        }
        endLongPress(e);
    });
    
    // Prevent context menu on long press
    manageEventListener(logo, 'contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Handle logo click - show carousel and go to home
    manageEventListener(logo, 'click', (e) => {
        // Only process if it's not a long press
        if (!window.longPressActive) {
            goToHome();
            if (modernCarousel) {
                modernCarousel.show();
            }
        }
    });
    
    // Keyboard shortcut Ctrl+Shift+L for admin (avoids browser shortcuts)
    manageEventListener(document, 'keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            e.stopPropagation();
            showAdminModal();
            return false;
        }
    }, { capture: true });
    
    // Favorites button
    const favoritesBtn = document.createElement('button');
    favoritesBtn.className = 'favorites-btn';
    favoritesBtn.innerHTML = '<i class="fas fa-heart"></i>';
    favoritesBtn.title = 'Voir mes favoris';
    manageEventListener(favoritesBtn, 'click', () => {
        homeSection.style.display = 'none';
        menuSection.style.display = 'block';
        showFavorites();
    });
    
    // Add favorites button to header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.querySelector('.favorites-btn')) {
        headerActions.insertBefore(favoritesBtn, themeToggle);
    }
    
    // Cart functionality
    if (cartIcon) manageEventListener(cartIcon, 'click', toggleCart);
    if (closeCart) manageEventListener(closeCart, 'click', toggleCart);
    if (clearCart) manageEventListener(clearCart, 'click', clearCartItems);
    if (checkout) manageEventListener(checkout, 'click', proceedToCheckout);
    if (payOnDelivery) manageEventListener(payOnDelivery, 'click', proceedToCheckout);
    if (payOnline) manageEventListener(payOnline, 'click', () => {});
    if (orangeMoney) manageEventListener(orangeMoney, 'click', () => proceedToCheckout('orange'));
    if (wave) manageEventListener(wave, 'click', () => proceedToCheckout('wave'));
    
    // Search functionality
    if (searchToggle && searchWrapper) {
        manageEventListener(searchToggle, 'click', () => {
            searchWrapper.classList.contains('open') ? closeSearch() : openSearch();
        });
    }
    
    if (searchInput) {
        manageEventListener(searchInput, 'input', handleSearchInput);
        manageEventListener(searchInput, 'keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSearch();
            }
        });
    }
    
    if (searchClear) manageEventListener(searchClear, 'click', clearSearch);
    
    if (searchWrapper) {
        manageEventListener(searchWrapper, 'click', (e) => {
            if (e.target === searchWrapper) closeSearch();
        });
    }
    
    // Keyboard shortcut Ctrl+K for search
    manageEventListener(document, 'keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape' && searchWrapper?.classList.contains('open')) {
            closeSearch();
        }
    });
    
    if (searchOverlayClose) {
        manageEventListener(searchOverlayClose, 'click', closeSearch);
    }
    
    // Close modals when clicking outside
    manageEventListener(window, 'click', (e) => {
        if (e.target.classList.contains('overlay')) {
            toggleCart();
        }
    });
}

// Basculer entre les thèmes clair/sombre
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Gestion du clic long pour l'admin
function startLongPress(e) {
    e.preventDefault();
    console.log('Début du clic long');
    longPressTimer = setTimeout(() => {
        console.log('Clic long détecté');
        adminActivatedFromLongPress = true;
        showAdminModal();
        // Empêcher le click d'aller à l'accueil après détection
        const once = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            logo.removeEventListener('click', once, true);
        };
        logo.addEventListener('click', once, true);
    }, longPressDuration);
}

function endLongPress() {
    console.log('Fin du clic long');
    clearTimeout(longPressTimer);
}

// Aller à l'accueil
function goToHome() {
    homeSection.style.display = 'block';
    menuSection.style.display = 'none';
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Afficher les catégories dans la navigation
function renderCategories() {
    navCategories.innerHTML = '';
    
    // Ajouter un bouton pour tous les plats
    const allButton = document.createElement('button');
    allButton.className = 'category-btn active';
    allButton.textContent = 'Tous';
    allButton.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        allButton.classList.add('active');
        renderAllDishes();
        goToMenu();
        
        // Hide the carousel when "Tous" is clicked
        if (modernCarousel) {
            modernCarousel.hide();
        }
    });
    navCategories.appendChild(allButton);
    
    // Ajouter les catégories du menu
    menuData.categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = category.name;
        button.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderDishesByCategory(category.name);
            goToMenu();
        });
        navCategories.appendChild(button);
    });
}

// Afficher tous les plats
function renderAllDishes() {
    menuCategoryTitle.textContent = 'Notre Menu';
    renderDishes(menuData.dishes);
}

// Afficher les plats par catégorie
function renderDishesByCategory(category) {
    menuCategoryTitle.textContent = category;
    const filteredDishes = menuData.dishes.filter(dish => dish.category === category);
    renderDishes(filteredDishes);
    
    // Hide the carousel when a category is selected
    if (modernCarousel) {
        modernCarousel.hide();
    }
}

// Afficher les plats favoris
function showFavorites() {
    // Hide the carousel when showing favorites
    if (modernCarousel) {
        modernCarousel.hide();
    }
    if (favorites.length === 0) {
        menuContainer.innerHTML = '<p class="no-results">Vous n\'avez aucun plat en favori.</p>';
        menuCategoryTitle.textContent = 'Mes Favoris';
        return;
    }
    
    const favoriteDishes = menuData.dishes.filter(dish => favorites.includes(dish.id));
    menuCategoryTitle.textContent = 'Mes Favoris';
    renderDishes(favoriteDishes);
}

// Create a dish card element using utility functions
function createDishCard(dish) {
    const isFavorite = favorites.includes(dish.id);
    
    // Create main card container
    const card = createElement('div', 'dish-card');
    card.dataset.id = dish.id;
    
    // Add popular badge if applicable
    if (dish.popular) {
        const popularBadge = createElement('span', 'popular-badge', 'Populaire');
        card.appendChild(popularBadge);
    }
    
    // Create and add dish image
    const dishImage = createElement('img', 'dish-image');
    dishImage.src = dish.image;
    dishImage.alt = dish.name;
    card.appendChild(dishImage);
    
    // Create dish info container
    const dishInfo = createElement('div', 'dish-info');
    
    // Create dish header with name and price
    const dishHeader = createElement('div', 'dish-header');
    const dishName = createElement('h3', 'dish-name', dish.name);
    const dishPrice = createElement('span', 'dish-price', `${dish.price.toLocaleString()} FCFA`);
    dishHeader.appendChild(dishName);
    dishHeader.appendChild(dishPrice);
    
    // Create ingredients paragraph
    const dishIngredients = createElement('p', 'dish-ingredients', dish.ingredients);
    
    // Create nutrition info - only show if we have data
    const dishNutrition = createElement('div', 'dish-nutrition');
    
    // Only add calories if they exist
    if (dish.calories !== undefined && dish.calories !== null && dish.calories !== '') {
        const calories = createElement('span', 'nutrition-item');
        calories.innerHTML = `🔥 ${dish.calories} cal`;
        dishNutrition.appendChild(calories);
    }
    
    // Only add proteins if they exist
    if (dish.proteins !== undefined && dish.proteins !== null && dish.proteins !== '') {
        const proteins = createElement('span', 'nutrition-item');
        proteins.innerHTML = `💪 ${dish.proteins}g protéines`;
        dishNutrition.appendChild(proteins);
    }
    
    // Create action buttons
    const dishActions = createElement('div', 'dish-actions');
    
    // Create favorite button
    const favoriteBtn = createElement('button', `favorite-btn ${isFavorite ? 'favorited' : ''}`);
    favoriteBtn.dataset.id = dish.id;
    const heartIcon = createElement('i', 'fas fa-heart');
    favoriteBtn.appendChild(heartIcon);
    manageEventListener(favoriteBtn, 'click', toggleFavorite);
    
    // Create add to cart button
    const addToCartBtn = createElement('button', 'btn-add-to-cart');
    addToCartBtn.dataset.id = dish.id;
    const plusIcon = createElement('i', 'fas fa-plus');
    addToCartBtn.appendChild(plusIcon);
    addToCartBtn.appendChild(document.createTextNode(' Ajouter'));
    manageEventListener(addToCartBtn, 'click', addToCart);
    
    // Assemble action buttons
    dishActions.appendChild(favoriteBtn);
    dishActions.appendChild(addToCartBtn);
    
    // Assemble dish info
    dishInfo.appendChild(dishHeader);
    dishInfo.appendChild(dishIngredients);
    dishInfo.appendChild(dishNutrition);
    dishInfo.appendChild(dishActions);
    
    // Add dish info to card
    card.appendChild(dishInfo);
    
    return card;
}

// Afficher les plats filtrés
function renderDishes(dishes) {
    // Clear existing content
    menuContainer.innerHTML = '';
    
    if (!dishes || dishes.length === 0) {
        const noResults = createElement('p', 'no-results', 'Aucun plat trouvé.');
        menuContainer.appendChild(noResults);
        return;
    }
    
    // Create and append dish cards
    dishes.forEach(dish => {
        const card = createDishCard(dish);
        menuContainer.appendChild(card);
    });
    
    // Add event listeners to the new dish cards
    addDishEventListeners();
}

// Aller à la section menu
function goToMenu() {
    homeSection.style.display = 'none';
    menuSection.style.display = 'block';
}

// --- Recherche: fonctions principales ---
function openSearch() {
    if (!searchWrapper) return;
    searchWrapper.classList.add('open');
    searchWrapper.setAttribute('aria-hidden', 'false');
    if (searchToggle) searchToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    if (searchInput) setTimeout(() => searchInput.focus(), 0);
}

function closeSearch() {
    if (!searchWrapper) return;
    searchWrapper.classList.remove('open');
    searchWrapper.setAttribute('aria-hidden', 'true');
    if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
}

function handleSearchInput() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    if (!menuData || !Array.isArray(menuData.dishes)) return;
    goToMenu();
    menuCategoryTitle.textContent = q ? 'Recherche' : 'Notre Menu';
    if (!q) {
        renderAllDishes();
        return;
    }
    const results = menuData.dishes.filter(d => {
        const name = (d.name || '').toLowerCase();
        const ing = (d.ingredients || '').toLowerCase();
        return name.includes(q) || ing.includes(q);
    });
    renderDishes(results);
}

function clearSearch() {
    if (!searchInput) return;
    searchInput.value = '';
    handleSearchInput();
    closeSearch();
}

// Ajouter les écouteurs d'événements aux cartes de plats
function addDishEventListeners() {
    // Boutons favoris
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', toggleFavorite);
    });
    
    // Boutons ajouter au panier
    document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
        btn.addEventListener('click', addToCart);
    });
    
    // Effets hover sur les cartes
    document.querySelectorAll('.dish-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('hover');
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('hover');
        });
        
        card.addEventListener('click', (e) => {
            // Ne pas sélectionner si on clique sur un bouton à l'intérieur
            if (!e.target.closest('button')) {
                document.querySelectorAll('.dish-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        });
    });
}

// Créer un cœur flottant
function createFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'heart-float';
    heart.innerHTML = '❤️';
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    
    // Ajouter au corps du document
    document.body.appendChild(heart);
    
    // Supprimer après l'animation
    setTimeout(() => {
        heart.remove();
    }, 1500);
}

// Basculer un plat en favori
function toggleFavorite(e) {
    e.stopPropagation();
    const dishId = parseInt(e.currentTarget.dataset.id);
    const index = favorites.indexOf(dishId);
    
    if (index === -1) {
        favorites.push(dishId);
        e.currentTarget.classList.add('favorited');
        
        // Créer plusieurs cœurs flottants
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // Créer plusieurs cœurs avec un léger décalage
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                createFloatingHeart(
                    x + (Math.random() * 40 - 20),
                    y + (Math.random() * 20 - 10)
                );
            }, i * 100);
        }
    } else {
        favorites.splice(index, 1);
        e.currentTarget.classList.remove('favorited');
    }
    
    saveFavorites();
}

// Ajouter un plat au panier
function addToCart(e) {
    const dishId = parseInt(e.currentTarget.dataset.id);
    const dish = menuData.dishes.find(d => d.id === dishId);
    
    if (!dish) return;
    
    // Vérifier si le plat est déjà dans le panier
    const existingItem = cart.find(item => item.id === dishId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...dish,
            quantity: 1
        });
    }
    
    // Mettre à jour le panier
    updateCart();
    
    // Afficher la notification "Ajouté au Panier"
    showCartNotification();
    
    // Animation du panier flottant
    if (cartIcon) {
        cartIcon.classList.add('pulse');
        setTimeout(() => {
            cartIcon.classList.remove('pulse');
        }, 600);
    }
}

// Mettre à jour le panier
function updateCart() {
    saveCart();
    renderCartItems();
    updateCartCount();
}

// Afficher la notification "Ajouté au Panier"
function showCartNotification() {
    // Vérifier si l'élément existe, sinon le chercher à nouveau
    const notification = cartNotification || document.getElementById('cartNotification');
    
    if (!notification) {
        console.error('cartNotification element not found');
        return;
    }
    
    // Ajouter la classe show pour déclencher l'animation
    notification.classList.add('show');
    
    // Retirer la notification après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Sauvegarder le panier dans le localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Charger le panier depuis le localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

// Sauvegarder les favoris dans le localStorage
function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Charger les favoris depuis le localStorage
function loadFavorites() {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
}

// Mettre à jour le compteur du panier
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Mettre à jour le compteur du panier flottant
    if (cartCount) {
        cartCount.textContent = count;
        
        // Afficher/masquer le compteur selon le contenu
        if (count > 0) {
            cartCount.style.display = 'flex';
        } else {
            cartCount.style.display = 'none';
        }
    }
    
    // Gérer la pulsation continue premium
    if (cartIcon) {
        if (count > 0) {
            cartIcon.classList.add('has-items');
        } else {
            cartIcon.classList.remove('has-items');
        }
    }
}

// Afficher/Masquer le panier
function toggleCart() {
    if (cartModal.style.right === '0px') {
        cartModal.style.right = '-100%';
        document.body.classList.remove('no-scroll');
    } else {
        cartModal.style.right = '0';
        document.body.classList.add('no-scroll');
        renderCartItems();
    }
}

// Afficher les articles du panier
function renderCartItems() {
    // Clear existing items
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        const emptyCartMsg = createElement('p', 'empty-cart', 'Votre panier est vide');
        cartItems.appendChild(emptyCartMsg);
        subtotal.textContent = '0 FCFA';
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        // Create cart item container
        const cartItem = createElement('div', 'cart-item');
        cartItem.dataset.id = item.id;
        
        // Create item details container
        const detailsDiv = createElement('div', 'cart-item-details');
        
        // Create name
        const nameP = createElement('p', 'cart-item-name', item.name);
        
        // Create quantity and price container
        const qtyPriceContainer = createElement('div', 'qty-price-container');
        const quantitySpan = createElement('span', 'cart-item-quantity', `x${item.quantity}`);
        const priceSpan = createElement('span', 'cart-item-price', `${itemTotal.toLocaleString()} FCFA`);
        qtyPriceContainer.appendChild(quantitySpan);
        qtyPriceContainer.appendChild(priceSpan);
        
        // Create remove button
        const removeBtn = createElement('button', 'remove-item');
        removeBtn.dataset.id = item.id;
        const removeIcon = createElement('i', 'fas fa-times');
        removeBtn.appendChild(removeIcon);
        
        // Assemble the cart item
        detailsDiv.appendChild(nameP);
        detailsDiv.appendChild(qtyPriceContainer);
        cartItem.appendChild(detailsDiv);
        cartItem.appendChild(removeBtn);
        
        // Add event listener using our utility function
        manageEventListener(removeBtn, 'click', removeFromCart);
        
        cartItems.appendChild(cartItem);
    });
    
    // Update total
    subtotal.textContent = `${total.toLocaleString()} FCFA`;
}

// Supprimer un article du panier
function removeFromCart(e) {
    const dishId = parseInt(e.currentTarget.dataset.id);
    const index = cart.findIndex(item => item.id === dishId);
    
    if (index !== -1) {
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        
        updateCart();
    }
}

// Vider le panier
function clearCartItems() {
    if (cart.length === 0) return;
    
    // Afficher la notification de confirmation personnalisée
    showClearCartConfirmation();
}

// Afficher la notification de confirmation de vidage du panier
function showClearCartConfirmation() {
    const confirmation = document.getElementById('clearCartConfirmation');
    if (confirmation) {
        confirmation.classList.add('show');
    }
}

// Confirmer le vidage du panier
function confirmClearCart() {
    cart = [];
    updateCart();
    toggleCart();
    hideClearCartConfirmation();
}

// Annuler le vidage du panier
function cancelClearCart() {
    hideClearCartConfirmation();
}

// Masquer la notification de confirmation
function hideClearCartConfirmation() {
    const confirmation = document.getElementById('clearCartConfirmation');
    if (confirmation) {
        confirmation.classList.remove('show');
    }
}

// Passer à la commande-ligne 1265: — ${(item.price * item.quantity).toLocaleString()} FCFA\n`;
function proceedToCheckout() {
    if (cart.length === 0) return;
    
let message = 'Bonjour,\n\nJe souhaiterais passer une commande🌿:\n\n';

cart.forEach(item => {
    message += `• ${item.quantity} × *${item.name}* \n`;
});

const request = specialRequest.value.trim();
if (request) {
//    message += `\n🍫 Demande spéciale : ${request} — 2 000 FCFA\n`;
    message += `\nDemande spéciale : \n*${request}*\n`;
}

const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const requestFee = request ? 2000 : 0;
const grandTotal = total + requestFee;

message += `\n📋Détails :\n`;
message += `• Sous-total : ${total.toLocaleString()} FCFA\n`;

if (requestFee > 0) {
//    message += `• Par Supplément : ${requestFee.toLocaleString()} FCFA\n`;
    message += 'En cas de supplément, des frais additionnels pourront s’appliquer,\n\n';
}
//message += `• Total : ${grandTotal.toLocaleString()} FCFA\n\n`;

message += 'Je vous remercie✨';
    
    // Rediriger vers WhatsApp
    const phoneNumber = '+2250708305100';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    
    // Enregistrer les stats de commande
    try { recordOrder(cart); } catch (e) { console.warn('recordOrder error:', e); }
    
    // Vider le panier après la commande
    cart = [];
    updateCart();
    toggleCart();
    specialRequest.value = '';
}

// ====== Admin & Gestion Menu ======
const ADMIN_PASSCODE = '0101';

/**
 * Initialize the admin interface
 * @returns {boolean} True if initialization was successful, false otherwise
 */
function initAdmin() {
    try {
        console.log('Initializing admin...');
        
        // Initialize all admin elements
        adminModal = document.getElementById('adminModal');
        adminLock = document.getElementById('adminLock');
        adminContent = document.getElementById('adminContent');
        adminCode = document.getElementById('adminCode');
        adminUnlock = document.getElementById('adminUnlock');
        adminError = document.getElementById('adminError');
        adminPanelMenu = document.getElementById('adminPanelMenu');
        adminPanelStats = document.getElementById('adminPanelStats');
        adminDishList = document.getElementById('adminDishList');
        adminCategoryFilter = document.getElementById('adminCategoryFilter');
        
        // Form elements are already initialized at the top of the file
        
        if (!adminModal) {
            console.error('Admin modal not found in the DOM');
            return false;
        }
        
        // Log initialization state
        const elementsInitialized = {
            adminModal: !!adminModal,
            adminLock: !!adminLock,
            adminContent: !!adminContent,
            adminCode: !!adminCode,
            adminUnlock: !!adminUnlock,
            adminError: !!adminError,
            adminPanelMenu: !!adminPanelMenu,
            adminPanelStats: !!adminPanelStats,
            adminDishList: !!adminDishList,
            adminCategoryFilter: !!adminCategoryFilter
        };
        
        console.log('Admin elements initialized:', elementsInitialized);
        
        // Initialize tab functionality if elements exist
        const tabButtons = document.querySelectorAll('#adminModal .tab-btn');
        if (tabButtons.length > 0) {
            console.log('Initializing admin tabs...');
            tabButtons.forEach(btn => {
                if (!(btn instanceof HTMLElement)) return;
                
                manageEventListener(btn, 'click', () => {
                    const buttons = document.querySelectorAll('#adminModal .tab-btn');
                    buttons.forEach(b => b?.classList?.remove('active'));
                    btn?.classList?.add('active');
                    const tab = btn?.getAttribute('data-tab');
                    
                    if (tab === 'menu') {
                        if (adminPanelMenu) adminPanelMenu.style.display = 'block';
                        if (adminPanelStats) adminPanelMenu.style.display = 'none';
                    } else {
                        if (adminPanelMenu) adminPanelMenu.style.display = 'none';
                        if (adminPanelStats) {
                            adminPanelStats.style.display = 'block';
                            try {
                                updateStatsUI();
                            } catch (e) {
                                console.error('Error updating stats UI:', e);
                            }
                        }
                    }
                });
            });
        }

        // Close button
        closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            // Use our managed event listener to prevent duplicates
            manageEventListener(closeAdminModal, 'click', hideAdminModal);
        } else {
            console.warn('Close admin button not found');
        }
        
        // Click outside to close
        manageEventListener(adminModal, 'click', (e) => {
            if (e.target === adminModal) hideAdminModal();
        });

        // Unlock functionality
        if (adminUnlock) {
            manageEventListener(adminUnlock, 'click', unlockAdmin);
        } else {
            console.warn('Admin unlock button not found');
        }
        
        if (adminCode) {
            manageEventListener(adminCode, 'keydown', (e) => {
                if (e.key === 'Enter') unlockAdmin();
            });
        }

        // Menu toolbar initialization with null checks
        const toolbarElements = [
            { 
                id: 'btnAddDish', 
                action: (e) => {
                    e.preventDefault();
                    openDishForm();
                }
            },
            { 
                id: 'btnImport', 
                action: (e) => {
                    e.preventDefault();
                    document.getElementById('excelImport')?.click();
                }
            },
            { id: 'excelImport', event: 'change', action: handleExcelImport },
            { 
                id: 'btnExport', 
                action: (e) => {
                    e.preventDefault();
                    handleExcelExport();
                }
            },
            { 
                id: 'btnResetMenu', 
                action: (e) => {
                    e.preventDefault();
                    if (confirm('Êtes-vous sûr de vouloir réinitialiser le menu ? Cette action est irréversible.')) {
                        resetMenuData();
                    }
                }
            },
            { id: 'adminCategoryFilter', event: 'change', action: renderAdminDishList }
        ];

        // Initialize form elements when the admin panel is shown
        const initFormElements = () => {
            const formElements = [
                { id: 'saveDishBtn', event: 'click', action: handleSaveDish },
                { id: 'cancelEditBtn', event: 'click', action: () => {
                    const form = document.getElementById('dishFormContainer');
                    if (form) form.style.display = 'none';
                }}
            ];

            formElements.forEach(item => {
                const element = document.getElementById(item.id);
                if (element) {
                    // Remove any existing listeners to prevent duplicates
                    const existing = eventListeners.get(element);
                    if (existing && existing[item.event]) {
                        element.removeEventListener(item.event, item.action);
                    }
                    // Add new listener
                    manageEventListener(element, item.event, item.action);
                }
            });
        };

        // Initialize visible toolbar elements
        toolbarElements.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                manageEventListener(element, item.event || 'click', item.action);
            }
        });

        // Initialize form elements when the admin content is shown
        const observer = new MutationObserver((mutations) => {
            if (adminContent && adminContent.offsetParent !== null) {
                // Admin content is now visible
                initFormElements();
            }
        });

        if (adminContent) {
            observer.observe(adminContent, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                childList: false,
                subtree: false
            });
        }

        // Also initialize immediately in case the form is already visible
        if (adminContent && adminContent.offsetParent !== null) {
            initFormElements();
        }

        // Initialize data
        try {
            populateAdminCategories();
            renderAdminDishList();
            console.log('Admin initialization complete');
            return true;
        } catch (e) {
            console.error('Error during admin data initialization:', e);
            return false;
        }
    } catch (error) {
        console.error('Critical error in initAdmin:', error);
        return false;
    }
}

function showAdminModal() {
    console.log('showAdminModal() called');
    
    // Ensure admin elements are initialized
    if (!adminModal) {
        initAdmin(); // Re-initialize if needed
        if (!adminModal) {
            console.error('Admin modal not found in the DOM');
            return;
        }
    }
    
    // Ensure other critical elements exist
    if (!adminLock || !adminContent) {
        console.warn('Some admin elements are missing, reinitializing...');
        initAdmin();
    }
    
    // Get admin elements if not already set
    if (!adminLock) adminLock = document.getElementById('adminLock');
    if (!adminContent) adminContent = document.getElementById('adminContent');
    if (!adminCode) adminCode = document.getElementById('adminCode');
    if (!adminUnlock) adminUnlock = document.getElementById('adminUnlock');
    if (!adminError) adminError = document.getElementById('adminError');
    if (!adminPanelMenu) adminPanelMenu = document.getElementById('adminPanelMenu');
    if (!adminPanelStats) adminPanelStats = document.getElementById('adminPanelStats');
    
    console.log('adminModal element:', adminModal);
    
    // Show the modal
    adminModal.classList.add('show');
    adminModal.setAttribute('aria-hidden', 'false');
    adminModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Update modal content visibility
    if (adminContent) {
        adminContent.style.display = 'none';
        console.log('Admin content hidden');
    }
    
    if (adminLock) {
        adminLock.style.display = 'block';
        adminLock.style.opacity = '1';
        console.log('Admin lock screen shown');
    }
    
    // Focus the code input
    setTimeout(() => {
        if (adminCode) {
            console.log('Focusing admin code input');
            adminCode.focus();
        } else {
            console.warn('Admin code input not found');
        }
    }, 50);
}

function hideAdminModal() {
    if (!adminModal) {
        adminModal = document.getElementById('adminModal');
    }
    
    if (adminModal) {
        adminModal.classList.remove('show');
        adminModal.setAttribute('aria-hidden', 'true');
        
        // Wait for the transition to complete before hiding
        setTimeout(() => {
            adminModal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
        }, 300); // Match this with your CSS transition duration
    }
}

function unlockAdmin() {
    const code = (adminCode?.value || '').trim();
    if (code === ADMIN_PASSCODE) {
        if (adminError) adminError.style.display = 'none';
        if (adminLock) adminLock.style.display = 'none';
        if (adminContent) adminContent.style.display = 'block';
        populateAdminCategories();
        renderAdminDishList();
        updateStatsUI();
    } else {
        if (adminError) adminError.style.display = 'block';
    }
}

function populateAdminCategories() {
    if (!adminCategoryFilter) return;
    adminCategoryFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Toutes les catégories';
    adminCategoryFilter.appendChild(optAll);
    (menuData.categories || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        adminCategoryFilter.appendChild(opt);
    });
}

// Create an admin dish item element using utility functions
function createAdminDishItem(dish) {
    // Create main container
    const el = createElement('div', 'admin-dish-item');
    
    // Create dish info container
    const infoDiv = createElement('div');
    
    // Create name element
    const nameEl = createElement('strong', '', dish.name);
    
    // Create category span if category exists
    let categoryEl = null;
    if (dish.category) {
        categoryEl = createElement('span', 'muted', ` · ${dish.category}`);
    }
    
    // Create price element
    const priceEl = createElement('span', 'price', ` ${dish.price.toLocaleString()} FCFA`);
    
    // Assemble info div
    infoDiv.appendChild(nameEl);
    if (categoryEl) infoDiv.appendChild(categoryEl);
    infoDiv.appendChild(priceEl);
    
    // Create actions container
    const actionsDiv = createElement('div', 'actions');
    
    // Create edit button
    const editBtn = createElement('button', '', '✏️');
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = dish.id;
    manageEventListener(editBtn, 'click', () => openDishForm(dish));
    
    // Create delete button
    const deleteBtn = createElement('button', '', '🗑️');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = dish.id;
    manageEventListener(deleteBtn, 'click', () => {
        if (confirm(`Supprimer ${dish.name} ?`)) {
            const idx = menuData.dishes.findIndex(x => x.id === dish.id);
            if (idx !== -1) {
                menuData.dishes.splice(idx, 1);
                saveMenuData();
                renderAdminDishList();
                renderAllDishes();
            }
        }
    });
    
    // Assemble actions div
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // Assemble main element
    el.appendChild(infoDiv);
    el.appendChild(actionsDiv);
    
    return el;
}

// Afficher la liste des plats dans l'admin
function renderAdminDishList() {
    if (!adminDishList) return;
    
    // Clear existing content
    adminDishList.innerHTML = '';
    
    // Filter dishes by category if needed
    const cat = adminCategoryFilter?.value || '';
    const dishes = (menuData.dishes || []).filter(d => !cat || d.category === cat);
    
    // Show message if no dishes
    if (!dishes.length) {
        const noDishesMsg = createElement('p', 'muted', 'Aucun plat.');
        adminDishList.appendChild(noDishesMsg);
        return;
    }
    
    // Create and append dish items
    dishes.forEach(dish => {
        const dishItem = createAdminDishItem(dish);
        adminDishList.appendChild(dishItem);
    });
}

function openDishForm(dish) {
    // Ensure form elements are initialized
    if (!dishFormContainer) {
        console.error('Dish form container not found');
        return;
    }
    
    // Initialize form with dish data or empty values
    if (dishId) dishId.value = dish?.id || '';
    if (dishCategory) dishCategory.value = dish?.category || '';
    if (dishName) dishName.value = dish?.name || '';
    if (dishIngredients) dishIngredients.value = dish?.ingredients || '';
    if (dishCalories) dishCalories.value = dish?.calories || '';
    if (dishProteins) dishProteins.value = dish?.proteins || '';
    if (dishPrice) dishPrice.value = dish?.price || '';
    if (dishImageUrl) dishImageUrl.value = dish?.image || '';
    if (dishImageFile) dishImageFile.value = '';
    
    // Show the form
    dishFormContainer.style.display = 'block';
    
    // Focus on the first field
    if (dishName) dishName.focus();
}

function handleSaveDish(e) {
    if (e) e.preventDefault();
    
    try {
        // Ask for confirmation before saving
        if (!confirm('Voulez-vous enregistrer ce plat ?')) {
            return;
        }
        
        // Validate required elements exist
        if (!dishName || !dishCategory || !dishPrice) {
            console.error('Required form elements are missing');
            alert('Erreur: Impossible de sauvegarder. Veuillez rafraîchir la page et réessayer.');
            return;
        }
        
        const id = dishId ? toNumber(dishId.value) : 0;
        const category = (dishCategory.value || '').trim();
        const name = (dishName.value || '').trim();
        const ingredients = dishIngredients ? (dishIngredients.value || '').trim() : '';
        const calories = dishCalories ? toNumber(dishCalories.value) : 0;
        const proteins = dishProteins ? toNumber(dishProteins.value) : 0;
        const price = toNumber(dishPrice.value);
        let image = dishImageUrl ? (dishImageUrl.value || '').trim() : '';

        // Validate required fields
        if (!name || !category || !price) {
            alert('Catégorie, Nom et Prix sont requis.');
            return;
        }

        // Handle image upload if present
        if (dishImageFile && dishImageFile.files && dishImageFile.files[0] && !image) {
            // For now, use object URL; in production, you'd want to upload this to a server
            image = URL.createObjectURL(dishImageFile.files[0]);
        }

        // Ensure menu data is initialized
        menuData = menuData || { dishes: [], categories: [] };
        menuData.dishes = menuData.dishes || [];
        menuData.categories = menuData.categories || [];

        // Ensure category exists
        if (!menuData.categories.some(c => c.name === category)) {
            menuData.categories.push({ name: category });
        }

        // Update or add dish
        if (id) {
            const idx = menuData.dishes.findIndex(x => x.id === id);
            if (idx !== -1) {
                // Update existing dish
                menuData.dishes[idx] = { 
                    ...menuData.dishes[idx], 
                    category, 
                    name, 
                    ingredients, 
                    calories, 
                    proteins, 
                    price, 
                    image 
                };
            }
        } else {
            // Add new dish
            const newDish = { 
                id: nextDishId(menuData.dishes), 
                category, 
                name, 
                ingredients, 
                calories, 
                proteins, 
                price, 
                image 
            };
            menuData.dishes.push(newDish);
        }

        // Save and update UI
        saveMenuData();
        if (dishFormContainer) dishFormContainer.style.display = 'none';
        
        // Refresh UI
        populateAdminCategories();
        renderAdminDishList();
        renderAllDishes();
        
        // Show success message
        alert('Plat enregistré avec succès!');
        
    } catch (error) {
        console.error('Error saving dish:', error);
        alert('Une erreur est survenue lors de la sauvegarde du plat. Veuillez réessayer.');
    }
}

function handleExcelImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = evt.target.result;
            const wb = XLSX.read(data, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!rows.length) return;
            const header = rows[0].map(h => (h||'').toString().trim().toLowerCase());
            const expected = ['categorie','nom','ingrédients','ingredients','calories','protéines (g)','proteines (g)','prix','image'];
            // Basic header validation: must include required keys
            if (!header.includes('categorie') || !header.includes('nom') || !header.includes('prix')) {
                alert('Fichier Excel invalide: colonnes requises manquantes (Categorie, Nom, Prix).');
                return;
            }
            const idx = (lbl) => header.indexOf(lbl);
            const idxCat = idx('categorie');
            const idxNom = idx('nom');
            const idxIng = header.indexOf('ingrédients') !== -1 ? header.indexOf('ingrédients') : header.indexOf('ingredients');
            const idxCal = idx('calories');
            const idxProt = header.indexOf('protéines (g)') !== -1 ? header.indexOf('protéines (g)') : header.indexOf('proteines (g)');
            const idxPrix = idx('prix');
            const idxImg = idx('image');
            const newDishes = [];
            const cats = new Set();
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                const c = (r[idxCat] || '').toString().trim();
                const n = (r[idxNom] || '').toString().trim();
                if (!c || !n) continue;
                const ing = (idxIng >= 0 ? (r[idxIng] || '') : '').toString();
                const cal = toNumber(r[idxCal]);
                const prot = toNumber(r[idxProt]);
                const prix = toNumber(r[idxPrix]);
                const img = (idxImg >= 0 ? (r[idxImg] || '') : '').toString();
                newDishes.push({ id: nextDishId(newDishes), category: c, name: n, ingredients: ing, calories: cal, proteins: prot, price: prix, image: img });
                cats.add(c);
            }
            menuData = { categories: Array.from(cats).map(name => ({ name })), dishes: newDishes };
            saveMenuData();
            populateAdminCategories();
            renderAdminDishList();
            renderAllDishes();
            excelImport.value = '';
        } catch (err) {
            console.error('Import Excel échoué:', err);
            alert('Échec import Excel');
        }
    };
    reader.readAsBinaryString(file);
}

function handleExcelExport() {
    if (!window.XLSX) {
        alert('Bibliothèque Excel non chargée');
        return;
    }
    const header = ['Categorie','Nom','Ingrédients','Calories','Protéines (g)','Prix','Image'];
    const rows = [header];
    (menuData.dishes || []).forEach(d => {
        rows.push([d.category||'', d.name||'', d.ingredients||'', d.calories||'', d.proteins||'', d.price||'', d.image||'']);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu');
    XLSX.writeFile(wb, 'menu.xlsx');
}

function toNumber(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

function nextDishId(extra = []) {
    const all = (menuData.dishes || []).concat(extra || []);
    const maxId = all.reduce((m, d) => Math.max(m, d.id || 0), 0);
    return maxId + 1;
}

function saveMenuData() {
    try {
        // Save to localStorage
        localStorage.setItem('menuDataCustom', JSON.stringify(menuData));
        
        // Update the menuData script tag in the HTML
        const menuDataScript = document.getElementById('menuData');
        if (menuDataScript) {
            // Create a new script element to replace the old one
            const newScript = document.createElement('script');
            newScript.id = 'menuData';
            newScript.type = 'application/json';
            newScript.textContent = JSON.stringify(menuData, null, 2);
            
            // Replace the old script with the new one
            menuDataScript.parentNode.replaceChild(newScript, menuDataScript);
            
            console.log('Menu data saved to both localStorage and HTML');
            return true;
        } else {
            console.warn('menuData script element not found in HTML');
            return false;
        }
    } catch (error) {
        console.error('Error saving menu data:', error);
        return false;
    }
}

function resetMenuData() {
    if (!confirm('Réinitialiser le menu aux données d\'origine ?')) return;
    localStorage.removeItem('menuDataCustom');
    loadMenuData();
    populateAdminCategories();
    renderAdminDishList();
}

// ====== Statistiques Commandes ======
function recordOrder(cartItems) {
    if (!Array.isArray(cartItems) || !cartItems.length) return;
    const stats = JSON.parse(localStorage.getItem('orderStats') || '{"dishes":{},"categories":{}}');
    cartItems.forEach(it => {
        const dishId = it.id;
        const qty = it.quantity || 1;
        stats.dishes[dishId] = (stats.dishes[dishId] || 0) + qty;
        const cat = it.category || 'Autres';
        stats.categories[cat] = (stats.categories[cat] || 0) + qty;
    });
    localStorage.setItem('orderStats', JSON.stringify(stats));
}

function updateStatsUI() {
    const stats = JSON.parse(localStorage.getItem('orderStats') || '{"dishes":{},"categories":{}}');
    if (topDishesList) {
        topDishesList.innerHTML = '';
        const entries = Object.entries(stats.dishes).sort((a,b) => b[1]-a[1]).slice(0, 10);
        entries.forEach(([id, count]) => {
            const dish = (menuData.dishes || []).find(d => String(d.id) === String(id));
            const name = dish ? dish.name : `Plat #${id}`;
            const li = document.createElement('li');
            li.innerHTML = `<span>${name}</span><span class="badge">${count}</span>`;
            topDishesList.appendChild(li);
        });
    }
    if (topCategoriesList) {
        topCategoriesList.innerHTML = '';
        const entries = Object.entries(stats.categories).sort((a,b) => b[1]-a[1]).slice(0, 10);
        entries.forEach(([name, count]) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${name}</span><span class="badge">${count}</span>`;
            topCategoriesList.appendChild(li);
        });
    }
}

// Admin initialization state
let adminInitialized = false;
let adminInitializationInProgress = false;

/**
 * Safely initialize admin components with retry logic
 * @param {number} [retryCount=0] - Current retry attempt
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @returns {Promise<boolean>} True if initialization was successful
 */
function initializeAdminComponents(retryCount = 0, maxRetries = 3) {
    // Prevent multiple initializations
    if (adminInitialized) {
        console.debug('Admin components already initialized');
        return Promise.resolve(true);
    }

    // Prevent concurrent initialization
    if (adminInitializationInProgress) {
        console.debug('Admin initialization already in progress');
        return Promise.resolve(false);
    }

    adminInitializationInProgress = true;
    
    return new Promise((resolve) => {
        const attemptInitialization = () => {
            try {
                console.log(`Initializing admin components${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}...`);
                
                // Find admin elements
                adminModal = document.getElementById('adminModal');
                
                if (!adminModal) {
                    const error = 'Admin modal element not found in the DOM';
                    if (retryCount < maxRetries) {
                        console.warn(`${error} - retrying...`);
                        setTimeout(() => attemptInitialization(), 300 * (retryCount + 1));
                        return;
                    }
                    throw new Error(error);
                }
                
                // Initialize admin functionality
                const adminInitSuccess = initAdmin();
                if (!adminInitSuccess) {
                    throw new Error('Failed to initialize admin functionality');
                }
                
                // Set up event listeners
                initEventListeners();
                
                adminInitialized = true;
                adminInitializationInProgress = false;
                console.log('Admin components initialized successfully');
                resolve(true);
                
            } catch (error) {
                console.error('Error initializing admin components:', error);
                
                if (retryCount < maxRetries) {
                    console.log(`Retrying admin initialization (${retryCount + 1}/${maxRetries})...`);
                    setTimeout(() => initializeAdminComponents(retryCount + 1, maxRetries).then(resolve), 500 * (retryCount + 1));
                } else {
                    console.error('Max retries reached for admin initialization');
                    adminInitializationInProgress = false;
                    resolve(false);
                }
            }
        };
        
        // Start initialization
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            attemptInitialization();
        } else {
            // Wait for DOM to be ready
            const onReady = () => {
                document.removeEventListener('DOMContentLoaded', onReady);
                attemptInitialization();
            };
            document.addEventListener('DOMContentLoaded', onReady);
        }
    });
}

/**
 * Initialize the application when the DOM is fully loaded
 */
function initializeApplication() {
    try {
        console.log('Initializing application...');
        
        // Initialize core functionality
        loadCart();
        loadFavorites();
        updateCartCount();
        renderCartItems();
        
        // Initialize admin components with error handling
        initializeAdminComponents().then(adminInitialized => {
            if (!adminInitialized) {
                console.warn('Admin components failed to initialize. Some features may not be available.');
            }
        }).catch(error => {
            console.error('Error during admin initialization:', error);
        });
        
        console.log('Application initialization complete');
    } catch (error) {
        console.error('Error during application initialization:', error);
    }
}

// ====== MODERN CAROUSEL ======
class ModernCarousel {
    constructor(containerSelector = '.modern-carousel') {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;
        
        // Elements
        this.track = this.container.querySelector('.carousel-track');
        this.prevButton = this.container.querySelector('.carousel-button.prev');
        this.nextButton = this.container.querySelector('.carousel-button.next');
        this.pagination = this.container.querySelector('.carousel-pagination');
        
        // State
        this.currentIndex = 0;
        this.isAnimating = false;
        this.slides = [];
        this.dots = [];
        this.autoSlideInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        // Configuration
        this.config = {
            autoSlide: true,
            autoSlideInterval: 5000, // 5 seconds
            transitionDuration: 500, // ms
            touchSwipeThreshold: 50, // pixels
            debug: false
        };
        
        // Initialize
        this.init();
    }
    
    log(...args) {
        if (this.config.debug) {
            console.log('[ModernCarousel]', ...args);
        }
    }
    
    init() {
        // Create slides from menu categories
        this.createSlides();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize first slide
        this.goToSlide(0);
        
        // Start auto-slide if enabled
        if (this.config.autoSlide) {
            this.startAutoSlide();
        }
        
        this.log('Carousel initialized with', this.slides.length, 'slides');
    }
    
    createSlides() {
        if (!menuData?.categories?.length) {
            this.log('No categories found for carousel');
            return;
        }
        
        // Clear existing slides if any
        this.track.innerHTML = '';
        this.pagination.innerHTML = '';
        this.slides = [];
        this.dots = [];
        
        // Create slides from categories
        menuData.categories.forEach((category, index) => {
            // Skip if no image
            if (!category.image) return;
            
            // Create slide element
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.setAttribute('role', 'tabpanel');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${index + 1} of ${menuData.categories.length}`);
            
            // Create image container with click handler
            const imgContainer = document.createElement('div');
            imgContainer.className = 'carousel-img-container';
            imgContainer.style.cursor = 'pointer';
            imgContainer.setAttribute('role', 'button');
            imgContainer.setAttribute('aria-label', `Voir la catégorie ${category.name || ''}`);
            imgContainer.tabIndex = 0;
            
            // Add click and keyboard event for accessibility
            const handleCategoryClick = (e) => {
                if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
                    e.preventDefault();
                    // Find the category button and click it
                    const categoryButtons = document.querySelectorAll('.category-btn');
                    const targetButton = Array.from(categoryButtons).find(
                        btn => btn.textContent === category.name
                    );
                    if (targetButton) {
                        targetButton.click();
                        // Scroll to menu section
                        const menuSection = document.querySelector('.menu-section');
                        if (menuSection) {
                            menuSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }
            };
            
            imgContainer.addEventListener('click', handleCategoryClick);
            imgContainer.addEventListener('keydown', handleCategoryClick);
            
            // Create image
            const img = document.createElement('img');
            img.src = category.image;
            img.alt = category.name || 'Menu category';
            img.loading = index < 2 ? 'eager' : 'lazy';
            
            // Add hover effect class
            img.className = 'carousel-img-hover';
            
            // Create caption
            const caption = document.createElement('div');
            caption.className = 'carousel-caption';
            
            const title = document.createElement('h3');
            title.textContent = category.name || '';
            
            caption.appendChild(title);
            imgContainer.appendChild(img);
            slide.appendChild(imgContainer);
            slide.appendChild(caption);
            this.track.appendChild(slide);
            
            // Store slide reference
            this.slides.push(slide);
            
            // Create pagination dot
            this.createPaginationDot(index);
        });
        
        this.log('Created', this.slides.length, 'slides');
    }
    
    createPaginationDot(index) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
        dot.setAttribute('aria-selected', 'false');
        dot.setAttribute('aria-controls', `carousel-slide-${index}`);
        
        dot.addEventListener('click', () => this.goToSlide(index));
        
        this.pagination.appendChild(dot);
        this.dots.push(dot);
    }
    
    setupEventListeners() {
        // Navigation buttons
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.prev());
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.next());
        }
        
        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.next();
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                this.goToSlide(this.slides.length - 1);
            }
        });
        
        // Touch events
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.pauseAutoSlide();
        }, { passive: true });
        
        this.container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
            this.resumeAutoSlide();
        }, { passive: true });
        
        // Pause auto-slide on hover
        this.container.addEventListener('mouseenter', () => this.pauseAutoSlide());
        this.container.addEventListener('mouseleave', () => this.resumeAutoSlide());
        
        // Pause auto-slide when tab is not visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoSlide();
            } else {
                this.resumeAutoSlide();
            }
        });
    }
    
    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        
        // Only consider it a swipe if moved more than threshold
        if (Math.abs(diff) > this.config.touchSwipeThreshold) {
            if (diff > 0) {
                this.next(); // Swipe left - next
            } else {
                this.prev(); // Swipe right - previous
            }
        }
    }
    
    goToSlide(index, direction = 0) {
        // Don't animate if already at the target slide
        if (index === this.currentIndex || this.isAnimating) return;
        
        // Handle wrapping around
        const slideCount = this.slides.length;
        if (index >= slideCount) {
            index = 0;
        } else if (index < 0) {
            index = slideCount - 1;
        }
        
        this.isAnimating = true;
        const currentSlide = this.slides[this.currentIndex];
        const nextSlide = this.slides[index];
        
        // Update state
        this.currentIndex = index;
        
        // Update ARIA attributes
        this.updateAriaAttributes();
        
        // Fade transition
        currentSlide.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
        nextSlide.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
        
        // Start transition
        currentSlide.classList.remove('active');
        nextSlide.classList.add('active');
        
        // Clean up after transition
        setTimeout(() => {
            currentSlide.style.transition = '';
            nextSlide.style.transition = '';
            this.isAnimating = false;
        }, this.config.transitionDuration);
        
        this.log('Navigated to slide', index);
    }
    
    updateAriaAttributes() {
        this.slides.forEach((slide, index) => {
            const isActive = index === this.currentIndex;
            slide.setAttribute('aria-hidden', !isActive);
            slide.setAttribute('tabindex', isActive ? '0' : '-1');
            
            if (this.dots[index]) {
                this.dots[index].setAttribute('aria-selected', isActive);
                this.dots[index].classList.toggle('active', isActive);
            }
        });
    }
    
    /**
     * Show the carousel
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.setAttribute('aria-hidden', 'false');
            this.resumeAutoSlide();
        }
    }
    
    /**
     * Hide the carousel
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.container.setAttribute('aria-hidden', 'true');
            this.pauseAutoSlide();
        }
    }
    
    next() {
        this.goToSlide(this.currentIndex + 1);
    }
    
    prev() {
        this.goToSlide(this.currentIndex - 1);
    }
    
    startAutoSlide() {
        if (this.autoSlideInterval) return;
        
        this.autoSlideInterval = setInterval(() => {
            if (!document.hidden) {
                this.next();
            }
        }, this.config.autoSlideInterval);
        
        this.log('Auto-slide started');
    }
    
    pauseAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
            this.log('Auto-slide paused');
        }
    }
    
    resumeAutoSlide() {
        if (this.config.autoSlide && !this.autoSlideInterval) {
            this.startAutoSlide();
        }
    }
    
    destroy() {
        // Clean up event listeners
        if (this.prevButton) {
            this.prevButton.removeEventListener('click', this.prev);
        }
        if (this.nextButton) {
            this.nextButton.removeEventListener('click', this.next);
        }
        
        // Clear auto-slide interval
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
        }
        
        this.log('Carousel destroyed');
    }
}

// Initialize the carousel when the DOM is fully loaded
let modernCarousel;

function initCarousel() {
    modernCarousel = new ModernCarousel();
}

// Start initialization when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // If the document is already loaded, initialize immediately
    setTimeout(initializeApplication, 1);
    setTimeout(initCarousel, 1000); // Slight delay to ensure menu data is loaded
} else {
    // Otherwise, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        initializeApplication();
        // Initialize carousel after a short delay to ensure menu data is loaded
        setTimeout(initCarousel, 1000);
    });
}

// Fonction inutilisée
/*
function showOnlinePaymentOptions() {
    // ...
}
*/

// Ancien code de chargement externe (remplacé par chargement inline)
/*
function loadMenuData() {
    fetch('menu.json')
        .then(response => response.json())
        .then(data => {
            menuData = data;
            renderCategories();
            renderAllDishes();
            initCarousel();
        })
        .catch(error => console.error('Erreur de chargement du menu:', error));
}
*/