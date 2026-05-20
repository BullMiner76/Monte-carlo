"""
Monte Carlo simulation of the Macroeconomic Engine model.

Replicates the deterministic formulas from Macroeconomic_engine.xlsx:
    Gold AUD/oz       = Gold_USD / AUD
    AISC Adjusted     = Base_AISC * Cost_Conf * (1 + (CPI - 0.025))
    Adj Production    = Prod_Oz * Grade_Recon * Recovery_Adj
    Margin (A$/oz)    = Gold_AUD - AISC_Adj
    Annual FCF (A$)   = Margin * Adj_Production * Jurisdiction

Stochastic inputs are sampled from configurable distributions; the
deterministic point estimate from the workbook is preserved as the
distribution centre.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Callable

import numpy as np


# ---------------------------------------------------------------------------
# Deterministic baseline (matches Inputs sheet of the workbook)
# ---------------------------------------------------------------------------

BASELINE = {
    "rba_rate":         0.0385,
    "fed_rate":         0.03625,
    "aud_usd":          0.735,
    "gold_usd":         4496.0,
    "cpi":              0.038,
    "base_aisc":        2400.0,
    "prod_oz":          1000.0,
    "grade_recon":      0.68,
    "recovery_adj":     0.95,
    "cost_conf":        1.0,
    "jurisdiction":     1.0,
}


# ---------------------------------------------------------------------------
# Distribution spec
# ---------------------------------------------------------------------------

@dataclass
class Dist:
    """A sampling distribution for a single input.

    kind:
        'normal'    -> N(mean, std)
        'lognormal' -> exp(N(log(mean) - 0.5*sigma^2, sigma)) so E[X]=mean
        'triangular'-> Triangular(low, mode, high)
        'uniform'   -> U(low, high)
        'beta'      -> Beta(a,b) rescaled to (low, high)
        'fixed'     -> constant
    """
    kind: str
    params: dict = field(default_factory=dict)
    clip: tuple[float, float] | None = None

    def sample(self, n: int, rng: np.random.Generator) -> np.ndarray:
        p = self.params
        if self.kind == "normal":
            x = rng.normal(p["mean"], p["std"], size=n)
        elif self.kind == "lognormal":
            mean, sigma = p["mean"], p["sigma"]
            mu = np.log(mean) - 0.5 * sigma ** 2
            x = rng.lognormal(mu, sigma, size=n)
        elif self.kind == "triangular":
            x = rng.triangular(p["low"], p["mode"], p["high"], size=n)
        elif self.kind == "uniform":
            x = rng.uniform(p["low"], p["high"], size=n)
        elif self.kind == "beta":
            a, b = p["a"], p["b"]
            lo, hi = p["low"], p["high"]
            x = lo + (hi - lo) * rng.beta(a, b, size=n)
        elif self.kind == "fixed":
            x = np.full(n, p["value"], dtype=float)
        else:
            raise ValueError(f"Unknown distribution kind: {self.kind}")

        if self.clip is not None:
            x = np.clip(x, *self.clip)
        return x


# ---------------------------------------------------------------------------
# Default stochastic specification
# ---------------------------------------------------------------------------
# Sigma sizing:
#   Gold:    lognormal sigma ~ 18% (annual gold realised vol)
#   AUD/USD: normal std 0.04   (~5% of spot, FX one-year horizon)
#   CPI:     normal std 0.012  (~1.2pp around 3.8%)
#   Base AISC: lognormal sigma 8% (operating cost uncertainty)
#   Grade reconciliation: beta on (0.5, 0.95), mode ~0.68
#   Recovery: beta on (0.85, 0.99), mode ~0.95
#   Cost confidence: triangular (0.9, 1.0, 1.15)
#   Jurisdiction: bernoulli-like via beta heavy-weighted near 1
# These reflect "reasonable" defaults; override via JSON config if needed.

def default_distributions() -> dict[str, Dist]:
    b = BASELINE
    return {
        "gold_usd":     Dist("lognormal", {"mean": b["gold_usd"], "sigma": 0.18},
                             clip=(500.0, 20000.0)),
        "aud_usd":      Dist("normal", {"mean": b["aud_usd"], "std": 0.04},
                             clip=(0.45, 0.95)),
        "cpi":          Dist("normal", {"mean": b["cpi"], "std": 0.012},
                             clip=(-0.01, 0.12)),
        "base_aisc":    Dist("lognormal", {"mean": b["base_aisc"], "sigma": 0.08},
                             clip=(500.0, 6000.0)),
        "prod_oz":      Dist("fixed", {"value": b["prod_oz"]}),
        "grade_recon":  Dist("beta", {"a": 6.0, "b": 4.0, "low": 0.50, "high": 0.95}),
        "recovery_adj": Dist("beta", {"a": 8.0, "b": 2.0, "low": 0.85, "high": 0.99}),
        "cost_conf":    Dist("triangular", {"low": 0.90, "mode": 1.00, "high": 1.15}),
        "jurisdiction": Dist("beta", {"a": 20.0, "b": 1.5, "low": 0.70, "high": 1.00}),
        "rba_rate":     Dist("normal", {"mean": b["rba_rate"], "std": 0.005}),
        "fed_rate":     Dist("normal", {"mean": b["fed_rate"], "std": 0.005}),
    }


# ---------------------------------------------------------------------------
# Core simulation
# ---------------------------------------------------------------------------

def simulate(n_trials: int = 50_000,
             dists: dict[str, Dist] | None = None,
             seed: int = 42) -> dict[str, np.ndarray]:
    """Run the Monte Carlo and return a dict of arrays for each variable."""
    rng = np.random.default_rng(seed)
    if dists is None:
        dists = default_distributions()

    draws = {name: d.sample(n_trials, rng) for name, d in dists.items()}

    gold_aud      = draws["gold_usd"] / draws["aud_usd"]
    aisc_adj      = draws["base_aisc"] * draws["cost_conf"] * (1 + (draws["cpi"] - 0.025))
    adj_prod      = draws["prod_oz"] * draws["grade_recon"] * draws["recovery_adj"]
    margin        = gold_aud - aisc_adj
    fcf           = margin * adj_prod * draws["jurisdiction"]
    rate_spread   = draws["rba_rate"] - draws["fed_rate"]

    out = dict(draws)
    out.update({
        "gold_aud":    gold_aud,
        "aisc_adj":    aisc_adj,
        "adj_prod":    adj_prod,
        "margin":      margin,
        "fcf":         fcf,
        "rate_spread": rate_spread,
    })
    return out


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

PERCENTILES = [1, 5, 10, 25, 50, 75, 90, 95, 99]


def summarise(arr: np.ndarray) -> dict[str, float]:
    pct = np.percentile(arr, PERCENTILES)
    return {
        "mean":   float(np.mean(arr)),
        "std":    float(np.std(arr)),
        "min":    float(np.min(arr)),
        "max":    float(np.max(arr)),
        **{f"p{p}": float(v) for p, v in zip(PERCENTILES, pct)},
    }


def deterministic_baseline() -> dict[str, float]:
    b = BASELINE
    gold_aud = b["gold_usd"] / b["aud_usd"]
    aisc_adj = b["base_aisc"] * b["cost_conf"] * (1 + (b["cpi"] - 0.025))
    adj_prod = b["prod_oz"] * b["grade_recon"] * b["recovery_adj"]
    margin   = gold_aud - aisc_adj
    fcf      = margin * adj_prod * b["jurisdiction"]
    return {
        "gold_aud": gold_aud,
        "aisc_adj": aisc_adj,
        "adj_prod": adj_prod,
        "margin":   margin,
        "fcf":      fcf,
    }


def rank_correlations(results: dict[str, np.ndarray],
                      target: str = "fcf") -> list[tuple[str, float]]:
    """Spearman rank correlation of each stochastic input vs target."""
    from scipy.stats import spearmanr  # local import; optional dep

    inputs = ["gold_usd", "aud_usd", "cpi", "base_aisc",
              "grade_recon", "recovery_adj", "cost_conf", "jurisdiction"]
    corrs = []
    y = results[target]
    for name in inputs:
        x = results[name]
        if np.std(x) == 0:
            continue
        rho, _ = spearmanr(x, y)
        corrs.append((name, float(rho)))
    corrs.sort(key=lambda kv: abs(kv[1]), reverse=True)
    return corrs


def _spearman_numpy(x: np.ndarray, y: np.ndarray) -> float:
    """Fallback Spearman without scipy."""
    rx = np.argsort(np.argsort(x))
    ry = np.argsort(np.argsort(y))
    rx = rx - rx.mean()
    ry = ry - ry.mean()
    denom = np.sqrt((rx ** 2).sum() * (ry ** 2).sum())
    return float((rx * ry).sum() / denom) if denom else 0.0


def rank_correlations_safe(results: dict[str, np.ndarray],
                           target: str = "fcf") -> list[tuple[str, float]]:
    try:
        return rank_correlations(results, target)
    except Exception:
        inputs = ["gold_usd", "aud_usd", "cpi", "base_aisc",
                  "grade_recon", "recovery_adj", "cost_conf", "jurisdiction"]
        y = results[target]
        out = []
        for name in inputs:
            x = results[name]
            if np.std(x) == 0:
                continue
            out.append((name, _spearman_numpy(x, y)))
        out.sort(key=lambda kv: abs(kv[1]), reverse=True)
        return out


# ---------------------------------------------------------------------------
# Loading custom distribution overrides
# ---------------------------------------------------------------------------

def load_dists_from_json(path: Path) -> dict[str, Dist]:
    """Load distribution overrides from a JSON file.

    Format:
        {
          "gold_usd":   {"kind": "lognormal", "params": {"mean": 4496, "sigma": 0.20}},
          "jurisdiction": {"kind": "fixed", "params": {"value": 0.95}}
        }
    Keys not present fall back to the defaults.
    """
    with open(path) as f:
        cfg = json.load(f)
    dists = default_distributions()
    for name, spec in cfg.items():
        clip = spec.get("clip")
        clip = tuple(clip) if clip else None
        dists[name] = Dist(kind=spec["kind"], params=spec["params"], clip=clip)
    return dists


# ---------------------------------------------------------------------------
# Output writers
# ---------------------------------------------------------------------------

def write_summary_excel(results: dict[str, np.ndarray],
                        path: Path,
                        n_trials: int) -> None:
    import openpyxl
    from openpyxl.styles import Font, PatternFill

    wb = openpyxl.Workbook()

    # Summary sheet
    ws = wb.active
    ws.title = "Summary"
    headers = ["Variable", "Mean", "Std", "Min",
               *[f"P{p}" for p in PERCENTILES], "Max"]
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True)

    report_vars = ["gold_usd", "aud_usd", "cpi", "base_aisc",
                   "grade_recon", "recovery_adj", "cost_conf", "jurisdiction",
                   "gold_aud", "aisc_adj", "adj_prod", "margin", "fcf"]
    for v in report_vars:
        s = summarise(results[v])
        ws.append([v, s["mean"], s["std"], s["min"],
                   *[s[f"p{p}"] for p in PERCENTILES], s["max"]])

    # Deterministic baseline
    ws.append([])
    ws.append(["Deterministic baseline (from workbook)"])
    for k, v in deterministic_baseline().items():
        ws.append([k, v])

    # Risk metrics for FCF and Margin
    ws.append([])
    ws.append(["Risk metrics"])
    fcf = results["fcf"]
    margin = results["margin"]
    ws.append(["P(Margin < 0)",   float(np.mean(margin < 0))])
    ws.append(["P(FCF < 0)",      float(np.mean(fcf < 0))])
    ws.append(["E[FCF | FCF<0]",  float(fcf[fcf < 0].mean()) if (fcf < 0).any() else 0.0])
    ws.append(["CVaR 5% (FCF)",   float(fcf[fcf <= np.percentile(fcf, 5)].mean())])
    ws.append(["CVaR 1% (FCF)",   float(fcf[fcf <= np.percentile(fcf, 1)].mean())])
    ws.append(["Trials", n_trials])

    # Correlations
    ws2 = wb.create_sheet("Correlations")
    ws2.append(["Driver", "Spearman rho vs FCF"])
    for c in ws2[1]:
        c.font = Font(bold=True)
    for name, rho in rank_correlations_safe(results, "fcf"):
        ws2.append([name, rho])

    ws3 = wb.create_sheet("Correlations_Margin")
    ws3.append(["Driver", "Spearman rho vs Margin"])
    for c in ws3[1]:
        c.font = Font(bold=True)
    for name, rho in rank_correlations_safe(results, "margin"):
        ws3.append([name, rho])

    # Sample of draws (first 2000 trials)
    ws4 = wb.create_sheet("Sample")
    cols = ["gold_usd", "aud_usd", "cpi", "base_aisc",
            "grade_recon", "recovery_adj", "cost_conf", "jurisdiction",
            "gold_aud", "aisc_adj", "adj_prod", "margin", "fcf"]
    ws4.append(cols)
    for c in ws4[1]:
        c.font = Font(bold=True)
    n_sample = min(2000, n_trials)
    for i in range(n_sample):
        ws4.append([float(results[c][i]) for c in cols])

    wb.save(path)


def write_plots(results: dict[str, np.ndarray], outdir: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    outdir.mkdir(parents=True, exist_ok=True)

    baseline = deterministic_baseline()

    # FCF histogram
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(results["fcf"] / 1e6, bins=80, color="#2a6fb0", edgecolor="white")
    ax.axvline(baseline["fcf"] / 1e6, color="black", linestyle="--",
               label=f"Baseline = {baseline['fcf']/1e6:.2f} A$M")
    ax.axvline(np.percentile(results["fcf"], 5) / 1e6, color="red",
               linestyle=":", label="P5")
    ax.axvline(np.percentile(results["fcf"], 95) / 1e6, color="green",
               linestyle=":", label="P95")
    ax.set_title("Annual FCF distribution (A$M)")
    ax.set_xlabel("Annual FCF (A$M)")
    ax.set_ylabel("Frequency")
    ax.legend()
    fig.tight_layout()
    fig.savefig(outdir / "fcf_hist.png", dpi=130)
    plt.close(fig)

    # Margin histogram
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(results["margin"], bins=80, color="#5a9e5a", edgecolor="white")
    ax.axvline(baseline["margin"], color="black", linestyle="--",
               label=f"Baseline = A${baseline['margin']:.0f}/oz")
    ax.axvline(0, color="red", linestyle="-", alpha=0.6, label="Breakeven")
    ax.set_title("Margin distribution (A$/oz)")
    ax.set_xlabel("Margin (A$/oz)")
    ax.set_ylabel("Frequency")
    ax.legend()
    fig.tight_layout()
    fig.savefig(outdir / "margin_hist.png", dpi=130)
    plt.close(fig)

    # Tornado: Spearman rho vs FCF
    corrs = rank_correlations_safe(results, "fcf")
    names = [c[0] for c in corrs]
    vals  = [c[1] for c in corrs]
    colors = ["#c0392b" if v < 0 else "#2980b9" for v in vals]
    fig, ax = plt.subplots(figsize=(9, 5))
    y = np.arange(len(names))
    ax.barh(y, vals, color=colors)
    ax.set_yticks(y, names)
    ax.invert_yaxis()
    ax.axvline(0, color="black", linewidth=0.8)
    ax.set_title("Sensitivity to FCF — Spearman rank correlation")
    ax.set_xlabel("rho")
    fig.tight_layout()
    fig.savefig(outdir / "tornado_fcf.png", dpi=130)
    plt.close(fig)

    # CDF of FCF
    fig, ax = plt.subplots(figsize=(9, 5))
    sorted_fcf = np.sort(results["fcf"]) / 1e6
    cdf = np.arange(1, len(sorted_fcf) + 1) / len(sorted_fcf)
    ax.plot(sorted_fcf, cdf, color="#444")
    ax.axvline(0, color="red", linestyle="--", alpha=0.6, label="Breakeven")
    ax.set_title("Annual FCF — empirical CDF")
    ax.set_xlabel("Annual FCF (A$M)")
    ax.set_ylabel("Cumulative probability")
    ax.legend()
    fig.tight_layout()
    fig.savefig(outdir / "fcf_cdf.png", dpi=130)
    plt.close(fig)
