# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Akash Deep, a PhD student in Mathematical Finance at Texas Tech University. **Static site with vanilla HTML, CSS, and JavaScript** — no build tools, no frameworks, no package.json. The September 2026 redesign ("The Tape") treats the page as a chart: one seeded stochastic price path runs behind the whole site, scrolling moves its clock, and each publication is an event that changes the process regime and draws that paper's measurement on the live window.

**Live URL**: https://akashdeepo.github.io/

## Commands

```bash
python -m http.server 8000        # serve locally (or: npx serve .) → http://localhost:8000
npx html-validate index.html 404.html                 # HTML validation (same as CI)
npx linkinator . --recurse --skip "^(?!http://localhost)"   # link check (same as CI)
```

There is no test suite. Validation and link checks are the only automated checks, and CI runs both with `|| true`, so **a green workflow does not mean they passed** — run them locally and read the output.

Manual verification checklist after a change:
1. Hard refresh (Ctrl+Shift+R) after CSS changes
2. Test both day and night modes (toggle top-right)
3. Scroll through all eight papers and confirm each overlay draws; hover a paper on desktop
4. Test at a phone width: the tape must dock into a 132px strip at the top and content must scroll *under* it
5. Check `@media print` (Ctrl+P preview) still produces a plain CV

## Architecture

### Active files (production)
Only three scripts are loaded by [index.html](index.html), in this order: `tape.js`, `dossiers.js`, `site.js`. Everything else in the root is archived (see below) or a static asset.

- **[index.html](index.html)** — the whole site, one page: hero (`#top`), then `#research`, `#papers`, `#experience`, `#record`, `#contact`, and a colophon. An inline head script sets `data-mode` (`day` | `night`) on `<html>` before first paint from localStorage key `tape-mode`, falling back to `prefers-color-scheme`. The attribute is deliberately **not** `data-theme` so the page can be embedded in hosts that stamp that attribute.
- **[styles.css](styles.css)** — all styling. Tokens on `:root` (day: paper `#f2f1ec`, ink `#141513`, accent `#b93216`) and `[data-mode="night"]` (paper `#101211`, ink `#ebe9e2`, accent `#ff6236`). Two font families only: **Bricolage Grotesque** (variable; display and body, tuned via `font-variation-settings`) and **JetBrains Mono** (labels, data). Desktop layout is a 56/44 split: `--col` is the reading column, the tape owns the rest. Below 880px the tape docks to a top strip (`--strip: 132px`). `body.docked #tape` raises the canvas above the page once docked so nothing shows through the panel. Includes a full `@media print` CV stylesheet.
- **[tape.js](tape.js)** — `Tape` class, the whole engine. Deterministic generation (seed 1729, mulberry32): log-volatility is a Markovian rough-vol approximation from two OU factors (slow, fast); `REGIMES` set vol level, roughness weight, and jump intensity. `t = scrollY / pxPerStep + realtime clock + W0`; the path array is generated lazily and regenerated whenever the regime schedule changes (resize). Draws grid, section/paper markers, the path, the "now" marker, and the active overlay. `Tape.OVERLAYS` holds one drawing routine per paper keyed by `data-overlay` (`rough`, `tails`, `trends`, `heavy`, `tree`, `rf`, `mc`, `wf`); each receives `(ctx, tape, g, progress)` and calls `tape.caption()`. Keyboard shocks: `c` crash, `v` vol shock, applied as a cumulative log-level (`extra`) and replayed after regeneration.
- **[site.js](site.js)** — wiring: builds the regime schedule and markers from section/paper offsets (`layout()`), maps scroll to tape time and dock progress, picks the active paper (nearest a focus line at 42% of the viewport, hover overrides on fine pointers), updates the hero level readouts each frame, mode toggle, reveals, BibTeX copy from `DOSSIERS`.
- **[dossiers.js](dossiers.js)** — `DOSSIERS` array, one entry per paper in DOM order. Only `bibtex` is used by the current site (`stat`/`note` are duplicated inline in the HTML); keep both in sync when a paper changes.
- **[404.html](404.html)** — standalone page (validated in CI). Still styled in the older Estuary look; harmless.
- **[site.webmanifest](site.webmanifest)**, **[robots.txt](robots.txt)**, **[sitemap.xml](sitemap.xml)**, favicon files.

### Key invariants when editing
- **Papers are matched by DOM order across three places**: the `.paper` items in `#papers`, their `data-overlay` keys into `Tape.OVERLAYS`, and the `DOSSIERS` array (BibTeX buttons use `data-i` = DOM index). Adding a paper means a new list item with a `data-overlay` that exists (or a new overlay routine), a new `DOSSIERS` entry at the same position, and a `data-i` on its button.
- The regime schedule is rebuilt from element offsets; anything that changes page height (fonts, content) triggers `layout()` and a deterministic regeneration, so the tape looks the same for every visitor at a given width.
- **Scholar metrics** (12 publications · 71 citations · h-index 3 · i10-index 2, as of September 2026) live in: the `og:description` meta tag, the `.metrics` line under the earlier-work list, and the `#record` ledger. Per-paper counts are `.cite` spans in each `.phead` and in the earlier-work list. Update all together; Scholar blocks automated fetching, so ask the owner to paste the profile.
- Respect `prefers-reduced-motion`: the tape's real-time clock stops and overlays appear without easing (`tape.reduced`); CSS reveals collapse to a fade.
- The synthetic tape must always be labelled as synthetic (hero instrument line and colophon) — it is not market data.

## Deployment

Automated via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
1. On push/PR to `main`: html-validate and linkinator run (both non-blocking).
2. On push to `main`: `peaceiris/actions-gh-pages@v3` publishes the **entire repo root** with cname `akashdeepo.github.io`.

Because the whole root is published, any committed file is publicly accessible. Don't commit local notes, scratch files, or screenshots. (Two `Screenshot 2025-08-21 *.jpg` files are tracked and live — legacy, safe to remove.)

## Archived files (kept for reference, not loaded)
- The July 2026 "Estuary" site (manuscript look, river hero, `river.js`, `main.js`) lives in git history at commit `cc8cebf`.
- [index-classic.html](index-classic.html) + [styles-classic.css](styles-classic.css) — the pre-2026 card-based site (still functional together with [script-test.js](script-test.js) and [monte-carlo-background.js](monte-carlo-background.js))
- [script.js](script.js), [script-old.js](script-old.js), [styles-old.css](styles-old.css), [index-test.html](index-test.html) — older generations
- [music.html](music.html), [create-favicon.html](create-favicon.html), [generate-favicon.html](generate-favicon.html) — utilities
- [.htaccess](.htaccess) — Apache config (unused on GH Pages)

**Stale documentation**: [README.md](README.md) describes a much older version of the site (Particles.js, Chart.js, three themes). Trust this file and the source over the README.

## Content context

This portfolio represents a PhD researcher to academic and quant-industry audiences, and is actively used in job applications — polish over experimentation. The design's distinctiveness comes from the mechanic, not decoration: every overlay depicts something the corresponding paper actually measures (rough volatility, tail scarcity, attention-led warnings, heavy-tailed histograms, a spread-aware binomial tree, minute-frequency trades and drawdown, a Monte Carlo fan, walk-forward windows). Don't replace them with generic charts. Maintain technical credibility: terms like "Rachev ratio", "rough volatility", "walk-forward" are intentional. Publication data (venues, citation counts, co-authors) must stay accurate — verify against Google Scholar before updating numbers.
