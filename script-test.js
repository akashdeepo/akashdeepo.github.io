/* =============================================================================
   AKASH DEEP - PORTFOLIO JAVASCRIPT (TEST VERSION)
   Clean, optimized with Monte Carlo background and single theme toggle
   ============================================================================= */

'use strict';

let monteCarloInstance = null;

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Core functionality
        initializeNavigation();
        initializeThemeSwitcher();
        initializeAnimations();
        initializeLazyLoading();
        
        // Initialize Monte Carlo background
        initializeMonteCarloBackground();

        // Initialize Monte Carlo badge toggle
        initializeMCBadgeToggle();

        // Optional features (only on non-mobile devices)
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 
            window.matchMedia('(hover: hover)').matches) {
            initializeCustomCursor();
        }
        
        // Mark as loaded
        document.body.classList.add('loaded');
        
    } catch (error) {
        console.error('Initialization error:', error);
        document.body.classList.add('loaded');
    }
});

// -----------------------------------------------------------------------------
// NAVIGATION
// -----------------------------------------------------------------------------
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.querySelector('.navbar');

    // Mobile menu toggle
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 64; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Active navigation highlight on scroll
    const updateActiveNavLink = () => {
        let current = '';
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    };

    // Optimize scroll event with throttling
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (scrollTimer) return;
        
        scrollTimer = setTimeout(() => {
            updateActiveNavLink();
            scrollTimer = null;
        }, 16); // ~60fps
    });
}

// -----------------------------------------------------------------------------
// SINGLE THEME SWITCHER
// -----------------------------------------------------------------------------
function initializeThemeSwitcher() {
    const themeToggleBtn = document.querySelector('.theme-toggle-btn');
    const body = document.body;
    
    if (!themeToggleBtn) return;
    
    // Toggle function
    const toggleTheme = () => {
        const currentTheme = body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Apply theme
        body.setAttribute('data-theme', newTheme);
        
        // Update button icon
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Update ARIA label
        themeToggleBtn.setAttribute('aria-label', 
            newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        
        // Store theme preference
        try {
            localStorage.setItem('preferred-theme', newTheme);
        } catch (e) {
            console.warn('Could not save theme preference:', e);
        }
        
        // Update Monte Carlo colors
        if (monteCarloInstance) {
            monteCarloInstance.initializePaths();
        }
    };
    
    // Add click listener
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Load saved theme or detect system preference
    let savedTheme;
    try {
        savedTheme = localStorage.getItem('preferred-theme');
    } catch (e) {
        console.warn('Could not access localStorage:', e);
    }
    
    // Default to system preference if no saved theme
    if (!savedTheme) {
        savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Apply saved theme
    body.setAttribute('data-theme', savedTheme);
    
    // Update button icon and label
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    themeToggleBtn.setAttribute('aria-label', 
        savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

// -----------------------------------------------------------------------------
// MONTE CARLO BACKGROUND
// -----------------------------------------------------------------------------
function initializeMonteCarloBackground() {
    const canvas = document.getElementById('monte-carlo-canvas');
    if (!canvas) return;

    try {
        monteCarloInstance = new MonteCarloBackground('monte-carlo-canvas');
    } catch (error) {
        console.error('Failed to initialize Monte Carlo background:', error);
        // Fallback to regular background
        canvas.style.display = 'none';
    }
}

// -----------------------------------------------------------------------------
// MONTE CARLO BADGE TOGGLE
// -----------------------------------------------------------------------------
function initializeMCBadgeToggle() {
    const badge = document.querySelector('.mc-info-badge');
    if (!badge) return;

    // Toggle expanded state on click
    badge.addEventListener('click', function(e) {
        // Don't toggle if clicking on content when expanded
        if (this.classList.contains('expanded') && e.target !== this && e.target !== this.querySelector('.mc-badge-icon')) {
            return;
        }

        this.classList.toggle('expanded');
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (!badge.contains(e.target) && badge.classList.contains('expanded')) {
            badge.classList.remove('expanded');
        }
    });

    // Prevent closing when clicking inside the badge content
    const badgeContent = badge.querySelector('.mc-badge-content');
    if (badgeContent) {
        badgeContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// -----------------------------------------------------------------------------
// CUSTOM CURSOR (Desktop Only)
// -----------------------------------------------------------------------------
function initializeCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    
    const interactiveElements = document.querySelectorAll('a, button, .timeline-item, .card, .nav-link, .theme-toggle-btn');
    
    let mouseX = 0, mouseY = 0;
    
    // Fast, responsive cursor movement
    const updateCursor = () => {
        cursor.style.transform = `translate(${mouseX - 8}px, ${mouseY - 8}px)`;
    };
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        updateCursor();
    });
    
    // Hover states
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
}

// -----------------------------------------------------------------------------
// SCROLL ANIMATIONS
// -----------------------------------------------------------------------------
function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, .timeline-item, .card, .skill-category');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Stagger animations for grid items
                const parent = entry.target.parentNode;
                if (parent && (parent.classList.contains('grid') || parent.classList.contains('timeline'))) {
                    const delay = Array.from(parent.children).indexOf(entry.target) * 100;
                    entry.target.style.animationDelay = `${delay}ms`;
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(element => {
        element.classList.add('fade-in');
        observer.observe(element);
    });
}

// -----------------------------------------------------------------------------
// LAZY LOADING
// -----------------------------------------------------------------------------
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if (images.length === 0) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('loading');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        img.classList.add('loading');
        imageObserver.observe(img);
    });
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add scroll to top functionality to hero title
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
    heroTitle.addEventListener('click', scrollToTop);
    heroTitle.style.cursor = 'pointer';
    heroTitle.title = 'Click to scroll to top';
}

// -----------------------------------------------------------------------------
// ERROR HANDLING
// -----------------------------------------------------------------------------
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    e.preventDefault();
});

// -----------------------------------------------------------------------------
// PERFORMANCE MONITORING
// -----------------------------------------------------------------------------
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page load time:', Math.round(perfData.loadEventEnd - perfData.loadEventStart), 'ms');
            }
        }, 0);
    });
}

// -----------------------------------------------------------------------------
// EASTER EGG
// -----------------------------------------------------------------------------
console.log(`
🎓 Akash Deep - PhD Mathematical Finance
📧 akash404deep@gmail.com
🔗 https://linkedin.com/in/akashdeepo
⚡ Built with Monte Carlo simulations
`);

// Export functions for testing (if in module environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeMonteCarloBackground,
        initializeNavigation,
        initializeAnimations,
        initializeThemeSwitcher
    };
}