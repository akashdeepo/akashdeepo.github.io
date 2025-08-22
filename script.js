/* =============================================================================
   AKASH DEEP - PORTFOLIO JAVASCRIPT
   Clean, optimized, and professional
   ============================================================================= */

'use strict';

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
        
        // Initialize particles only if library is loaded
        if (typeof particlesJS !== 'undefined') {
            initializeParticles();
        }
        
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
// THEME SWITCHER
// -----------------------------------------------------------------------------
function initializeThemeSwitcher() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    const body = document.body;
    
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            
            // Update ARIA states
            themeButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            
            // Set active theme
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            
            // Apply theme
            body.setAttribute('data-theme', theme);
            
            // Store theme preference
            try {
                localStorage.setItem('preferred-theme', theme);
            } catch (e) {
                console.warn('Could not save theme preference:', e);
            }
            
            // Reinitialize particles with new colors
            if (typeof particlesJS !== 'undefined') {
                setTimeout(() => initializeParticles(), 100);
            }
        });
    });
    
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
    
    const savedThemeButton = document.querySelector(`[data-theme="${savedTheme}"]`);
    if (savedThemeButton) {
        themeButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        savedThemeButton.classList.add('active');
        savedThemeButton.setAttribute('aria-pressed', 'true');
        body.setAttribute('data-theme', savedTheme);
    }
}

// -----------------------------------------------------------------------------
// PARTICLES BACKGROUND
// -----------------------------------------------------------------------------
function initializeParticles() {
    if (!document.getElementById('particles-js')) return;
    
    const theme = document.body.getAttribute('data-theme') || 'light';
    const themeColors = {
        dark: ['#e88762', '#da7756', '#bd5d3a'],
        light: ['#da7756', '#bd5d3a', '#8B7355']
    };
    const colors = themeColors[theme] || themeColors.light;
    
    try {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 80,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: colors
                },
                shape: {
                    type: 'circle',
                    stroke: {
                        width: 0,
                        color: '#000000'
                    }
                },
                opacity: {
                    value: 0.3,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 3,
                    random: true,
                    anim: {
                        enable: true,
                        speed: 2,
                        size_min: 0.1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: colors[0],
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'grab'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 140,
                        line_linked: {
                            opacity: 0.5
                        }
                    },
                    push: {
                        particles_nb: 4
                    }
                }
            },
            retina_detect: true
        });
    } catch (error) {
        console.error('Failed to initialize particles:', error);
    }
}

// -----------------------------------------------------------------------------
// CUSTOM CURSOR (Desktop Only)
// -----------------------------------------------------------------------------
function initializeCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    
    const interactiveElements = document.querySelectorAll('a, button, .timeline-item, .card, .nav-link');
    
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
⚡ Built with modern web technologies
`);

// Export functions for testing (if in module environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeParticles,
        initializeNavigation,
        initializeAnimations
    };
}