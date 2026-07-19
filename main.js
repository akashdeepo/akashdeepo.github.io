/* Estuary — chrome: theme toggle, section nav, bespoke figures,
   dossiers, reveals.

   Every publication draws its own concept as a miniature figure:
     1 rough vs smooth volatility     5 binomial lattice
     2 joint-tail scatter             6 model vs buy-and-hold
     3 spike early-warning            7 Monte Carlo fan
     4 heavy vs Gaussian tails        8 walk-forward windows
   At rest each figure is frozen ink; while its paper is hovered
   ("inspected") it runs live, each in its own way.             */

window.addEventListener('DOMContentLoaded', () => {

    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function palette() {
        const cs = getComputedStyle(root);
        const v = (name) => cs.getPropertyValue(name).trim();
        return { paper: v('--paper'), faint: v('--faint'), teal: v('--teal'),
                 moss: v('--moss'), sage: v('--sage'), copper: v('--copper'),
                 ink: v('--ink'), muted: v('--muted') };
    }

    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // standard normal via Box–Muller
    function gauss(rng) {
        let u = 0, v = 0;
        while (u === 0) u = rng();
        while (v === 0) v = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /* ── figure helpers ───────────────────────────────── */

    const W = 236, H = 156, M = 8;   // canvas backing size + margin

    function grid(ctx, c) {
        ctx.strokeStyle = c.faint;
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
            const gy = (H / 4) * g;
            ctx.beginPath(); ctx.moveTo(M, gy); ctx.lineTo(W - M, gy); ctx.stroke();
        }
    }

    function drawSeries(ctx, ys, color, alpha, width) {
        ctx.beginPath();
        ys.forEach((y, i) => {
            const x = M + ((W - 2 * M) / (ys.length - 1)) * i;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function dot(ctx, x, y, r, color, alpha = 1) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    const clampY = (y) => Math.max(M, Math.min(H - M, y));
    const xAt = (i, n) => M + ((W - 2 * M) / (n - 1)) * i;

    /* ── the eight bespoke figures ────────────────────── */

    const FIGURES = [

        /* 1 · Memory & roughness: a rough path against a smooth one */
        (rng) => {
            const N = 40;
            const rough = [], smooth = [];
            let yr = H * 0.42, ys = H * 0.62;
            for (let i = 0; i < N; i++) {
                yr = clampY(yr + (rng() - 0.5) * H * 0.20);
                ys = clampY(ys + (rng() - 0.5) * H * 0.035);
                rough.push(yr); smooth.push(ys);
            }
            return {
                step(rnd) {
                    rough.shift(); smooth.shift();
                    rough.push(clampY(rough[rough.length - 1] + (rnd() - 0.5) * H * 0.20));
                    smooth.push(clampY(smooth[smooth.length - 1] + (rnd() - 0.5) * H * 0.035));
                },
                draw(ctx, c) {
                    grid(ctx, c);
                    drawSeries(ctx, smooth, c.moss, 0.55, 2);
                    drawSeries(ctx, rough, c.teal, 0.95, 2.2);
                    dot(ctx, W - M, rough[rough.length - 1], 3.5, c.copper);
                },
            };
        },

        /* 2 · Tails: correlated scatter, the sparse joint tail boxed */
        (rng) => {
            const rho = 0.62, pts = [];
            const toXY = (z1, z2) => ({
                x: M + ((z1 + 3) / 6) * (W - 2 * M),
                y: H - M - ((z2 + 3) / 6) * (H - 2 * M),
            });
            const sample = (rnd) => {
                const z1 = gauss(rnd), z2 = rho * z1 + Math.sqrt(1 - rho * rho) * gauss(rnd);
                return { z1: Math.max(-3, Math.min(3, z1)), z2: Math.max(-3, Math.min(3, z2)), age: 0 };
            };
            for (let i = 0; i < 64; i++) { const p = sample(rng); p.age = 99; pts.push(p); }
            return {
                step(rnd) {
                    pts.shift();
                    pts.push(sample(rnd));
                    pts.forEach(p => p.age++);
                },
                draw(ctx, c) {
                    // the joint lower tail, where the paper lives
                    const box = toXY(-1.4, -1.4);
                    ctx.setLineDash([3, 3]);
                    ctx.strokeStyle = c.copper;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(M, box.y, box.x - M, H - M - box.y);
                    ctx.setLineDash([]);
                    for (const p of pts) {
                        const { x, y } = toXY(p.z1, p.z2);
                        const inTail = p.z1 < -1.4 && p.z2 < -1.4;
                        const fresh = p.age < 4;
                        dot(ctx, x, y, fresh ? 2.6 : 1.8,
                            inTail || fresh ? c.copper : c.teal,
                            fresh ? 0.95 : (inTail ? 0.85 : 0.45));
                    }
                },
            };
        },

        /* 3 · Early warning: calm line, warning dots fire before spikes */
        (rng) => {
            const N = 40, CYCLE = 14, WARN = 6, SPIKE = 9;
            const ys = [], marks = [];
            let tick = Math.floor(rng() * CYCLE);
            const value = (ph, rnd) => {
                const base = H * 0.68 + (rnd() - 0.5) * H * 0.05;
                if (ph === SPIKE) return base - H * 0.38;
                if (ph === SPIKE + 1) return base - H * 0.22;
                return base;
            };
            for (let i = 0; i < N; i++) {
                const ph = (tick + i) % CYCLE;
                ys.push(clampY(value(ph, rng)));
                marks.push(ph === WARN);
            }
            tick += N;
            return {
                step(rnd) {
                    const ph = tick % CYCLE; tick++;
                    ys.shift(); marks.shift();
                    ys.push(clampY(value(ph, rnd)));
                    marks.push(ph === WARN);
                },
                draw(ctx, c) {
                    grid(ctx, c);
                    drawSeries(ctx, ys, c.teal, 0.95, 2.2);
                    marks.forEach((m, i) => {
                        if (m) dot(ctx, xAt(i, ys.length), ys[i] - 12, 2.8, c.copper);
                    });
                },
            };
        },

        /* 4 · Heavy tails: Student-t over Gaussian, samples raining down */
        (rng) => {
            const ticks = [];
            const curveY = (f) => H - M - f * (H - 2 * M) * 0.82;
            const gaussF = (z) => Math.exp(-z * z / 2);
            const tF = (z) => Math.pow(1 + (z * z) / 3, -2);
            const sampleTick = (rnd) => {
                let z = gauss(rnd);
                const extreme = rnd() < 0.10;
                if (extreme) z *= 2.4;
                return { z: Math.max(-3, Math.min(3, z)), extreme, age: 0 };
            };
            for (let i = 0; i < 14; i++) { const t = sampleTick(rng); t.age = Math.floor(rng() * 10); ticks.push(t); }
            return {
                step(rnd) {
                    ticks.push(sampleTick(rnd));
                    ticks.forEach(t => t.age++);
                    while (ticks.length && ticks[0].age > 18) ticks.shift();
                },
                draw(ctx, c) {
                    // two densities
                    const curve = (f, color, width, alpha) => {
                        ctx.beginPath();
                        for (let px = M; px <= W - M; px += 3) {
                            const z = ((px - M) / (W - 2 * M)) * 6 - 3;
                            const y = curveY(f(z));
                            if (px === M) ctx.moveTo(px, y); else ctx.lineTo(px, y);
                        }
                        ctx.strokeStyle = color; ctx.lineWidth = width;
                        ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1;
                    };
                    curve(gaussF, c.sage, 1.6, 0.6);
                    curve(tF, c.teal, 2.2, 0.95);
                    // sampled returns land on the axis; extremes in copper
                    for (const t of ticks) {
                        const px = M + ((t.z + 3) / 6) * (W - 2 * M);
                        ctx.beginPath();
                        ctx.moveTo(px, H - M);
                        ctx.lineTo(px, H - M - 9);
                        ctx.strokeStyle = t.extreme ? c.copper : c.muted;
                        ctx.lineWidth = t.extreme ? 2 : 1.2;
                        ctx.globalAlpha = Math.max(0.1, 1 - t.age / 18);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                },
            };
        },

        /* 5 · Binomial lattice, one priced path lighting up through it */
        (rng) => {
            const L = 6;                       // levels
            const nodeXY = (l, k) => ({
                x: M + ((W - 2 * M) / L) * l,
                y: H / 2 + (k - l / 2) * ((H - 2 * M) / L) * 0.9,
            });
            let path = [0];
            for (let l = 1; l <= L; l++) path.push(path[l - 1] + (rng() > 0.5 ? 1 : 0));
            let progress = L;                  // fully drawn at rest
            return {
                step(rnd) {
                    progress++;
                    if (progress > L + 3) {    // pause, then reprice a new path
                        path = [0];
                        for (let l = 1; l <= L; l++) path.push(path[l - 1] + (rnd() > 0.5 ? 1 : 0));
                        progress = 0;
                    }
                },
                draw(ctx, c) {
                    // lattice edges
                    ctx.strokeStyle = c.muted;
                    ctx.globalAlpha = 0.35;
                    ctx.lineWidth = 1;
                    for (let l = 0; l < L; l++) {
                        for (let k = 0; k <= l; k++) {
                            const a = nodeXY(l, k), b = nodeXY(l + 1, k), d = nodeXY(l + 1, k + 1);
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(d.x, d.y); ctx.stroke();
                        }
                    }
                    ctx.globalAlpha = 1;
                    // nodes
                    for (let l = 0; l <= L; l++)
                        for (let k = 0; k <= l; k++) {
                            const n = nodeXY(l, k);
                            dot(ctx, n.x, n.y, 1.6, c.ink, 0.35);
                        }
                    // the priced path
                    const upto = Math.min(progress, L);
                    if (upto > 0) {
                        ctx.beginPath();
                        for (let l = 0; l <= upto; l++) {
                            const n = nodeXY(l, path[l]);
                            if (l === 0) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x, n.y);
                        }
                        ctx.strokeStyle = c.copper;
                        ctx.lineWidth = 2.2;
                        ctx.stroke();
                        const end = nodeXY(upto, path[upto]);
                        dot(ctx, end.x, end.y, 3.2, c.copper);
                    }
                },
            };
        },

        /* 6 · Honest result: model is smoother — and below buy-and-hold */
        (rng) => {
            const N = 40;
            const bh = [], model = [];
            let yb = H * 0.62, ym = H * 0.66;
            for (let i = 0; i < N; i++) {
                yb = clampY(yb - H * 0.006 + (rng() - 0.5) * H * 0.09);
                ym = clampY(ym - H * 0.002 + (rng() - 0.5) * H * 0.028);
                bh.push(yb); model.push(ym);
            }
            return {
                step(rnd) {
                    bh.shift(); model.shift();
                    bh.push(clampY(bh[bh.length - 1] - H * 0.006 + (rnd() - 0.5) * H * 0.09));
                    model.push(clampY(model[model.length - 1] - H * 0.002 + (rnd() - 0.5) * H * 0.028));
                },
                draw(ctx, c) {
                    grid(ctx, c);
                    drawSeries(ctx, bh, c.sage, 0.6, 1.8);
                    drawSeries(ctx, model, c.teal, 0.95, 2.2);
                    dot(ctx, W - M, model[model.length - 1], 3.2, c.copper);
                },
            };
        },

        /* 7 · Monte Carlo fan: many futures from one present */
        (rng) => {
            const K = 13, N = 26;
            const makePath = (rnd) => {
                const ys = [H / 2];
                const drift = (rnd() - 0.5) * H * 0.02;
                for (let i = 1; i < N; i++)
                    ys.push(clampY(ys[i - 1] + drift + (rnd() - 0.5) * H * 0.075));
                return ys;
            };
            const paths = [];
            for (let k = 0; k < K; k++) paths.push(makePath(rng));
            return {
                step(rnd) {
                    paths[Math.floor(rnd() * K)] = makePath(rnd);   // one future re-simulated
                },
                draw(ctx, c) {
                    const pool = [c.teal, c.moss, c.sage];
                    paths.forEach((ys, k) => drawSeries(ctx, ys, pool[k % 3], 0.30, 1.2));
                    // ensemble mean in copper
                    const mean = [];
                    for (let i = 0; i < N; i++)
                        mean.push(paths.reduce((s, ys) => s + ys[i], 0) / K);
                    drawSeries(ctx, mean, c.copper, 0.9, 2.2);
                    dot(ctx, M, H / 2, 3, c.ink, 0.7);
                },
            };
        },

        /* 8 · Walk-forward: flat equity, shallow dip, a window marching */
        (rng) => {
            const N = 40, CYCLE = 22;
            const ys = [];
            let tick = Math.floor(rng() * CYCLE);
            const value = (ph, prev, rnd) => {
                let y = prev - H * 0.0015 + (rnd() - 0.5) * H * 0.02;
                if (ph === 12 || ph === 13) y += H * 0.05;      // the −2.76% dip
                if (ph === 14 || ph === 15) y -= H * 0.045;     // …and recovery
                return clampY(y);
            };
            let prev = H * 0.5;
            for (let i = 0; i < N; i++) { prev = value((tick + i) % CYCLE, prev, rng); ys.push(prev); }
            tick += N;
            let win = 0;
            return {
                step(rnd) {
                    ys.shift();
                    ys.push(value(tick % CYCLE, ys[ys.length - 1], rnd));
                    tick++;
                    win = (win + 1) % N;
                },
                draw(ctx, c) {
                    grid(ctx, c);
                    // rolling test window
                    const w0 = xAt(win, N), w1 = xAt(Math.min(win + 8, N - 1), N);
                    ctx.fillStyle = c.copper;
                    ctx.globalAlpha = 0.12;
                    ctx.fillRect(w0, M, Math.max(2, w1 - w0), H - 2 * M);
                    ctx.globalAlpha = 1;
                    ctx.setLineDash([2, 4]);
                    ctx.strokeStyle = c.copper;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(w0, M); ctx.lineTo(w0, H - M); ctx.stroke();
                    ctx.setLineDash([]);
                    drawSeries(ctx, ys, c.teal, 0.95, 2.2);
                },
            };
        },
    ];

    /* ── figure runner: static at rest, live while inspected ── */

    class FigRunner {
        constructor(canvas, index) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.fig = FIGURES[index % FIGURES.length](mulberry32(index * 1013 + 7));
            this.raf = null;
            this.lastStep = 0;
            this.draw();
        }
        draw() {
            this.ctx.clearRect(0, 0, W, H);
            this.fig.draw(this.ctx, palette());
        }
        start() {
            if (this.raf || reduced) return;
            const loop = (now) => {
                if (now - this.lastStep > 100) {
                    this.fig.step(Math.random);
                    this.draw();
                    this.lastStep = now;
                }
                this.raf = requestAnimationFrame(loop);
            };
            this.raf = requestAnimationFrame(loop);
        }
        stop() {
            if (this.raf) cancelAnimationFrame(this.raf);
            this.raf = null;   // freeze mid-motion
        }
    }

    const runners = Array.from(document.querySelectorAll('.figthumb'))
        .map((canvas, i) => new FigRunner(canvas, i));
    function drawAllThumbs() { runners.forEach(r => r.draw()); }

    document.querySelectorAll('.fig').forEach((fig) => {
        const canvas = fig.querySelector('.figthumb');
        if (!canvas) return;
        const runner = runners.find(r => r.canvas === canvas);
        if (!runner) return;
        fig.addEventListener('mouseenter', () => runner.start());
        fig.addEventListener('mouseleave', () => runner.stop());
        fig.addEventListener('focusin', () => runner.start());
        fig.addEventListener('focusout', () => runner.stop());
    });

    /* ── day / night ──────────────────────────────────── */
    const toggle = document.getElementById('themeToggle');

    function applyLabel() {
        toggle.textContent = root.getAttribute('data-theme') === 'night' ? 'DAY' : 'NIGHT';
    }
    applyLabel();

    toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
        root.setAttribute('data-theme', next);
        localStorage.setItem('estuary-theme', next);
        applyLabel();
        if (window.estuaryRiver) window.estuaryRiver.refreshColors();
        drawAllThumbs();
    });

    /* ── diamond nav active state ─────────────────────── */
    const navLinks = Array.from(document.querySelectorAll('.diamond-nav a'));
    const targets = navLinks
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));

    const navObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            navLinks.forEach(a => a.classList.remove('active'));
            const link = byId.get(entry.target.id);
            if (link) link.classList.add('active');
        }
    }, { rootMargin: '-45% 0px -45% 0px' });

    targets.forEach(t => navObserver.observe(t));

    /* ── publication dossiers — torn scraps in the margin ── */

    const figs = Array.from(document.querySelectorAll('#publications .fig'));
    const pubGrid = document.querySelector('#publications .sheet-grid');
    const pubMargin = document.querySelector('#publications .sheet-margin');
    const hoverCapable = window.matchMedia('(hover: hover)').matches;

    function clearTimers(el) {
        (el._timers || []).forEach(t => { clearTimeout(t); clearInterval(t); cancelAnimationFrame(t); });
        el._timers = [];
    }

    // the stat counts up to its value, odometer-style
    function animateStat(el, statStr) {
        const m = statStr.match(/-?\d+(?:\.\d+)?/);
        if (!m || reduced) { el.textContent = statStr; return; }
        const target = parseFloat(m[0]);
        const decimals = (m[0].split('.')[1] || '').length;
        const prefix = statStr.slice(0, m.index);
        const suffix = statStr.slice(m.index + m[0].length);
        const t0 = performance.now(), DUR = 650;
        const card = el.closest('.dossier');
        function frame(now) {
            const t = Math.min(1, (now - t0) / DUR);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
            if (t < 1) {
                const id = requestAnimationFrame(frame);
                if (card) card._timers.push(id);
            }
        }
        const id = requestAnimationFrame(frame);
        if (card) card._timers.push(id);
    }

    // the sentence writes itself like a note being penned
    function typeNote(el, text) {
        if (reduced) { el.textContent = text; return; }
        el.textContent = text;
        const fullHeight = el.offsetHeight;
        el.style.minHeight = fullHeight + 'px';
        el.textContent = '';
        let i = 0;
        const card = el.closest('.dossier');
        const id = setInterval(() => {
            i += 3;
            el.textContent = text.slice(0, i);
            if (i >= text.length) clearInterval(id);
        }, 16);
        if (card) card._timers.push(id);
    }

    function buildDossier(d) {
        const el = document.createElement('div');
        el.className = 'dossier';
        el._timers = [];
        el.innerHTML = `
            <p class="dossier-stat"></p>
            <p class="dossier-statlabel mono"></p>
            <p class="dossier-note"></p>
            <div class="dossier-actions mono">
                <a target="_blank" rel="noopener">read →</a>
                <button type="button" class="bibtex-btn">copy bibtex ⧉</button>
            </div>`;
        el.querySelector('.dossier-statlabel').textContent = d.statLabel;
        el.querySelector('a').href = d.url;
        const btn = el.querySelector('.bibtex-btn');
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(d.bibtex).then(() => {
                btn.textContent = 'copied ✓';
                setTimeout(() => { btn.textContent = 'copy bibtex ⧉'; }, 1600);
            }).catch(() => { btn.textContent = 'copy failed'; });
        });
        return el;
    }

    function performDossier(el, d) {
        animateStat(el.querySelector('.dossier-stat'), d.stat);
        typeNote(el.querySelector('.dossier-note'), d.note);
    }

    if (typeof DOSSIERS !== 'undefined' && pubGrid && figs.length) {
        /* print: each paper's dossier prints as a note beneath it */
        figs.forEach((fig, i) => {
            const d = DOSSIERS[i];
            if (!d) return;
            const p = document.createElement('p');
            p.className = 'print-dossier';
            p.textContent = `${d.stat} — ${d.statLabel}. ${d.note}`;
            fig.appendChild(p);
        });

        /* one click, the whole bibliography */
        const allBtn = document.getElementById('bibtexAll');
        if (allBtn) {
            allBtn.addEventListener('click', () => {
                const corpus = DOSSIERS.map(d => d.bibtex).join('\n\n');
                navigator.clipboard.writeText(corpus).then(() => {
                    allBtn.textContent = 'copied 8 entries ✓';
                    setTimeout(() => { allBtn.textContent = 'copy all bibtex ⧉'; }, 2000);
                }).catch(() => { allBtn.textContent = 'copy failed'; });
            });
        }

        if (hoverCapable) {
            /* desktop: one floating scrap in the margin column */
            pubGrid.classList.add('dossier-host');
            let card = null;
            let hideTimer = null;

            function showFor(fig, index) {
                const d = DOSSIERS[index];
                if (!d) return;
                clearTimeout(hideTimer);
                if (card) { clearTimers(card); card.remove(); }
                card = buildDossier(d);
                card.classList.add('dossier-float');
                pubGrid.appendChild(card);
                const top = fig.getBoundingClientRect().top - pubGrid.getBoundingClientRect().top;
                card.style.top = `${Math.max(0, top - 6)}px`;
                requestAnimationFrame(() => {
                    if (!card) return;
                    card.classList.add('show');
                    performDossier(card, d);
                });
                if (pubMargin) pubMargin.classList.add('dimmed');
                card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
                card.addEventListener('mouseleave', scheduleHide);
            }

            function scheduleHide() {
                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    if (card) {
                        const c = card;
                        c.classList.remove('show');
                        clearTimers(c);
                        setTimeout(() => c.remove(), 250);
                        card = null;
                    }
                    if (pubMargin) pubMargin.classList.remove('dimmed');
                }, 220);
            }

            figs.forEach((fig, i) => {
                fig.addEventListener('mouseenter', () => showFor(fig, i));
                fig.addEventListener('mouseleave', scheduleHide);
                fig.addEventListener('focusin', () => showFor(fig, i));
                fig.addEventListener('focusout', scheduleHide);
            });
        } else {
            /* touch: the whole card is one tap target — title included.
               Tapping opens the dossier (navigation lives on its
               "read →"); tapping again, or another paper, closes it.  */
            let open = null;   // { fig, card, runner }

            function closeOpen() {
                if (!open) return;
                const { fig, card, runner } = open;
                open = null;
                fig.classList.remove('open');
                if (runner) runner.stop();
                card.classList.remove('show');
                clearTimers(card);
                setTimeout(() => card.remove(), 300);
            }

            figs.forEach((fig, i) => {
                const d = DOSSIERS[i];
                if (!d) return;
                const runner = runners.find(r => r.canvas === fig.querySelector('.figthumb'));

                fig.addEventListener('click', (e) => {
                    // taps inside an open dossier behave normally
                    if (e.target.closest('.dossier')) return;
                    // the title link opens the dossier instead of navigating
                    const a = e.target.closest('a');
                    if (a) e.preventDefault();

                    if (open && open.fig === fig) { closeOpen(); return; }
                    closeOpen();

                    const card = buildDossier(d);
                    card.classList.add('dossier-inline');
                    fig.appendChild(card);
                    fig.classList.add('open');
                    if (runner) runner.start();      // the figure runs while inspected
                    open = { fig, card, runner };
                    requestAnimationFrame(() => {
                        card.classList.add('show');
                        performDossier(card, d);
                        if (!reduced) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    });
                });
            });
        }
    }

    /* ── the trophy numbers count up when seen ────────── */
    const counts = Array.from(document.querySelectorAll('.count'));
    if (!reduced && counts.length) {
        const countObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const el = entry.target;
                countObserver.unobserve(el);
                const raw = el.textContent;
                const target = parseInt(raw.replace(/,/g, ''), 10);
                if (isNaN(target)) continue;
                const grouped = raw.includes(',');
                const t0 = performance.now(), DUR = 900;
                (function frame(now) {
                    const t = Math.min(1, (now - t0) / DUR);
                    const eased = 1 - Math.pow(1 - t, 3);
                    const val = Math.round(target * eased);
                    el.textContent = grouped ? val.toLocaleString('en-US') : String(val);
                    if (t < 1) requestAnimationFrame(frame);
                })(t0);
            }
        }, { rootMargin: '0px 0px -10% 0px' });
        counts.forEach(el => countObserver.observe(el));
    }

    /* ── scroll reveals ───────────────────────────────── */
    if (!reduced) {
        const items = Array.from(document.querySelectorAll(
            '.fig, .entry, .ledger-row, .earlier, .lede, .links li, .letter, .letter-close, .signature'
        ));
        items.forEach((el, i) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${(i % 5) * 70}ms`;
        });
        const revealObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    revealObserver.unobserve(entry.target);
                }
            }
        }, { rootMargin: '0px 0px -8% 0px' });
        items.forEach(el => revealObserver.observe(el));
    }
});
