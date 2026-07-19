/* Estuary — publication dossiers.
   One entry per .fig, in DOM order. Each dossier is a headline
   stat + one plain-language sentence, drawn from the paper's
   actual abstract; keep them accurate when editing. */

const DOSSIERS = [
    {
        // Fig. 1 — Memory, Roughness, and Information Persistence
        stat: "d̂ = 0.44",
        statLabel: "long-memory estimate, 115 S&P 500 stocks",
        note: "Volatility remembers. Persistence itself carries forecasting information — and it matters most exactly when markets are under stress.",
        url: "https://arxiv.org/abs/2605.24285",
        bibtex: `@article{deep2026memory,
  title={Memory, Roughness, and Information Persistence in Financial Markets: A Structural Approach to Volatility Forecasting},
  author={Deep, Akash and Appiah, Nicholas and Rachev, Svetlozar T.},
  journal={arXiv preprint arXiv:2605.24285},
  year={2026}
}`
    },
    {
        // Fig. 2 — Local Gaussian Correlation in the Tails
        stat: "n⁻¹ᐟ⁶",
        statLabel: "first location-optimal bandwidth for tail dependence",
        note: "In the far tails the data simply run out — no bandwidth, however optimal, can recover information the data do not contain.",
        url: "https://arxiv.org/abs/2607.03888",
        bibtex: `@article{deep2026local,
  title={Local Gaussian Correlation in the Tails: A Scarcity Diagnostic, an Optimal Local Bandwidth, and the Limits of Adaptivity},
  author={Deep, Akash and Deep, Gagan},
  journal={arXiv preprint arXiv:2607.03888},
  year={2026}
}`
    },
    {
        // Fig. 3 — Google Trends–Augmented XGBoost (JBEF)
        stat: "0.796",
        statLabel: "ROC AUC, one-month-ahead VIX ≥ 30 warning",
        note: "Collective search anxiety predicts volatility spikes — ranking first against eight classical benchmarks, GARCH included.",
        url: "https://doi.org/10.1016/j.jbef.2026.101159",
        bibtex: `@article{deep2026googletrends,
  title={Google Trends--Augmented XGBoost for market volatility prediction: A machine learning early warning system},
  author={Deep, Gagan and Deep, Akash and Rachev, Svetlozar T. and Fabozzi, Frank J.},
  journal={Journal of Behavioral and Experimental Finance},
  volume={49},
  pages={101159},
  year={2026},
  publisher={Elsevier}
}`
    },
    {
        // Fig. 4 — Probability Weighting Meets Heavy Tails
        stat: "88.4%",
        statLabel: "of 86 assets fit better than Gaussian",
        note: "Investors distort probabilities and returns have heavy tails — model both at once, or understate 99% Value-at-Risk six-fold.",
        url: "https://arxiv.org/abs/2511.16563",
        bibtex: `@article{deep2025probability,
  title={Probability Weighting Meets Heavy Tails: An Econometric Framework for Behavioral Asset Pricing},
  author={Deep, Akash and Rachev, Svetlozar T. and Fabozzi, Frank J.},
  journal={arXiv preprint arXiv:2511.16563},
  year={2025}
}`
    },
    {
        // Fig. 5 — Binary Tree Option Pricing
        stat: "13.79%",
        statLabel: "deviation from Black–Scholes fair value",
        note: "Market frictions are large enough to move option prices. A Random Forest inside the binomial tree prices them in — no-arbitrage intact.",
        url: "https://arxiv.org/abs/2507.16701",
        bibtex: `@article{deep2025binarytree,
  title={Binary Tree Option Pricing Under Market Microstructure Effects: A Random Forest Approach},
  author={Deep, Akash and Monico, Chris and Lindquist, W. Brent and Rachev, Svetlozar T. and Fabozzi, Frank J.},
  journal={arXiv preprint arXiv:2507.16701},
  year={2025}
}`
    },
    {
        // Fig. 6 — Risk-Adjusted Performance of Random Forest Models (JRFM)
        stat: "0.961",
        statLabel: "best Rachev ratio across 13 model configurations",
        note: "At minute frequency, technical indicators manage risk — not returns. Every model trailed buy-and-hold, and the paper says so.",
        url: "https://doi.org/10.3390/jrfm18030142",
        bibtex: `@article{deep2025riskadjusted,
  title={Risk-Adjusted Performance of Random Forest Models in High-Frequency Trading},
  author={Deep, Akash and Shirvani, Abootaleb and Monico, Chris and Rachev, Svetlozar and Fabozzi, Frank J.},
  journal={Journal of Risk and Financial Management},
  volume={18},
  number={3},
  pages={142},
  year={2025},
  publisher={MDPI}
}`
    },
    {
        // Fig. 7 — Advanced Financial Market Forecasting (QFE)
        stat: "+18%",
        statLabel: "risk-adjusted forecast improvement, SPY & majors",
        note: "Monte Carlo scenarios and ML ensembles see different halves of the problem — fused, they give the fuller risk–reward picture.",
        url: "https://www.aimspress.com/article/10.3934/QFE.2024011",
        bibtex: `@article{deep2024advanced,
  title={Advanced financial market forecasting: integrating Monte Carlo simulations with ensemble Machine Learning models},
  author={Deep, Akash},
  journal={Quantitative Finance and Economics},
  volume={8},
  number={2},
  pages={286--314},
  year={2024},
  doi={10.3934/QFE.2024011}
}`
    },
    {
        // Fig. 8 — Interpretable Hypothesis-Driven Trading
        stat: "−2.76%",
        statLabel: "maximum drawdown, decade of out-of-sample tests",
        note: "Honest enough to publish its own p = 0.34: microstructure signals only wake when volatility does — and that's the finding.",
        url: "https://arxiv.org/abs/2512.12924",
        bibtex: `@article{deep2025interpretable,
  title={Interpretable Hypothesis-Driven Trading: A Rigorous Walk-Forward Validation Framework for Market Microstructure Signals},
  author={Deep, Gagan and Deep, Akash and Lamptey, William},
  journal={arXiv preprint arXiv:2512.12924},
  year={2025}
}`
    },
];
