/* Page wiring: mode toggle, scroll → tape, active paper → overlay, reveals, BibTeX copy. */
'use strict';

(function () {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const root = document.documentElement;

    /* ── tape ── */
    const canvas = document.getElementById('tape');
    const tape = new Tape(canvas);
    window.tape = tape;

    const hero = document.querySelector('.hero');
    const sections = Array.from(document.querySelectorAll('main .sec'));
    const papers = Array.from(document.querySelectorAll('.paper'));
    const rail = Array.from(document.querySelectorAll('.rail a'));
    const level = document.getElementById('level');
    const chg = document.getElementById('chg');
    const regimeEl = document.getElementById('regime');
    const clockEl = document.getElementById('clock');
    const quote = document.querySelector('.quote');
    const instrument = document.getElementById('instrument');

    const SECTION_REGIME = { research: 'calm', papers: 'calm', experience: 'steady', record: 'steady', contact: 'close' };

    function layout() {
        const y = window.scrollY;
        const top = (el) => el.getBoundingClientRect().top + y;
        const schedule = [{ start: 0, name: 'calm' }];
        const markers = [];
        sections.forEach(s => {
            const st = Math.floor(top(s) / tape.pxPerStep) + tape.W0;
            schedule.push({ start: st, name: SECTION_REGIME[s.id] || 'calm' });
            const num = s.querySelector('.num')?.textContent || '';
            markers.push({ step: st, label: `${num} ${s.id}` });
        });
        papers.forEach((p, i) => {
            const st = Math.floor((top(p) - window.innerHeight * 0.35) / tape.pxPerStep) + tape.W0;
            schedule.push({ start: st, name: p.dataset.overlay });
            markers.push({ step: st, label: `P${i + 1}`, paper: true });
        });
        tape.setSchedule(schedule);
        tape.setMarkers(markers);
    }

    /* ── scroll state ── */
    let activePaper = null, hoverPaper = null;
    function onScroll() {
        const y = window.scrollY;
        tape.setScroll(y);
        const hh = hero.offsetHeight;
        tape.setDock(y / (hh * 0.7));

        // hero quote fades as the tape docks
        const f = Math.max(0, 1 - y / (hh * 0.45));
        quote.style.opacity = (0.92 * f).toFixed(3);
        quote.style.transform = `translateY(${(1 - f) * 30}px)`;
        instrument.style.opacity = f.toFixed(3);

        // active paper: nearest to a focus line at 42% of the viewport
        const focus = window.innerHeight * 0.42;
        let best = null, bd = Infinity;
        for (const p of papers) {
            const r = p.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) continue;
            const d = Math.abs((r.top + Math.min(r.height, 220) / 2) - focus);
            if (d < bd) { bd = d; best = p; }
        }
        const inPapers = (() => {
            const r = document.getElementById('papers').getBoundingClientRect();
            return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.3;
        })();
        setActive(inPapers ? best : null);

        // rail
        let cur = null;
        for (const s of sections) { if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) cur = s.id; }
        rail.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    }

    function setActive(p) {
        activePaper = p;
        applyOverlay();
    }
    function applyOverlay() {
        const p = hoverPaper || activePaper;
        papers.forEach(el => el.classList.toggle('active', el === p));
        tape.setOverlay(p ? p.dataset.overlay : null);
    }

    if (hoverCapable) {
        papers.forEach(p => {
            p.addEventListener('pointerenter', () => { hoverPaper = p; applyOverlay(); });
            p.addEventListener('pointerleave', () => { hoverPaper = null; applyOverlay(); });
        });
    }
    papers.forEach(p => {
        p.addEventListener('focusin', () => { hoverPaper = p; applyOverlay(); });
        p.addEventListener('focusout', () => { hoverPaper = null; applyOverlay(); });
    });

    /* ── per-frame readouts ── */
    const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let lastRegime = '', docked = false;
    tape.onFrame = (T) => {
        const d = T.dockE > 0.95;
        if (d !== docked) { docked = d; document.body.classList.toggle('docked', d); }
        if (T.intro < 1 || !T.nowV) return;
        const v = T.nowV;
        level.textContent = fmt.format(v);
        const g = T.g;
        const base = T.value(g.i0);
        const pct = (v / base - 1) * 100;
        chg.textContent = `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}% over the window`;
        const step = Math.floor(T.t);
        if ((step & 3) === 0) {
            clockEl.textContent = `t = ${step}`;
            const s = T.schedule; let name = 'calm';
            for (const r of s) { if (r.start <= step) name = r.name; }
            if (name !== lastRegime) { regimeEl.textContent = `regime ${name}`; lastRegime = name; }
        }
    };

    /* ── mode ── */
    const toggle = document.getElementById('modeToggle');
    function setModeLabel() { toggle.textContent = root.getAttribute('data-mode') === 'night' ? 'day' : 'night'; }
    toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-mode') === 'night' ? 'day' : 'night';
        root.setAttribute('data-mode', next);
        try { localStorage.setItem('tape-mode', next); } catch (e) {}
        setModeLabel();
        tape.refreshColors();
    });
    setModeLabel();

    /* ── shocks ── */
    window.addEventListener('keydown', (e) => {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === 'c') tape.applyShock(Math.floor(tape.t), 'crash');
        if (k === 'v') tape.applyShock(Math.floor(tape.t), 'vol');
    });

    /* ── reveals ── */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        reveals.forEach(el => io.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('in'));
    }

    /* ── bibtex ── */
    function copy(text, btn, label) {
        const done = () => {
            const old = btn.textContent;
            btn.textContent = label || 'copied';
            btn.classList.add('done');
            setTimeout(() => { btn.textContent = old; btn.classList.remove('done'); }, 1600);
        };
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done);
        else {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta); done();
        }
    }
    document.querySelectorAll('.bib[data-i]').forEach(btn => {
        btn.addEventListener('click', () => copy(DOSSIERS[+btn.dataset.i].bibtex, btn));
    });
    document.getElementById('bibtexAll')?.addEventListener('click', (e) => {
        copy(DOSSIERS.map(d => d.bibtex).join('\n\n'), e.currentTarget, 'copied all 8');
    });

    /* ── lifecycle ── */
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return; ticking = true;
        requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });

    let rt;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { tape.resize(); layout(); onScroll(); }, 120);
    });
    document.addEventListener('visibilitychange', () => { document.hidden ? tape.stop() : tape.start(); });

    if (document.fonts?.ready) document.fonts.ready.then(() => { layout(); onScroll(); });
    layout();
    onScroll();
    tape.start();
})();
