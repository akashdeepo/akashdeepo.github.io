# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for Akash Deep, a PhD student in Mathematical Finance at Texas Tech University. It's built as a **static site with vanilla HTML, CSS, and JavaScript** - no build tools, no frameworks. The site showcases quantitative finance research, publications, and professional achievements with sophisticated interactive visualizations.

**Live URL**: https://akashdeepo.github.io/

## Architecture

### Static Site Structure
- **No build process required** - open [index.html](index.html) directly in a browser or use a simple HTTP server
- All JavaScript is vanilla ES6+ with no transpilation needed
- CSS uses modern features (CSS Grid, custom properties, backdrop filters) with theme switching
- Hosted on GitHub Pages, so any push to main automatically deploys

### Core Files
- **[index.html](index.html)**: Main page with all content - uses semantic sections (#home, #about, #research, #experience, #skills, #achievements, #contact)
- **[styles.css](styles.css)**: Complete styling with CSS custom properties for theming. Two themes: light (default) and dark, controlled by `[data-theme]` attribute on `<body>`
- **[script.js](script.js)** / **[script-test.js](script-test.js)**: Main interactivity - navigation, smooth scrolling, theme toggle, animations, custom cursor
- **[monte-carlo-background.js](monte-carlo-background.js)**: Custom canvas-based animated background simulating financial price paths using Geometric Brownian Motion

### Monte Carlo Background System
The most technically complex component is the Monte Carlo simulation background:

- **MonteCarloBackground class**: Renders 25+ animated price paths on canvas using stochastic calculus (Geometric Brownian Motion: dS = μS dt + σS dW)
- **Interactive features**: Mouse movement influences drift/volatility, clicking spawns new paths, paths are attracted to cursor position
- **Theme-aware**: Colors adapt when theme changes via `getThemeColors()` method
- **Performance optimized**: Uses `requestAnimationFrame`, path recycling, and point limiting to maintain 60fps

**Integration**: Loaded in `<head>`, initialized in `script.js` via `initializeMonteCarloBackground()`, stored in global `monteCarloInstance`

### Theme System
Two themes managed through CSS custom properties:
- **Light mode** (default): Warm earth tones - `#eeece2` background, `#da7756` accents
- **Dark mode**: Dark with warm highlights - `#1a1810` background, `#e88762` accents

Theme switching:
1. Button in navbar toggles `data-theme` attribute on `<body>`
2. CSS custom properties in `:root` and `[data-theme="dark"]` handle color changes
3. Theme saved to localStorage as `preferred-theme`
4. Monte Carlo background colors update via `monteCarloInstance.initializePaths()`

### External Dependencies
All loaded from CDNs:
- **Font Awesome 6.4.0** - Icons throughout the site
- **Google Fonts** - Inter font family (referenced in CSS)
- No JavaScript frameworks or libraries (no React, Vue, jQuery, etc.)

### Content Structure
The HTML is organized into semantic sections with BEM-like naming:
- `.hero` - Landing section with stats and CTAs
- `.about` - About text + education timeline
- `.research` - Publication cards with status badges (published/submitted)
- `.experience` - Professional timeline with dates and details
- `.skills` - Grid of skill categories with tags
- `.achievements` - Cards showcasing Kaggle medals, academic honors, research metrics
- `.contact` - Email and social links

## Development Workflow

### Running Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Then visit http://localhost:8000
```

### Testing Changes
1. Make edits to HTML/CSS/JS files
2. Refresh browser (hard refresh with Ctrl+Shift+R / Cmd+Shift+R for CSS changes)
3. Test both light and dark themes
4. Test responsive behavior (especially mobile menu at <768px breakpoint)
5. Check Monte Carlo background performance

### Deployment
No build step needed. Deployment is automated via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
1. On push/PR to `main`, the workflow runs `npx html-validate index.html 404.html` and `npx linkinator . --recurse` (both currently non-blocking via `|| true` — check workflow logs rather than assuming success)
2. On push to `main`, `peaceiris/actions-gh-pages@v3` publishes the repo root with cname `akashdeepo.github.io`
3. Since the entire root is published, any file committed here is publicly accessible — don't commit local notes, screenshots, or scratch HTML unless intended

## Common Development Patterns

### Adding New Content
- **Research publication**: Add new `.research-card` in the `.research-grid` section of [index.html](index.html)
- **Experience entry**: Add new `.timeline-item` in the `.experience .timeline`
- **Skill category**: Add new `.skill-category.card` in `.skills-grid`

### Modifying Styles
- **Colors**: Edit CSS custom properties in `:root` and `[data-theme="dark"]` in [styles.css](styles.css)
- **Spacing**: Use CSS custom properties `--space-xs` through `--space-4xl`
- **Typography**: Use CSS custom properties `--text-xs` through `--text-5xl`

### JavaScript Functionality
All initialization happens in the main DOMContentLoaded event listener in [script.js](script.js):
```javascript
initializeNavigation();      // Nav menu, smooth scroll, active links
initializeThemeSwitcher();   // Theme toggle button
initializeAnimations();      // Intersection Observer for fade-in
initializeLazyLoading();     // Lazy load images (if any)
initializeMonteCarloBackground(); // Canvas animation
initializeCustomCursor();    // Custom cursor (desktop only)
```

### Responsive Design
- **Desktop**: Full navigation menu, custom cursor, multi-column layouts
- **Tablet** (<768px): Hamburger menu, stacked grids, simplified timeline
- **Mobile** (<480px): Single column, reduced spacing, touch-optimized

### Accessibility Features
- Skip link for keyboard navigation
- ARIA labels on interactive elements
- Semantic HTML structure
- Focus indicators on all interactive elements
- Reduced motion support: `@media (prefers-reduced-motion: reduce)` disables animations
- Proper heading hierarchy (h1 → h2 → h3)

## Quantitative Finance Context

This is a portfolio for a mathematical finance researcher, so the design reflects this:
- Monte Carlo simulations visualize stochastic processes (core to financial modeling)
- Color scheme is professional academic (not flashy startup)
- Content emphasizes publications, citations, research impact
- Technical terminology is preserved (e.g., "Geometric Brownian Motion", "Rachev ratios", "stochastic calculus")

When making changes, maintain the balance between:
- **Technical credibility**: This represents a PhD researcher to academic/industry audiences
- **Accessibility**: Non-specialists should still navigate easily
- **Visual sophistication**: The Monte Carlo background demonstrates technical skill without overwhelming content

## File Reference Map

**Active files** (used in production):
- [index.html](index.html) - Main page
- [404.html](404.html) - GitHub Pages 404 fallback (validated in CI alongside index.html)
- [styles.css](styles.css) - Styles
- [script-test.js](script-test.js) - Main JavaScript (loaded in index.html line 567)
- [monte-carlo-background.js](monte-carlo-background.js) - Canvas animation
- [site.webmanifest](site.webmanifest) - PWA manifest
- [.htaccess](.htaccess) - Apache config (unused on GH Pages but present)
- [robots.txt](robots.txt), [sitemap.xml](sitemap.xml) - SEO files
- Favicon files: [favicon.ico](favicon.ico), [favicon.svg](favicon.svg), [apple-touch-icon.png](apple-touch-icon.png), etc.

**Deprecated/unused files** (keep for reference but not loaded):
- [script.js](script.js), [script-old.js](script-old.js) - Previous JavaScript versions
- [styles-old.css](styles-old.css) - Previous styles
- [index-test.html](index-test.html) - Test version
- [music.html](music.html) - Background music feature (not currently integrated)
- [create-favicon.html](create-favicon.html), [generate-favicon.html](generate-favicon.html) - Utility pages

**Note**: [script-test.js](script-test.js) is the actively loaded file, not [script.js](script.js).
