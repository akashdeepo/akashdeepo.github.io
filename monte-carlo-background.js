/* =============================================================================
   MONTE CARLO PRICE PATH BACKGROUND
   Sophisticated financial simulation for quantitative finance portfolio
   ============================================================================= */

class MonteCarloBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.paths = [];
        this.mouseX = 0.5;
        this.mouseY = 0.5;
        this.animationId = null;
        
        // Simulation parameters
        this.numPaths = 25;
        this.basePrice = 100;
        this.baseDrift = 0.05;
        this.baseVolatility = 0.2;
        this.timeStep = 0.01;
        this.pathLength = 250;
        this.mouseAttraction = 0.15;
        
        this.setupCanvas();
        this.initializePaths();
        this.bindEvents();
        this.start();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const resizeCanvas = () => {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    initializePaths() {
        this.paths = [];
        for (let i = 0; i < this.numPaths; i++) {
            this.paths.push(this.createPath(i));
        }
    }
    
    createPath(index = 0) {
        // Distribute some paths across the full height for visibility
        const startY = index < this.numPaths * 0.3 ? 
            this.canvas.height * (0.1 + Math.random() * 0.8) : // Full height for first 30%
            this.canvas.height * (0.3 + Math.random() * 0.4);   // Middle area for others
            
        return {
            points: [],
            x: -50 + Math.random() * (this.canvas.width * 0.2), // Start from left side
            y: startY,
            price: this.basePrice * (0.8 + Math.random() * 0.4),
            age: 0,
            maxAge: 400 + Math.random() * 300,
            hue: Math.random() * 60 - 30,
            opacity: 0.4 + Math.random() * 0.4,
            targetX: 0,
            targetY: 0
        };
    }
    
    getThemeColors() {
        const theme = document.body.getAttribute('data-theme') || 'light';
        if (theme === 'dark') {
            return {
                primary: '#e88762',
                secondary: '#da7756',
                tertiary: '#bd5d3a'
            };
        } else {
            return {
                primary: '#da7756',
                secondary: '#bd5d3a',
                tertiary: '#8B7355'
            };
        }
    }
    
    updateMouseInfluence(x, y) {
        this.mouseX = x / window.innerWidth;
        this.mouseY = 1 - (y / window.innerHeight);
    }
    
    bindEvents() {
        // Mouse movement for influence and attraction
        document.addEventListener('mousemove', (e) => {
            this.updateMouseInfluence(e.clientX, e.clientY);
        });
        
        // Click to spawn new paths
        document.addEventListener('click', (e) => {
            this.spawnPathsAtClick(e.clientX, e.clientY);
        });
        
        // Reset mouse influence when leaving window
        document.addEventListener('mouseleave', () => {
            this.mouseX = 0.5;
            this.mouseY = 0.5;
        });
    }
    
    spawnPathsAtClick(x, y) {
        // Create 3-5 new paths at click location
        const numNewPaths = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numNewPaths; i++) {
            const newPath = this.createPath();
            newPath.x = x + (Math.random() - 0.5) * 100;
            newPath.y = y + (Math.random() - 0.5) * 100;
            newPath.opacity = 0.6 + Math.random() * 0.3;
            newPath.maxAge = 200 + Math.random() * 150; // Shorter lived
            this.paths.push(newPath);
        }
        
        // Remove oldest paths to maintain performance
        if (this.paths.length > this.numPaths * 2) {
            this.paths.splice(0, numNewPaths);
        }
    }
    
    simulateNextStep(path) {
        // Mouse influences drift and volatility
        const driftInfluence = (this.mouseX - 0.5) * 0.1;
        const volatilityInfluence = Math.abs(this.mouseY - 0.5) * 0.3;
        
        const drift = this.baseDrift + driftInfluence;
        const volatility = this.baseVolatility + volatilityInfluence;
        
        // Mouse attraction force
        const mousePixelX = this.mouseX * this.canvas.width;
        const mousePixelY = this.mouseY * this.canvas.height;
        const dx = mousePixelX - path.x;
        const dy = mousePixelY - path.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Subtle attraction to mouse (stronger when closer)
        const attractionStrength = this.mouseAttraction / (1 + distance * 0.001);
        const attractionX = dx * attractionStrength * 0.01;
        const attractionY = dy * attractionStrength * 0.01;
        
        // Geometric Brownian Motion: dS = μS dt + σS dW
        const dt = this.timeStep;
        const dW = this.randomNormal() * Math.sqrt(dt);
        
        const dS = drift * path.price * dt + volatility * path.price * dW;
        path.price += dS;
        
        // Prevent price from going negative or too extreme
        path.price = Math.max(0.1, Math.min(path.price, 1000));
        
        // Convert price to screen coordinates with mouse attraction
        const baseMovementX = 1.5; // Base rightward movement
        const priceScale = this.canvas.height * 0.0005;
        
        const newX = path.x + baseMovementX + attractionX;
        const newY = path.y - (dS * priceScale) + attractionY;
        
        path.points.push({
            x: newX,
            y: newY,
            opacity: path.opacity * (1 - path.age / path.maxAge)
        });
        
        path.x = newX;
        path.y = newY;
        path.age++;
        
        // Keep only recent points
        if (path.points.length > this.pathLength) {
            path.points.shift();
        }
        
        // Reset path if it's too old or off screen
        if (path.age > path.maxAge || path.x > this.canvas.width + 100) {
            this.resetPath(path);
        }
    }
    
    resetPath(path) {
        const newPath = this.createPath();
        Object.assign(path, newPath);
    }
    
    randomNormal() {
        // Box-Muller transformation for normal distribution
        if (!this._hasSpare) {
            this._hasSpare = false;
            this._spare = 0;
        }
        
        if (this._hasSpare) {
            this._hasSpare = false;
            return this._spare;
        }
        
        this._hasSpare = true;
        const u = Math.random();
        const v = Math.random();
        const mag = Math.sqrt(-2 * Math.log(u));
        this._spare = mag * Math.cos(2 * Math.PI * v);
        return mag * Math.sin(2 * Math.PI * v);
    }
    
    draw() {
        // Clear canvas with slight fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const colors = this.getThemeColors();
        
        this.paths.forEach((path, pathIndex) => {
            if (path.points.length < 2) return;
            
            // Create gradient for the path
            const gradient = this.ctx.createLinearGradient(
                path.points[0].x, path.points[0].y,
                path.points[path.points.length - 1].x, path.points[path.points.length - 1].y
            );
            
            // Cycle through theme colors
            const colorKeys = Object.keys(colors);
            const primaryColor = colors[colorKeys[pathIndex % colorKeys.length]];
            
            this.ctx.strokeStyle = primaryColor;
            this.ctx.lineWidth = 1 + Math.sin(pathIndex * 0.5) * 0.5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            
            // Draw smooth path using quadratic curves
            for (let i = 0; i < path.points.length - 1; i++) {
                const current = path.points[i];
                const next = path.points[i + 1];
                
                // Fade out older points
                const ageRatio = i / path.points.length;
                const opacity = current.opacity * ageRatio * 0.8;
                
                this.ctx.globalAlpha = opacity;
                
                if (i === 0) {
                    this.ctx.moveTo(current.x, current.y);
                } else {
                    const controlX = (current.x + next.x) / 2;
                    const controlY = (current.y + next.y) / 2;
                    this.ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
                }
            }
            
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        });
    }
    
    animate() {
        // Update all paths
        this.paths.forEach(path => {
            this.simulateNextStep(path);
        });
        
        // Draw
        this.draw();
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    start() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animate();
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    destroy() {
        this.stop();
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonteCarloBackground;
}