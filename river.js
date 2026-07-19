/* ═══════════════════════════════════════════════════════════
   ESTUARY RIVER — the hero canvas.
   ~60 mean-reverting stochastic paths streaming left like a
   current. The flow bends around the cursor; a click drops a
   stone whose wake pushes paths aside and fades.
   ═══════════════════════════════════════════════════════════ */

class EstuaryRiver {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.WALK_LEN = 4096;     // precomputed random-walk samples per path
        this.STEP_PX = 7;         // world px between samples
        this.N_PATHS = 60;
        this.speed = 22;          // px/second of stream flow

        this.scroll = 0;
        this.lastT = 0;
        this.mouse = { x: -1e4, y: -1e4 };
        this.stones = [];
        this.running = false;
        this.visible = true;
        this.shock = null;                                   // 'crash' | 'vol'
        this.introStart = this.reduced ? -1e9 : performance.now();

        this.readColors();
        this.resize();
        this.buildPaths();
        this.updateTarget();

        // re-measure once webfonts land (layout shifts when Fraunces loads)
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => { this.updateTarget(); if (this.reduced) this.drawFrame(); });
        }

        new ResizeObserver(() => { this.resize(); this.updateTarget(); }).observe(canvas);

        const hero = canvas.parentElement;
        hero.addEventListener('pointermove', (e) => {
            const r = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left;
            this.mouse.y = e.clientY - r.top;
            if (this.reduced) this.drawFrame(); // still bend, just not animated
        });
        hero.addEventListener('pointerleave', () => {
            this.mouse.x = -1e4; this.mouse.y = -1e4;
            if (this.reduced) this.drawFrame();
        });
        hero.addEventListener('click', (e) => {
            const r = canvas.getBoundingClientRect();
            this.stones.push({ x: e.clientX - r.left, y: e.clientY - r.top, born: performance.now() });
            if (this.stones.length > 6) this.stones.shift();
            if (this.reduced) this.drawFrame();
        });

        // easter eggs: C drops a crash, V a volatility shock
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            const k = e.key.toLowerCase();
            if (k === 'c') this.triggerShock('crash');
            if (k === 'v') this.triggerShock('vol');
        });

        // pause when the hero is off-screen or the tab is hidden
        new IntersectionObserver((entries) => {
            this.visible = entries[0].isIntersecting;
            this.updateRunning();
        }).observe(hero);
        document.addEventListener('visibilitychange', () => this.updateRunning());

        if (this.reduced) {
            this.drawFrame();
        } else {
            this.updateRunning();
        }
    }

    triggerShock(type) {
        if (this.reduced) return;
        this.shock = { type, born: performance.now() };
    }

    // the currents converge on the word "converges." in the headline
    updateTarget() {
        const word = document.querySelector('.hero h1 em');
        if (!word) { this.target = null; return; }
        const wr = word.getBoundingClientRect();
        const cr = this.canvas.getBoundingClientRect();
        this.target = {
            x: wr.left - cr.left + wr.width / 2,
            y: wr.top - cr.top + wr.height / 2,
            sx: Math.max(wr.width * 1.1, 180),   // width of the pinch
            k: 0.6,                               // pinch strength (0..1)
        };
    }

    readColors() {
        const cs = getComputedStyle(document.documentElement);
        const v = (name) => cs.getPropertyValue(name).trim();
        this.colors = { paper: v('--paper'), teal: v('--teal'), moss: v('--moss'), sage: v('--sage'), copper: v('--copper') };
    }

    refreshColors() {
        this.readColors();
        this.assignPathColors();
        if (this.reduced || !this.running) this.drawFrame();
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        if (!w || !h) return;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = w; this.h = h;
        if (this.reduced && this.paths) this.drawFrame();
    }

    buildPaths() {
        this.paths = [];
        for (let i = 0; i < this.N_PATHS; i++) {
            // per-path character
            const band = 0.30 + 0.44 * Math.random();       // resting depth in the river
            const vol = 0.35 + Math.random() * 0.9;          // volatility of its walk
            const walk = new Float32Array(this.WALK_LEN);
            // Ornstein-Uhlenbeck walk in units of river half-width
            let y = (Math.random() - 0.5) * 0.4;
            for (let s = 0; s < this.WALK_LEN; s++) {
                y += -0.012 * y + (Math.random() - 0.5) * 0.055 * vol;
                walk[s] = y;
            }
            this.paths.push({
                walk, band,
                phase: Math.random() * this.WALK_LEN * this.STEP_PX,
                drift: 0.85 + Math.random() * 0.45,          // relative flow speed
                sway: Math.random() * Math.PI * 2,           // slow vertical breathing
                width: 0.8 + Math.random() * 0.5,
            });
        }
        this.assignPathColors();
    }

    assignPathColors() {
        const { teal, moss, sage, copper } = this.colors;
        const pool = [teal, teal, moss, sage];               // teal-dominant current
        this.paths.forEach((p, i) => {
            const isCopper = i === 11 || i === 43;           // two copper threads
            p.color = isCopper ? copper : pool[i % pool.length];
            p.alpha = isCopper ? 0.75 : 0.14 + Math.random() * 0.25;
            p.isCopper = isCopper;
        });
    }

    // sample a path's walk at world coordinate wx (linear interpolation)
    sampleWalk(p, wx) {
        const idx = (wx / this.STEP_PX) % this.WALK_LEN;
        const i0 = Math.floor(idx), i1 = (i0 + 1) % this.WALK_LEN;
        const f = idx - i0;
        return p.walk[i0] * (1 - f) + p.walk[i1] * f;
    }

    // displacement from cursor and stones — the current bends around them
    deflect(x, y, now) {
        let dy = 0;
        // cursor: gentle steady parting of the stream
        const mdx = x - this.mouse.x, mdy = y - this.mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < 42000) {
            const fall = Math.exp(-md2 / 12000);
            dy += (mdy >= 0 ? 1 : -1) * 46 * fall;
        }
        // stones: strong wake that expands and fades
        for (const s of this.stones) {
            const age = (now - s.born) / 1000;
            if (age > 3) continue;
            const sdx = x - s.x, sdy = y - s.y;
            const r = 40 + age * 130;
            const d2 = sdx * sdx + sdy * sdy;
            const fall = Math.exp(-d2 / (r * r * 0.55));
            const amp = 70 * Math.exp(-age * 1.15);
            dy += (sdy >= 0 ? 1 : -1) * amp * fall;
        }
        return dy;
    }

    drawFrame(now = performance.now()) {
        const { ctx, w, h } = this;
        if (!w || !h) return;
        ctx.fillStyle = this.colors.paper;
        ctx.fillRect(0, 0, w, h);

        this.stones = this.stones.filter(s => (now - s.born) < 3000);

        const halfWidth = h * 0.26;                          // river half-width
        const seg = 10;                                      // px per drawn segment

        // market shocks (C = crash, V = volatility)
        let volMul = 1, crashAmp = 0;
        if (this.shock) {
            const age = (now - this.shock.born) / 1000;
            if (age > 3.2) {
                this.shock = null;
            } else if (this.shock.type === 'vol') {
                volMul = 1 + 2.0 * Math.exp(-age * 1.4);
            } else {
                // dive fast, mean-revert slowly — with extra turbulence
                crashAmp = h * 0.34 * (1 - Math.exp(-age * 6)) * Math.exp(-age * 1.3);
                volMul = 1 + 0.9 * Math.exp(-age * 1.4);
            }
        }

        // opening stroke: on first load the paths draw themselves in
        const introP = Math.min(1, (now - this.introStart) / 1600);

        this.paths.forEach((p, idx) => {
            const baseY = p.band * h + Math.sin(now / 9000 + p.sway) * h * 0.012;
            let maxX = w + seg;
            if (introP < 1) {
                const stagger = (idx / this.paths.length) * 0.35;
                const pp = Math.min(1, Math.max(0, (introP - stagger) / 0.65));
                maxX = -seg + (1 - Math.pow(1 - pp, 3)) * (w + 2 * seg);
            }
            ctx.beginPath();
            for (let x = -seg; x <= maxX; x += seg) {
                const wx = p.phase + this.scroll * p.drift + x;
                let y = baseY + this.sampleWalk(p, wx) * halfWidth * volMul;
                y += crashAmp * (0.7 + 0.6 * p.band);        // deeper water dives harder
                if (this.target) {
                    // gaussian waist: paths pinch toward the word, then fan back out
                    const dx = x - this.target.x;
                    const g = Math.exp(-(dx * dx) / (2 * this.target.sx * this.target.sx));
                    y += (this.target.y - y) * this.target.k * g;
                }
                y += this.deflect(x, y, now);
                if (x === -seg) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.lineWidth = p.isCopper ? 1.5 : p.width;
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // stone ripple rings
        for (const s of this.stones) {
            const age = (now - s.born) / 1000;
            const r = 10 + age * 120;
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = this.colors.copper;
            ctx.globalAlpha = Math.max(0, 0.5 - age * 0.18);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    tick = (now) => {
        if (!this.running) return;
        const dt = Math.min((now - this.lastT) / 1000, 0.05);
        this.lastT = now;
        this.scroll += this.speed * dt;
        this.drawFrame(now);
        requestAnimationFrame(this.tick);
    };

    updateRunning() {
        const should = !this.reduced && this.visible && !document.hidden;
        if (should && !this.running) {
            this.running = true;
            this.lastT = performance.now();
            requestAnimationFrame(this.tick);
        } else if (!should) {
            this.running = false;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('river');
    if (canvas) window.estuaryRiver = new EstuaryRiver(canvas);
});
