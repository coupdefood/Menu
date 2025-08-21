// Search functionality for the menu
function initSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchWrapper = document.getElementById('searchWrapper');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchOverlayClose = document.querySelector('.search-overlay-close');
    
    if (!searchToggle || !searchWrapper || !searchInput) return;

    // Toggle search overlay
    searchToggle.addEventListener('click', () => {
        const isExpanded = searchToggle.getAttribute('aria-expanded') === 'true';
        searchToggle.setAttribute('aria-expanded', !isExpanded);
        searchWrapper.setAttribute('aria-hidden', isExpanded);
        
        if (!isExpanded) {
            searchWrapper.classList.add('open');
            searchInput.focus();
        } else {
            searchWrapper.classList.remove('open');
            searchInput.value = '';
            filterDishes('');
        }
    });
    
    // Close search when clicking the close button
    searchOverlayClose?.addEventListener('click', () => {
        searchToggle.setAttribute('aria-expanded', 'false');
        searchWrapper.setAttribute('aria-hidden', 'true');
        searchWrapper.classList.remove('open');
        searchInput.value = '';
        filterDishes('');
    });
    
    // Clear search
    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        filterDishes('');
    });
    
    // Handle search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterDishes(e.target.value.trim().toLowerCase());
        }, 300);
    });
    
    // Close search on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchWrapper.getAttribute('aria-hidden') === 'false') {
            searchToggle.setAttribute('aria-expanded', 'false');
            searchWrapper.setAttribute('aria-hidden', 'true');
            searchWrapper.classList.remove('open');
            searchInput.value = '';
            filterDishes('');
        }
    });
}

// Filter dishes based on search term
function filterDishes(searchTerm) {
    const carousel = document.querySelector('.modern-carousel');
    const menuSection = document.getElementById('menuSection');
    const homeSection = document.getElementById('homeSection');
    
    if (!searchTerm) {
        // If search is empty, show carousel and all dishes
        if (carousel) carousel.style.display = '';
        if (homeSection) homeSection.style.display = '';
        const allDishes = document.querySelectorAll('.dish-card');
        allDishes.forEach(dish => dish.style.display = '');
        return;
    }
    
    // Hide carousel when searching
    if (carousel) carousel.style.display = 'none';
    if (homeSection) homeSection.style.display = 'none';
    
    // Ensure menu section is visible
    if (menuSection) menuSection.style.display = 'block';
    
    // Filter dishes
    const dishes = document.querySelectorAll('.dish-card');
    let hasResults = false;
    
    dishes.forEach(dish => {
        const name = dish.querySelector('.dish-name')?.textContent?.toLowerCase() || '';
        const ingredients = dish.querySelector('.dish-ingredients')?.textContent?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || ingredients.includes(searchTerm)) {
            dish.style.display = '';
            hasResults = true;
        } else {
            dish.style.display = 'none';
        }
    });
    
    // Show no results message if needed
    const noResults = document.getElementById('noResultsMessage');
    if (!hasResults) {
        if (!noResults) {
            const menuContainer = document.getElementById('menuContainer');
            if (menuContainer) {
                const message = document.createElement('div');
                message.id = 'noResultsMessage';
                message.className = 'no-results';
                message.textContent = 'Aucun résultat trouvé pour votre recherche.';
                menuContainer.appendChild(message);
            }
        }
    } else if (noResults) {
        noResults.remove();
    }
}

// Initialize search when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}
