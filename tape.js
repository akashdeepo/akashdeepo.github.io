/* The Tape.
   One seeded stochastic price path drawn behind the whole page.
   - Time is scroll: t = scrollY / pxPerStep, plus a slow real-time clock so it never quite stops.
   - The path is generated lazily and deterministically (seed 1729), so scrolling back rewinds it exactly.
   - The page's sections define a regime schedule: each paper switches the process (volatility level,
     roughness of log-vol, jump intensity). Regimes are a function of step index, so regeneration after
     a resize reproduces the same tape.
   - Log-volatility is a Markovian approximation of rough volatility: two Ornstein–Uhlenbeck factors,
     one slow, one fast; the "rough" regime weights the fast factor heavily.
   - Overlays draw what a given paper measures, on top of the live window. */

'use strict';

class Tape {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.seed = 1729;
        this.S0 = 1000;
        this.baseSigma = 0.0065;

        this.pxPerStep = 2.2;          // scroll pixels per step
        this.stepsPerSec = 3.2;        // idle clock
        this.sx = 3;                   // screen px per step
        this.nowFrac = 0.78;           // where "now" sits inside the rect

        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.mobile = false;

        this.schedule = [{ start: 0, name: 'calm' }];
        this.markers = [];
        this.shocks = [];

        this.scrollSteps = 0;
        this.clock = 0;
        this.dockTarget = 0;
        this.dock = 0;
        this.intro = this.reduced ? 1 : 0;

        this.overlay = null;
        this.overlayP = 0;
        this.prevOverlay = null;
        this.prevP = 0;

        this.lo = 0; this.hi = 1; this.scaleInit = false;
        this.rect = { x: 0, y: 0, w: 1, h: 1 };
        this.last = performance.now();
        this.running = false;
        this.onFrame = null;

        this.reset();
        this.refreshColors();
        this.resize();
    }

    /* ── generation ── */
    static rng(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    static gauss(r) {
        const u = Math.max(r(), 1e-12), v = r();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    static REGIMES = {
        calm:   { vol: 0.85, rough: 0.15, jump: 0,     size: 0 },
        rough:  { vol: 1.05, rough: 1.0,  jump: 0,     size: 0 },
        tails:  { vol: 0.95, rough: 0.3,  jump: 0.012, size: 0.022 },
        trends: { vol: 1.0,  rough: 0.45, jump: 0.006, size: 0.03 },
        heavy:  { vol: 0.95, rough: 0.3,  jump: 0.018, size: 0.028 },
        tree:   { vol: 0.8,  rough: 0.2,  jump: 0,     size: 0 },
        rf:     { vol: 1.15, rough: 0.5,  jump: 0,     size: 0 },
        mc:     { vol: 1.0,  rough: 0.3,  jump: 0,     size: 0 },
        wf:     { vol: 1.0,  rough: 0.4,  jump: 0.004, size: 0.02 },
        steady: { vol: 0.7,  rough: 0.2,  jump: 0,     size: 0, drift: 0.00025 },
        close:  { vol: 0.6,  rough: 0.1,  jump: 0,     size: 0 },
    };

    reset() {
        this.gR = Tape.rng(this.seed);
        this.uR = Tape.rng(this.seed * 7 + 13);
        this.slow = 0; this.fast = 0;
        this.cap = 4096;
        this.S = new Float64Array(this.cap);
        this.ret = new Float64Array(this.cap);
        this.sig = new Float64Array(this.cap);
        this.extra = new Float64Array(this.cap);   // cumulative shock log-level
        this.len = 0;
    }

    grow() {
        const cap = this.cap * 2;
        const g = (a) => { const n = new Float64Array(cap); n.set(a); return n; };
        this.S = g(this.S); this.ret = g(this.ret); this.sig = g(this.sig); this.extra = g(this.extra);
        this.cap = cap;
    }

    regimeAt(i) {
        const s = this.schedule;
        let r = s[0];
        for (let k = 1; k < s.length; k++) { if (s[k].start <= i) r = s[k]; else break; }
        return Tape.REGIMES[r.name] || Tape.REGIMES.calm;
    }

    ensure(n) {
        while (this.len < n) {
            if (this.len >= this.cap) this.grow();
            const i = this.len;
            const R = this.regimeAt(i);
            const e1 = Tape.gauss(this.gR), e2 = Tape.gauss(this.gR), e3 = Tape.gauss(this.gR);
            this.slow += -0.02 * this.slow + 0.055 * e2;
            this.fast += -0.55 * this.fast + 0.55 * e3;
            const lv = 0.6 * this.slow + 0.9 * R.rough * this.fast;
            const sigma = this.baseSigma * R.vol * Math.exp(lv);
            let r = (R.drift || 0) + sigma * e1;
            const u = this.uR();
            if (R.jump && u < R.jump) {
                const sign = this.uR() < 0.62 ? -1 : 1;
                r += sign * R.size * (0.6 + 0.9 * this.uR());
            }
            this.ret[i] = r;
            this.sig[i] = sigma;
            this.S[i] = i === 0 ? this.S0 : this.S[i - 1] * Math.exp(r);
            this.extra[i] = i === 0 ? 0 : this.extra[i - 1];
            this.len++;
        }
    }

    regen() {
        const keep = this.len;
        const shocks = this.shocks.slice();
        this.reset();
        this.shocks = [];
        this.ensure(keep);
        shocks.forEach(s => this.applyShock(s.i, s.kind, true));
    }

    value(i) { return this.S[i] * Math.exp(this.extra[i]); }

    /* ── shocks (the two keyboard easter eggs) ── */
    applyShock(i, kind, record = true) {
        this.ensure(i + 90);
        if (record) this.shocks.push({ i, kind });
        const r = Tape.rng(this.seed + i * 31 + (kind === 'crash' ? 1 : 2));
        if (kind === 'crash') {
            for (let k = 0; k < 40; k++) {
                const d = k < 14 ? -0.0075 : 0.0018 * (r() - 0.35);
                this.addLevel(i + k, d);
            }
        } else {
            for (let k = 0; k < 60; k++) {
                const env = Math.sin((k / 60) * Math.PI);
                this.addLevel(i + k, 0.022 * env * Tape.gauss(r));
            }
        }
    }
    addLevel(i, d) { for (let k = i; k < this.len; k++) this.extra[k] += d; }

    /* ── layout ── */
    setSchedule(list) {
        list.sort((a, b) => a.start - b.start);
        const same = JSON.stringify(list) === JSON.stringify(this.schedule);
        this.schedule = list;
        if (!same) this.regen();
    }
    setMarkers(list) { this.markers = list; }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.vw = window.innerWidth; this.vh = window.innerHeight;
        this.canvas.width = Math.round(this.vw * dpr);
        this.canvas.height = Math.round(this.vh * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.mobile = this.vw <= 880;
        this.sx = this.mobile ? 2 : 3;
        this.nowFrac = this.mobile ? 0.86 : 0.78;
        this.strip = this.mobile ? 132 : 0;
        this.draw(true);
    }

    refreshColors() {
        const cs = getComputedStyle(document.documentElement);
        const g = (n) => cs.getPropertyValue(n).trim();
        this.c = { ink: g('--ink'), muted: g('--muted'), line: g('--line'), hair: g('--hair'), accent: g('--accent'), bg: g('--bg'), surface: g('--surface') };
    }

    setScroll(y) { this.scrollSteps = y / this.pxPerStep; }
    setDock(p) { this.dockTarget = Math.max(0, Math.min(1, p)); }
    setOverlay(id) {
        if (id === this.overlay) return;
        this.prevOverlay = this.overlay; this.prevP = this.overlayP;
        this.overlay = id; this.overlayP = this.reduced ? 1 : 0;
    }

    /* ── run loop ── */
    start() { if (this.running) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.tick.bind(this)); }
    stop() { this.running = false; }
    tick(now) {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
        if (!this.reduced) this.clock += this.stepsPerSec * dt;
        if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 1.4);
        const k = 1 - Math.pow(0.001, dt);
        this.dock += (this.dockTarget - this.dock) * k;
        if (this.overlayP < 1) this.overlayP = Math.min(1, this.overlayP + dt / 0.5);
        if (this.prevP > 0) this.prevP = Math.max(0, this.prevP - dt / 0.25);
        this.draw();
        if (this.onFrame) this.onFrame(this);
        requestAnimationFrame(this.tick.bind(this));
    }

    get t() { return this.scrollSteps + this.clock + this.W0; }
    get W0() { return this.mobile ? 320 : 420; }   // steps already on the tape at load

    /* ── geometry ── */
    computeRect() {
        const e = this.dock < 0.5 ? 4 * this.dock ** 3 : 1 - Math.pow(-2 * this.dock + 2, 3) / 2;
        const full = { x: 0, y: 0, w: this.vw, h: this.vh };
        const docked = this.mobile
            ? { x: 0, y: 0, w: this.vw, h: this.strip }
            : { x: this.vw * 0.56, y: 0, w: this.vw * 0.44, h: this.vh };
        this.rect = {
            x: full.x + (docked.x - full.x) * e,
            y: full.y + (docked.y - full.y) * e,
            w: full.w + (docked.w - full.w) * e,
            h: full.h + (docked.h - full.h) * e,
        };
        this.dockE = e;
    }

    draw(force) {
        const ctx = this.ctx, c = this.c;
        this.computeRect();
        const r = this.rect;
        const t = this.t;
        const W = Math.floor((r.w * this.nowFrac) / this.sx);
        const i1 = Math.floor(t), i0 = Math.max(0, i1 - W);
        this.ensure(i1 + 2);

        // vertical scale: follow the visible window, softly
        let lo = Infinity, hi = -Infinity;
        for (let i = i0; i <= i1; i++) { const v = this.value(i); if (v < lo) lo = v; if (v > hi) hi = v; }
        const pad = (hi - lo) * 0.22 + 1e-6;
        const tlo = lo - pad, thi = hi + pad;
        if (!this.scaleInit || force) { this.lo = tlo; this.hi = thi; this.scaleInit = true; }
        else { this.lo += (tlo - this.lo) * 0.08; this.hi += (thi - this.hi) * 0.08; }

        const padT = this.mobile && this.dockE > 0.5 ? 22 : 90 * (1 - this.dockE) + 70 * this.dockE;
        const padB = this.mobile && this.dockE > 0.5 ? 18 : 110 * (1 - this.dockE) + 60 * this.dockE;
        const g = {
            r, t, W, i0, i1,
            x: (i) => r.x + (i - (t - W)) * this.sx,
            y: (v) => r.y + padT + (this.hi - v) / (this.hi - this.lo) * (r.h - padT - padB),
            nowX: r.x + W * this.sx,
            ink: c.ink, muted: c.muted, line: c.line, hair: c.hair, accent: c.accent, bg: c.bg, surface: c.surface,
            mobile: this.mobile, dock: this.dockE,
        };
        this.g = g;

        ctx.clearRect(0, 0, this.vw, this.vh);

        // docked panel background + edge
        if (this.dockE > 0.01) {
            ctx.globalAlpha = this.dockE;
            ctx.fillStyle = c.bg; ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = c.hair; ctx.lineWidth = 1;
            ctx.beginPath();
            if (this.mobile) { ctx.moveTo(r.x, r.y + r.h - 0.5); ctx.lineTo(r.x + r.w, r.y + r.h - 0.5); }
            else { ctx.moveTo(r.x + 0.5, r.y); ctx.lineTo(r.x + 0.5, r.y + r.h); }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.save();
        ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();

        this.drawGrid(g);
        this.drawMarkers(g);

        // overlays: outgoing then incoming
        if (this.prevOverlay && this.prevP > 0) Tape.OVERLAYS[this.prevOverlay]?.(ctx, this, g, this.prevP, true);
        if (this.overlay && this.overlayP > 0) Tape.OVERLAYS[this.overlay]?.(ctx, this, g, this.overlayP, false);

        this.drawPath(g);
        this.drawNow(g);
        ctx.restore();
    }

    drawGrid(g) {
        const ctx = this.ctx, r = g.r;
        const n = g.mobile && g.dock > 0.5 ? 2 : 5;
        ctx.strokeStyle = g.hair; ctx.lineWidth = 1;
        ctx.fillStyle = g.muted; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        const step = niceStep((this.hi - this.lo) / n);
        const start = Math.ceil(this.lo / step) * step;
        for (let v = start; v < this.hi; v += step) {
            const y = Math.round(g.y(v)) + 0.5;
            ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke();
            if (!(g.mobile && g.dock > 0.5)) ctx.fillText(v.toFixed(0), r.x + r.w - 12, y - 3);
        }
        ctx.textAlign = 'left';
    }

    drawMarkers(g) {
        const ctx = this.ctx, r = g.r;
        ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'top';
        for (const m of this.markers) {
            if (m.step < g.i0 - 40 || m.step > g.i1 + 40) continue;
            const x = Math.round(g.x(m.step)) + 0.5;
            ctx.strokeStyle = m.paper ? g.line : g.hair; ctx.lineWidth = 1;
            ctx.setLineDash(m.paper ? [] : [2, 4]);
            ctx.beginPath(); ctx.moveTo(x, r.y + (g.mobile && g.dock > 0.5 ? 0 : 56)); ctx.lineTo(x, r.y + r.h); ctx.stroke();
            ctx.setLineDash([]);
            if (!(g.mobile && g.dock > 0.5)) {
                ctx.fillStyle = m.paper ? g.ink : g.muted;
                ctx.fillText(m.label, x + 6, r.y + (m.paper ? 74 : 58));
            }
        }
    }

    drawPath(g) {
        const ctx = this.ctx;
        const frac = this.intro;
        const iEnd = g.i0 + (g.i1 - g.i0) * frac;
        ctx.strokeStyle = g.ink; ctx.lineWidth = g.mobile ? 1.2 : 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        let first = true;
        for (let i = g.i0; i <= iEnd; i++) {
            const x = g.x(i), y = g.y(this.value(i));
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        // fractional tail toward "now"
        if (frac >= 1) {
            const f = g.t - g.i1;
            const v = this.value(g.i1) + (this.value(g.i1 + 1) - this.value(g.i1)) * f;
            ctx.lineTo(g.nowX, g.y(v));
            this.nowV = v;
        }
        ctx.stroke();
    }

    drawNow(g) {
        if (this.intro < 1) return;
        const ctx = this.ctx, r = g.r, v = this.nowV;
        const y = g.y(v);
        ctx.strokeStyle = g.line; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.nowX, y + 0.5); ctx.lineTo(r.x + r.w, y + 0.5); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = g.accent;
        ctx.beginPath(); ctx.arc(g.nowX, y, 3, 0, Math.PI * 2); ctx.fill();
        if (!(g.mobile && g.dock > 0.5) && g.dock > 0.05) {
            ctx.globalAlpha = g.dock;
            const label = v.toFixed(2);
            ctx.font = '11px "JetBrains Mono", monospace';
            const w = ctx.measureText(label).width + 12;
            const bx = r.x + r.w - w - 8;
            ctx.fillStyle = g.bg; ctx.fillRect(bx, y - 9, w, 18);
            ctx.strokeStyle = g.accent; ctx.strokeRect(bx + 0.5, y - 8.5, w - 1, 17);
            ctx.fillStyle = g.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            ctx.fillText(label, bx + 6, y + 0.5);
            ctx.globalAlpha = 1;
        }
    }

    /* helpers for overlays */
    caption(g, title, readout, p) {
        const ctx = this.ctx, r = g.r;
        if (g.mobile && g.dock > 0.5) return;
        ctx.globalAlpha = p;
        ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        const x = r.x + 20, y = r.y + 20;
        ctx.fillStyle = g.accent; ctx.fillText(title, x, y);
        ctx.fillStyle = g.muted; ctx.fillText(readout, x, y + 16);
        ctx.globalAlpha = 1;
    }
    windowStats(g) {
        let m = 0, n = 0;
        for (let i = g.i0 + 1; i <= g.i1; i++) { m += this.ret[i]; n++; }
        m /= Math.max(1, n);
        let s = 0;
        for (let i = g.i0 + 1; i <= g.i1; i++) s += (this.ret[i] - m) ** 2;
        return { mean: m, sd: Math.sqrt(s / Math.max(1, n - 1)), n };
    }
}

function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const f = x / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

/* ─────────────── overlays: one per paper ───────────────
   Each receives (ctx, tape, g, p, leaving). p ∈ [0,1] is progress in; when leaving, p fades out. */
Tape.OVERLAYS = {

    // P1 — memory & roughness: a smoothed ghost of the path shows what roughness adds
    rough(ctx, T, g, p) {
        const a = p * (1 - 0.0);
        ctx.globalAlpha = a;
        ctx.strokeStyle = g.accent; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath();
        let ema = T.value(g.i0), first = true;
        for (let i = g.i0; i <= g.i1; i++) {
            ema += (T.value(i) - ema) * 0.08;
            const x = g.x(i), y = g.y(ema);
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        T.caption(g, 'P1 · rough volatility, H ≈ 0.10', 'accent: the long memory under the path', p);
    },

    // P2 — tail scarcity: ±2σ band; observations beyond it are the only data the tails have
    tails(ctx, T, g, p) {
        const { mean, sd } = T.windowStats(g);
        // corridor: where the next value is expected to land, ±2σ around the last one
        ctx.globalAlpha = p * 0.7;
        ctx.fillStyle = g.surface;
        ctx.beginPath();
        for (let i = g.i0 + 1; i <= g.i1; i++) { const x = g.x(i), y = g.y(T.value(i - 1) * Math.exp(mean + 2 * sd)); i === g.i0 + 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        for (let i = g.i1; i > g.i0; i--) ctx.lineTo(g.x(i), g.y(T.value(i - 1) * Math.exp(mean - 2 * sd)));
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = p;
        let n = 0;
        ctx.fillStyle = g.accent;
        for (let i = g.i0 + 1; i <= g.i1; i++) {
            if (Math.abs(T.ret[i] - mean) > 2 * sd) {
                n++;
                ctx.beginPath(); ctx.arc(g.x(i), g.y(T.value(i)), 3.4, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        T.caption(g, 'P2 · where the tails run out of data', `outside ±2σ: ${n} of ${g.i1 - g.i0} observations`, p);
    },

    // P3 — search attention leads volatility: an attention series along the floor, a warning flag when it crosses
    trends(ctx, T, g, p) {
        const r = g.r, lead = 36;
        T.ensure(g.i1 + lead + 2);
        const base = r.y + r.h - (g.mobile && g.dock > 0.5 ? 6 : 34);
        const H = g.mobile && g.dock > 0.5 ? 18 : 64;
        let peak = 0; const att = [];
        for (let i = g.i0; i <= g.i1; i++) {
            let s = 0; for (let k = 0; k < 12; k++) s += T.sig[Math.min(T.len - 1, i + lead + k)];
            s /= 12; att.push(s); if (s > peak) peak = s;
        }
        const thr = peak * 0.72;
        ctx.globalAlpha = p;
        let warned = -1;
        for (let k = 0; k < att.length; k++) {
            const i = g.i0 + k, h = (att[k] / peak) * H;
            ctx.fillStyle = att[k] > thr ? g.accent : g.line;
            ctx.fillRect(g.x(i) - 1, base - h, 2, h);
            if (att[k] > thr && warned < 0) warned = i;
        }
        if (warned >= 0) {
            const x = g.x(warned) + 0.5;
            ctx.strokeStyle = g.accent; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(x, r.y + 60); ctx.lineTo(x, base); ctx.stroke(); ctx.setLineDash([]);
            if (!(g.mobile && g.dock > 0.5)) {
                ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillStyle = g.accent; ctx.textBaseline = 'top';
                ctx.fillText('▲ warning', x + 6, r.y + 62);
            }
        }
        ctx.globalAlpha = 1;
        T.caption(g, 'P3 · search attention as an early warning', 'bars: attention · flag: VIX ≥ 30 ahead', p);
    },

    // P4 — heavy tails: histogram of window returns on the right edge with a Gaussian fit; excess in the tails is accent
    heavy(ctx, T, g, p) {
        if (g.mobile && g.dock > 0.5) { T.caption(g, '', '', p); return; }
        const r = g.r, { mean, sd } = T.windowStats(g);
        const bins = 25, span = 4.5 * sd;
        const counts = new Array(bins).fill(0);
        let n = 0;
        for (let i = g.i0 + 1; i <= g.i1; i++) {
            const z = (T.ret[i] - mean) / span; const b = Math.floor((z + 0.5) * bins);
            if (b >= 0 && b < bins) { counts[b]++; n++; }
        }
        const maxC = Math.max(1, ...counts);
        const x0 = r.x + r.w - 20, wmax = Math.min(130, r.w * 0.24);
        const hgt = Math.min(r.h - 220, 420), yTop = r.y + (r.h - hgt) / 2, bh = hgt / bins;
        ctx.globalAlpha = p;
        for (let b = 0; b < bins; b++) {
            const w = (counts[b] / maxC) * wmax;
            const z = ((b + 0.5) / bins - 0.5) * span / sd;
            ctx.fillStyle = Math.abs(z) > 2.2 ? g.accent : g.line;
            ctx.fillRect(x0 - w, yTop + (bins - 1 - b) * bh + 1, w, bh - 2);
        }
        // gaussian with same mean/sd, scaled to histogram
        ctx.strokeStyle = g.ink; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let b = 0; b <= bins * 4; b++) {
            const z = ((b / (bins * 4)) - 0.5) * span / sd;
            const dens = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
            const expected = n * dens * (span / bins) / sd;
            const w = (expected / maxC) * wmax;
            const y = yTop + hgt - (b / (bins * 4)) * hgt;
            b ? ctx.lineTo(x0 - w, y) : ctx.moveTo(x0 - w, y);
        }
        ctx.stroke();
        // kurtosis
        let m4 = 0, m2 = 0;
        for (let i = g.i0 + 1; i <= g.i1; i++) { const d = T.ret[i] - mean; m2 += d * d; m4 += d ** 4; }
        const kurt = (m4 / n) / Math.pow(m2 / n, 2);
        ctx.globalAlpha = 1;
        T.caption(g, 'P4 · heavy tails vs. the Gaussian', `window returns vs. normal fit · kurtosis ${kurt.toFixed(1)}`, p);
    },

    // P5 — binomial tree from "now", with a bid–ask band on every node
    tree(ctx, T, g, p) {
        const r = g.r, v = T.nowV || T.value(g.i1);
        const steps = g.mobile && g.dock > 0.5 ? 4 : 7;
        const room = r.x + r.w - g.nowX - 28;
        const dx = room / steps;
        const u = 1 + 1.9 * T.sig[g.i1] * 2.2, d = 1 / u;
        const spread = 0.35 * T.sig[g.i1] * 2.2;
        const reach = Math.floor(steps * p) + 1;
        ctx.globalAlpha = p;
        ctx.strokeStyle = g.line; ctx.lineWidth = 1;
        for (let k = 0; k < Math.min(steps, reach); k++) {
            for (let j = 0; j <= k; j++) {
                const s = v * Math.pow(u, j) * Math.pow(d, k - j);
                const x = g.nowX + k * dx, y = g.y(s);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, g.y(s * u)); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, g.y(s * d)); ctx.stroke();
            }
        }
        for (let k = 0; k <= Math.min(steps, reach); k++) {
            for (let j = 0; j <= k; j++) {
                const s = v * Math.pow(u, j) * Math.pow(d, k - j);
                const x = g.nowX + k * dx;
                ctx.strokeStyle = g.accent; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x, g.y(s * (1 - spread))); ctx.lineTo(x, g.y(s * (1 + spread))); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        T.caption(g, 'P5 · binomial tree with microstructure', 'accent ticks: bid–ask spread at each node', p);
    },

    // P6 — random-forest signals at minute frequency: crossover trades, drawdown shaded, Rachev ratio
    rf(ctx, T, g, p) {
        const r = g.r;
        ctx.globalAlpha = p;
        // drawdown shading
        let peak = -Infinity;
        ctx.fillStyle = g.surface;
        ctx.beginPath(); ctx.moveTo(g.x(g.i0), g.y(T.value(g.i0)));
        for (let i = g.i0; i <= g.i1; i++) { peak = Math.max(peak, T.value(i)); ctx.lineTo(g.x(i), g.y(peak)); }
        for (let i = g.i1; i >= g.i0; i--) ctx.lineTo(g.x(i), g.y(T.value(i)));
        ctx.closePath(); ctx.fill();
        // trades from a fast/slow crossover
        let f = T.value(g.i0), s = f, prev = 0, buys = 0, sells = 0;
        let up = 0, dn = 0;
        for (let i = g.i0; i <= g.i1; i++) {
            const v = T.value(i);
            f += (v - f) * 0.18; s += (v - s) * 0.05;
            const sig = Math.sign(f - s);
            if (sig !== prev && i > g.i0 + 10) {
                const x = g.x(i), y = g.y(v);
                ctx.fillStyle = sig > 0 ? g.accent : g.ink;
                ctx.beginPath();
                if (sig > 0) { ctx.moveTo(x, y + 12); ctx.lineTo(x - 4, y + 19); ctx.lineTo(x + 4, y + 19); buys++; }
                else { ctx.moveTo(x, y - 12); ctx.lineTo(x - 4, y - 19); ctx.lineTo(x + 4, y - 19); sells++; }
                ctx.closePath(); ctx.fill();
            }
            prev = sig;
            if (i > g.i0) { const rr = T.ret[i]; if (rr > 0) up += rr; else dn -= rr; }
        }
        ctx.globalAlpha = 1;
        const rach = dn > 0 ? (up / dn) : 0;
        T.caption(g, 'P6 · random forests at minute frequency', `▲ buy ▼ sell · shade: drawdown · gain/loss ${rach.toFixed(2)}`, p);
        void r;
    },

    // P7 — Monte Carlo fan from "now" with an ensemble median
    mc(ctx, T, g, p) {
        const r = g.r, v = T.nowV || T.value(g.i1);
        const N = g.mobile && g.dock > 0.5 ? 14 : 40;
        const room = r.x + r.w - g.nowX - 16;
        const H = Math.max(10, Math.floor(room / T.sx));
        const sd = T.sig[g.i1] * 1.4;
        const paths = [];
        for (let n = 0; n < N; n++) {
            const rr = Tape.rng(T.seed + 977 * n + g.i1 * 0);
            const arr = [v];
            for (let k = 1; k <= H; k++) arr.push(arr[k - 1] * Math.exp(sd * Tape.gauss(rr)));
            paths.push(arr);
        }
        const reach = Math.max(2, Math.floor(H * p));
        ctx.globalAlpha = p * 0.55;
        ctx.strokeStyle = g.line; ctx.lineWidth = 1;
        for (const arr of paths) {
            ctx.beginPath();
            for (let k = 0; k <= reach; k++) { const x = g.nowX + k * T.sx, y = g.y(arr[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
            ctx.stroke();
        }
        ctx.globalAlpha = p;
        ctx.strokeStyle = g.accent; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = 0; k <= reach; k++) {
            const col = paths.map(a => a[k]).sort((a, b) => a - b);
            const med = col[Math.floor(col.length / 2)];
            const x = g.nowX + k * T.sx, y = g.y(med); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        T.caption(g, 'P7 · Monte Carlo scenarios + ensemble', `${N} futures from now · accent: ensemble median`, p);
    },

    // P8 — walk-forward validation: train / test windows marching along the tape
    wf(ctx, T, g, p) {
        const r = g.r, train = 90, test = 30, per = train + test;
        const top = r.y + (g.mobile && g.dock > 0.5 ? 0 : 56), h = r.h - (top - r.y);
        ctx.globalAlpha = p;
        ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'top';
        const start = Math.floor(g.i0 / per) * per;
        for (let s = start; s < g.i1 + per; s += per) {
            const x0 = g.x(s), x1 = g.x(s + train), x2 = g.x(s + per);
            ctx.fillStyle = g.surface; ctx.fillRect(x0, top, x1 - x0, h);
            // hatched test window
            ctx.save(); ctx.beginPath(); ctx.rect(x1, top, x2 - x1, h); ctx.clip();
            ctx.strokeStyle = g.line; ctx.lineWidth = 1;
            for (let xx = x1 - h; xx < x2; xx += 8) { ctx.beginPath(); ctx.moveTo(xx, top + h); ctx.lineTo(xx + h, top); ctx.stroke(); }
            ctx.restore();
            ctx.strokeStyle = g.accent; ctx.beginPath(); ctx.moveTo(Math.round(x1) + 0.5, top); ctx.lineTo(Math.round(x1) + 0.5, top + h); ctx.stroke();
            if (!(g.mobile && g.dock > 0.5)) {
                ctx.fillStyle = g.muted; ctx.fillText('train', x0 + 6, top + 40);
                ctx.fillStyle = g.accent; ctx.fillText('test', x1 + 6, top + 40);
            }
        }
        ctx.globalAlpha = 1;
        T.caption(g, 'P8 · walk-forward, strictly out of sample', 'train → test → roll, never look back', p);
    },
};

window.Tape = Tape;
