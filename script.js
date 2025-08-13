// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize core functionality
        initializeNavigation();
        initializeThemeSwitcher();
        initializeAnimations();
        initializeCounters();
        initializeSkillBars();
        initializeFloatingActions();
        initializeInteractiveCards();
        initializeLoadingEffects();
        addScrollToTopToTitle();
        
        // Initialize particles only if the library is loaded
        if (typeof particlesJS !== 'undefined') {
            initializeParticles();
        }
        
        // Initialize charts only if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            initializeCharts();
        }
        
        // Initialize optional features
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            initializeCustomCursor();
            initializeSoundEffects();
        }
        
        initializeLazyLoading();
        
        // Mark as loaded
        document.body.classList.add('loaded');
        
    } catch (error) {
        console.error('Initialization error:', error);
        // Fallback - mark as loaded even if some features fail
        document.body.classList.add('loaded');
    }
});

// Particle.js Configuration
function initializeParticles() {
    particlesJS('particles-js', {
        particles: {
            number: {
                value: 100,
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
                value: 0.6,
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
                color: colors[0] || '#6b8cff',
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
                bounce: false,
                attract: {
                    enable: false,
                    rotateX: 600,
                    rotateY: 1200
                }
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
                bubble: {
                    distance: 400,
                    size: 40,
                    duration: 2,
                    opacity: 8,
                    speed: 3
                },
                repulse: {
                    distance: 200,
                    duration: 0.4
                },
                push: {
                    particles_nb: 4
                },
                remove: {
                    particles_nb: 2
                }
            }
        },
        retina_detect: true
    });
}

// Navigation Functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.querySelector('.navbar');

    // Mobile menu toggle
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Active navigation highlight
    window.addEventListener('scroll', function() {
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
    });
}

// Animation Observers
function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in, .research-card, .achievement-card, .experience-item, .skill-category');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Stagger animations for grid items
                if (entry.target.classList.contains('research-card') || 
                    entry.target.classList.contains('achievement-card') ||
                    entry.target.classList.contains('skill-category')) {
                    const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
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

// Counter Animation
function initializeCounters() {
    const counters = document.querySelectorAll('.stat-number, .counter');
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const targetStr = counter.getAttribute('data-target');
                
                // Check if target exists and is valid
                if (!targetStr || targetStr === 'null' || targetStr === 'undefined') {
                    // For Kaggle stats, set specific values
                    if (counter.closest('.achievement-card')) {
                        const label = counter.nextElementSibling?.textContent;
                        if (label && label.includes('Global')) {
                            counter.textContent = 'Top 1%';
                        } else if (label && label.includes('Current')) {
                            counter.textContent = '2,082';
                        } else if (label && label.includes('Total')) {
                            counter.textContent = '202,419';
                        }
                    }
                    counterObserver.unobserve(counter);
                    return;
                }
                
                const target = parseInt(targetStr);
                if (isNaN(target)) {
                    counter.textContent = targetStr;
                    counterObserver.unobserve(counter);
                    return;
                }
                
                const increment = target / 50;
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Skill Bars Animation
function initializeSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');
    
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const skillBar = entry.target;
                const width = skillBar.getAttribute('data-width');
                
                setTimeout(() => {
                    skillBar.style.width = width + '%';
                }, 200);
                
                skillObserver.unobserve(skillBar);
            }
        });
    }, { threshold: 0.5 });

    skillBars.forEach(skillBar => {
        skillObserver.observe(skillBar);
    });
}

// Chart Initialization
function initializeCharts() {
    // Publications Timeline Chart
    const publicationsCtx = document.getElementById('publicationsChart');
    if (publicationsCtx) {
        new Chart(publicationsCtx, {
            type: 'line',
            data: {
                labels: ['2023', '2024', '2025'],
                datasets: [{
                    label: 'Publications',
                    data: [2, 2, 1],
                    borderColor: '#6b8cff',
                    backgroundColor: 'rgba(107, 140, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6b8cff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Publications Timeline',
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#cccccc'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cccccc',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // Skills Radar Chart
    const skillsRadarCtx = document.getElementById('skillsRadar');
    if (skillsRadarCtx) {
        new Chart(skillsRadarCtx, {
            type: 'radar',
            data: {
                labels: ['Python', 'Machine Learning', 'Quantitative Finance', 'Research', 'Web Development', 'Data Analysis'],
                datasets: [{
                    label: 'Skill Level',
                    data: [95, 90, 95, 90, 85, 90],
                    borderColor: '#6b8cff',
                    backgroundColor: 'rgba(107, 140, 255, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#6b8cff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Skills Assessment',
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#cccccc',
                            backdropColor: 'transparent'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: '#ffffff',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }
}

// Lazy Loading
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
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

// Scroll to Top Functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


// Add scroll to top to hero title click
function addScrollToTopToTitle() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.addEventListener('click', scrollToTop);
        heroTitle.style.cursor = 'pointer';
        heroTitle.title = 'Click to scroll to top';
    }
}


// Enhanced Typewriter Effect for Hero Section
function typeWriterEffect() {
    const texts = [
        'Quantitative Finance Researcher',
        'Machine Learning Expert', 
        'AI Innovation Leader',
        'Published Author',
        'Kaggle Competitions Expert'
    ];
    
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (!heroSubtitle) return;
    
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentText = texts[textIndex];
        
        if (isDeleting) {
            const displayText = currentText.substring(0, charIndex - 1);
            heroSubtitle.innerHTML = `${displayText}<span class="cursor-blink">|</span>`;
            charIndex--;
        } else {
            const displayText = currentText.substring(0, charIndex + 1);
            heroSubtitle.innerHTML = `${displayText}<span class="cursor-blink">|</span>`;
            charIndex++;
        }
        
        let typeSpeed = isDeleting ? 50 : 100;
        
        if (!isDeleting && charIndex === currentText.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typeSpeed = 500;
        }
        
        setTimeout(type, typeSpeed);
    }
    
    // Start typewriter effect after a delay
    setTimeout(type, 2000);
}

// Initialize typewriter effect
setTimeout(typeWriterEffect, 1000);


// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        }
        
        .notification-success {
            background: linear-gradient(45deg, #22c55e, #16a34a);
        }
        
        .notification-error {
            background: linear-gradient(45deg, #ef4444, #dc2626);
        }
        
        .notification-info {
            background: linear-gradient(45deg, #6b8cff, #5a7cfa);
        }
        
        .notification.show {
            transform: translateX(0);
        }
    `;
    
    if (!document.querySelector('#notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}


// Analytics and Tracking (placeholder)
function initializeAnalytics() {
    // Add analytics tracking code here
    console.log('Analytics initialized');
    
    // Track page views, user interactions, etc.
    const trackEvent = (category, action, label) => {
        console.log(`Event: ${category} - ${action} - ${label}`);
        // Send to analytics service
    };
    
    // Track button clicks
    document.querySelectorAll('.btn, .social-link, .research-link').forEach(element => {
        element.addEventListener('click', (e) => {
            const elementType = e.target.closest('.btn') ? 'button' : 
                               e.target.closest('.social-link') ? 'social' : 'link';
            trackEvent('Click', elementType, e.target.textContent.trim());
        });
    });
}

// Initialize analytics
initializeAnalytics();

// Optimized Custom Cursor
function initializeCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    const interactiveElements = document.querySelectorAll('a, button, .interactive-card, .nav-link');
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    
    // Use requestAnimationFrame for smooth cursor movement
    function updateCursor() {
        cursorX += (mouseX - cursorX) * 0.1;
        cursorY += (mouseY - cursorY) * 0.1;
        
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        requestAnimationFrame(updateCursor);
    }
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Start the cursor animation
    updateCursor();
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
}

// Theme Switcher with ARIA support
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
            
            // Set theme
            body.setAttribute('data-theme', theme);
            
            // Store theme preference
            try {
                localStorage.setItem('preferred-theme', theme);
            } catch (e) {
                console.warn('Could not save theme preference:', e);
            }
            
            // Add smooth transition
            body.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                body.style.transition = '';
            }, 300);
            
            // Show notification
            showNotification(`Switched to ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`, 'success');
            
            // Reinitialize particles with new colors
            if (typeof particlesJS !== 'undefined') {
                setTimeout(() => {
                    initializeParticles();
                }, 100);
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
        savedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
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

// Floating Actions with Background Music
function initializeFloatingActions() {
    const musicToggleBtn = document.querySelector('.fab.music-toggle');
    
    // Get the audio element from the page
    const backgroundMusic = document.getElementById('backgroundMusic');
    if (backgroundMusic) {
        backgroundMusic.volume = 0.3;
        // Add error handling for audio
        backgroundMusic.addEventListener('error', (e) => {
            console.warn('Audio failed to load:', e);
            musicToggleBtn.style.opacity = '0.5';
            musicToggleBtn.title = 'Audio unavailable';
        });
    }
    
    // Music toggle functionality with error handling
    let musicPlaying = false;
    
    if (musicToggleBtn && backgroundMusic) {
        musicToggleBtn.addEventListener('click', async () => {
            musicPlaying = !musicPlaying;
            
            // Update ARIA state
            musicToggleBtn.setAttribute('aria-pressed', musicPlaying.toString());
            
            if (musicPlaying) {
                try {
                    // Check if audio can play
                    if (backgroundMusic.readyState === 0) {
                        throw new Error('Audio not ready');
                    }
                    
                    backgroundMusic.volume = 0;
                    await backgroundMusic.play();
                    musicToggleBtn.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
                    showNotification('🎵 Music playing', 'success');
                    
                    // Smooth fade in
                    let fadeIn = setInterval(() => {
                        if (backgroundMusic.volume < 0.3) {
                            backgroundMusic.volume = Math.min(0.3, backgroundMusic.volume + 0.05);
                        } else {
                            clearInterval(fadeIn);
                        }
                    }, 100);
                } catch (error) {
                    console.error('Music playback failed:', error);
                    musicPlaying = false;
                    musicToggleBtn.setAttribute('aria-pressed', 'false');
                    
                    if (error.name === 'NotAllowedError') {
                        showNotification('Please interact with the page first to enable music', 'info');
                    } else {
                        showNotification('Music unavailable', 'error');
                    }
                }
            } else {
                try {
                    // Smooth fade out
                    let fadeOut = setInterval(() => {
                        if (backgroundMusic.volume > 0.05) {
                            backgroundMusic.volume -= 0.05;
                        } else {
                            clearInterval(fadeOut);
                            backgroundMusic.pause();
                            backgroundMusic.volume = 0.3;
                        }
                    }, 100);
                    
                    musicToggleBtn.innerHTML = '<i class="fas fa-music" aria-hidden="true"></i>';
                    showNotification('🔇 Music paused', 'info');
                } catch (error) {
                    console.error('Failed to pause music:', error);
                }
            }
            
            // Smooth click animation
            musicToggleBtn.style.transform = 'translateY(-5px) rotate(360deg) scale(1.2)';
            setTimeout(() => {
                musicToggleBtn.style.transform = '';
            }, 500);
        });
    }
    
    // Show/hide music button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            musicToggleBtn.classList.add('show');
        } else {
            musicToggleBtn.classList.remove('show');
        }
    });
    
    // Show music button immediately for easy access
    setTimeout(() => {
        musicToggleBtn.classList.add('show');
    }, 2000);
}

// Interactive Cards
function initializeInteractiveCards() {
    const cards = document.querySelectorAll('.interactive-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) rotateX(5deg) rotateY(5deg) scale(1.02)';
            card.style.boxShadow = '0 25px 50px rgba(0, 212, 255, 0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
        
        card.addEventListener('click', () => {
            card.style.animation = 'cardFloat 0.6s ease';
            setTimeout(() => {
                card.style.animation = '';
            }, 600);
        });
    });
}

// Sound Effects
function initializeSoundEffects() {
    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(frequency, duration, type = 'sine') {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }
    
    // Add sound effects to interactive elements
    document.querySelectorAll('.btn, .nav-link, .theme-btn, .fab').forEach(element => {
        element.addEventListener('click', () => {
            playTone(800, 0.1, 'sine');
        });
        
        element.addEventListener('mouseenter', () => {
            playTone(400, 0.05, 'triangle');
        });
    });
}

// Loading Effects
function initializeLoadingEffects() {
    // Page load animation
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
        
        // Animate elements in sequence
        const elementsToAnimate = document.querySelectorAll('.fade-in');
        elementsToAnimate.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('visible');
            }, index * 100);
        });
    });
    
    // Section entrance animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                
                // Animate child elements
                const children = entry.target.querySelectorAll('.research-card, .achievement-card, .skill-category');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('animate-in');
                    }, index * 150);
                });
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('section').forEach(section => {
        sectionObserver.observe(section);
    });
}

// Particle Configuration
function initializeParticles() {
    if (!document.getElementById('particles-js')) return;
    
    const theme = document.body.getAttribute('data-theme') || 'dark';
    const themeColors = {
        dark: ['#6b8cff', '#8892a8', '#b8c5d6'],
        light: ['#2563eb', '#64748b', '#374151'],
        chill: ['#64748b', '#94a3b8', '#cbd5e1']
    };
    const colors = themeColors[theme] || themeColors.dark;
    
    try {
        particlesJS('particles-js', {
            particles: {
            number: {
                value: 120,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: colors
            },
            shape: {
                type: ['circle', 'triangle', 'polygon'],
                stroke: {
                    width: 0,
                    color: '#000000'
                },
                polygon: {
                    nb_sides: 6
                }
            },
            opacity: {
                value: 0.8,
                random: true,
                anim: {
                    enable: true,
                    speed: 1.5,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 4,
                random: true,
                anim: {
                    enable: true,
                    speed: 3,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: colors[0] || '#00d4ff',
                opacity: 0.4,
                width: 1.5
            },
            move: {
                enable: true,
                speed: 3,
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false,
                attract: {
                    enable: true,
                    rotateX: 600,
                    rotateY: 1200
                }
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
                    distance: 200,
                    line_linked: {
                        opacity: 0.8
                    }
                },
                bubble: {
                    distance: 400,
                    size: 50,
                    duration: 2,
                    opacity: 0.8,
                    speed: 3
                },
                repulse: {
                    distance: 250,
                    duration: 0.4
                },
                push: {
                    particles_nb: 6
                },
                remove: {
                    particles_nb: 2
                }
            }
        },
        retina_detect: true
        });
    } catch (error) {
        console.error('Failed to initialize particles:', error);
    }
}

// Analytics Setup (placeholder for production)
function initializeAnalytics() {
    // Google Analytics 4 (replace GA_MEASUREMENT_ID with actual ID)
    // gtag('config', 'GA_MEASUREMENT_ID');
    
    // Track page load performance
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }, 0);
        });
    }
}

// Console Easter Egg
console.log(`
🚀 Akash Deep's Interactive Resume
📧 akash404deep@gmail.com
🔗 https://linkedin.com/in/akashdeepo
💻 Built with modern web technologies
`);

// Enhanced Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    // Only show error notification in development
    if (window.location.hostname === 'localhost') {
        showNotification('Development error - check console', 'error');
    }
});

// Unhandled Promise Rejection
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    e.preventDefault();
});

// Network status handling
window.addEventListener('online', () => {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Connection lost - some features may not work', 'error');
});

// Initialize analytics
initializeAnalytics();

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeParticles,
        initializeNavigation,
        initializeAnimations,
        showNotification
    };
}