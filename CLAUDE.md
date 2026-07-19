# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Akash Deep, a PhD student in Mathematical Finance at Texas Tech University. **Static site with vanilla HTML, CSS, and JavaScript** — no build tools, no frameworks. The July 2026 redesign ("Estuary" / "Drift & Diffusion") presents the site as a typeset manuscript: a generative river hero, publications set as animated figures with hover dossiers, and a letter-styled contact section.

**Live URL**: https://akashdeepo.github.io/

## Architecture

### Active files (production)
- **[index.html](index.html)** — the whole site, one page. Sections are "sheets" numbered like a paper: hero (`#top`), `#abstract`, `#publications`, `#experience`, `#recognition`, `#correspondence`.
- **[styles.css](styles.css)** — all styling. The **Estuary palette** lives as CSS custom properties on `:root` (day/parchment) and `[data-theme="night"]` (lamplit dark): paper `#f5f0e4`/`#171a14`, ink, teal `#3e6270`, moss, sage, copper accent `#b05633`. Includes a full `@media print` stylesheet that renders the site as a typeset CV.
- **[river.js](river.js)** — `EstuaryRiver` class: the hero canvas. ~60 mean-reverting stochastic paths streaming left; the current bends around the cursor, clicks drop stones (ripples), paths pinch toward the headline word "converges." (measured from the `<em>` element, re-measured on font load/resize). Keyboard easter eggs: `C` = crash, `V` = volatility shock. Has an intro draw-in on first load. Pauses off-screen/hidden; static under reduced motion.
- **[dossiers.js](dossiers.js)** — `DOSSIERS` array: one entry per publication in DOM order (`stat`, `statLabel`, `note`, `url`, `bibtex`). Summaries are drawn from the papers' actual abstracts — keep them accurate when editing.
- **[main.js](main.js)** — everything else: 8 bespoke per-paper canvas figures (`FIGURES` array — each draws that paper's concept and animates while hovered), theme toggle (localStorage key `estuary-theme`), diamond nav active state, hover dossiers (floating torn-scrap card in the margin on desktop, inline expansion on touch), stat count-up + typewriter, BibTeX copy (per-paper and `#bibtexAll`), print-dossier injection, scroll reveals, `.count` number animations.
- **[404.html](404.html)** — standalone "drifted downstream" page (validated in CI).
- **[site.webmanifest](site.webmanifest)**, **[robots.txt](robots.txt)**, **[sitemap.xml](sitemap.xml)**, favicon files.

### Typography & external dependencies
Google Fonts only: **Fraunces** (display serif — headlines, stats, signature), **Newsreader** (body serif), **IBM Plex Mono** (annotations, margin notes, labels). No JS libraries, no icon fonts (the classic site used Font Awesome; the current site uses none).

### Theme system
- `data-theme` attribute on `<html>` (`day` | `night`), set pre-paint by an inline head script from localStorage (`estuary-theme`) falling back to `prefers-color-scheme`.
- All colors flow through CSS custom properties; canvases read them at draw time via `getComputedStyle`, so after a theme change JS calls `estuaryRiver.refreshColors()` and redraws thumbnails (wired in main.js).

### Key invariants when editing
- Publications: `.fig` articles in `#publications`, the `FIGURES` array in main.js, and the `DOSSIERS` array in dossiers.js are **matched by DOM order**. Adding/reordering a paper means updating all three in the same position (a new paper reuses `FIGURES[i % 8]` if none is added).
- Hero headline pinch targets `.hero h1 em` — keep the emphasized word if rewording the headline.
- Metrics (12 publications · 63 citations · h-index 3, as of July 2026) appear in: meta description, `#publications` margin, `#recognition` ledger, JSON-LD — update all when Scholar changes.
- Respect `prefers-reduced-motion` for any new animation (existing pattern: check `reduced`, provide static state).

## Development Workflow

### Running locally
```bash
python -m http.server 8000   # or: npx serve .
# visit http://localhost:8000
```

### Testing changes
1. Hard refresh (Ctrl+Shift+R) after CSS changes
2. Test both day and night themes (toggle top-right)
3. Test hover dossiers on desktop AND tap behavior at mobile widths
4. Check `@media print` (Ctrl+P preview) still produces a clean CV
5. Run `npx html-validate index.html 404.html` — keep it clean; CI runs it non-blocking (`|| true`) so check the output yourself

### Deployment
Automated via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
1. On push/PR to `main`: `npx html-validate index.html 404.html` and `npx linkinator . --recurse` (both non-blocking via `|| true` — check workflow logs rather than assuming success)
2. On push to `main`: `peaceiris/actions-gh-pages@v3` publishes the repo root with cname `akashdeepo.github.io`
3. The entire root is published — any committed file is publicly accessible; don't commit local notes, screenshots, or scratch files

## Archived files (kept for reference, not loaded)
- [index-classic.html](index-classic.html) + [styles-classic.css](styles-classic.css) — the pre-2026 card-based site (still functional together with [script-test.js](script-test.js) and [monte-carlo-background.js](monte-carlo-background.js))
- [script.js](script.js), [script-old.js](script-old.js), [styles-old.css](styles-old.css), [index-test.html](index-test.html) — older generations
- [music.html](music.html), [create-favicon.html](create-favicon.html), [generate-favicon.html](generate-favicon.html) — utilities
- [.htaccess](.htaccess) — Apache config (unused on GH Pages)

**Stale documentation**: [README.md](README.md) describes a much older version of the site (Particles.js, Chart.js, three themes). Trust this file and the source over the README.

## Content context

This portfolio represents a PhD researcher to academic and quant-industry audiences. The design language is "manuscript + river": stochastic-process visuals are drawn from the owner's actual research (the eight publication figures each depict that paper's concept — don't replace them with generic charts). Maintain technical credibility: terminology like "Geometric Brownian Motion", "Rachev ratios", "rough volatility" is intentional. Publication data (venues, citation counts, co-authors) must stay accurate — verify against Google Scholar before updating numbers.
