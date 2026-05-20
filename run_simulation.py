"""CLI runner for the Macroeconomic Engine Monte Carlo.

Examples
--------
    python run_simulation.py                       # 50k trials, default config
    python run_simulation.py --trials 100000
    python run_simulation.py --config my_dists.json --out results/
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

import monte_carlo as mc


def fmt_money(x: float) -> str:
    if abs(x) >= 1e6:
        return f"A${x/1e6:,.2f}M"
    if abs(x) >= 1e3:
        return f"A${x/1e3:,.1f}k"
    return f"A${x:,.0f}"


def print_console_report(results: dict, n_trials: int) -> None:
    print("=" * 72)
    print(f"  MACROECONOMIC ENGINE — MONTE CARLO  ({n_trials:,} trials)")
    print("=" * 72)

    base = mc.deterministic_baseline()
    print("\nDeterministic baseline (workbook values):")
    print(f"  Gold AUD/oz       : A${base['gold_aud']:,.2f}")
    print(f"  AISC adjusted     : A${base['aisc_adj']:,.2f}")
    print(f"  Adj production    : {base['adj_prod']:,.1f} oz")
    print(f"  Margin            : A${base['margin']:,.2f}/oz")
    print(f"  Annual FCF        : {fmt_money(base['fcf'])}")

    print("\nMonte Carlo summary:")
    for label, key, unit in [
        ("Gold AUD/oz",   "gold_aud", "A$/oz"),
        ("AISC adjusted", "aisc_adj", "A$/oz"),
        ("Margin",        "margin",   "A$/oz"),
        ("Annual FCF",    "fcf",      "A$"),
    ]:
        s = mc.summarise(results[key])
        if key == "fcf":
            print(f"  {label:<16}  mean={fmt_money(s['mean'])}  "
                  f"P5={fmt_money(s['p5'])}  P50={fmt_money(s['p50'])}  "
                  f"P95={fmt_money(s['p95'])}")
        else:
            print(f"  {label:<16}  mean=A${s['mean']:,.0f}  "
                  f"P5=A${s['p5']:,.0f}  P50=A${s['p50']:,.0f}  "
                  f"P95=A${s['p95']:,.0f}  ({unit})")

    margin = results["margin"]
    fcf = results["fcf"]
    print("\nRisk metrics:")
    print(f"  P(Margin < 0)     : {np.mean(margin < 0):.2%}")
    print(f"  P(FCF < 0)        : {np.mean(fcf < 0):.2%}")
    print(f"  CVaR 5% (FCF)     : {fmt_money(fcf[fcf <= np.percentile(fcf, 5)].mean())}")
    print(f"  CVaR 1% (FCF)     : {fmt_money(fcf[fcf <= np.percentile(fcf, 1)].mean())}")

    print("\nSensitivity (Spearman rho vs FCF):")
    for name, rho in mc.rank_correlations_safe(results, "fcf"):
        bar = "#" * int(abs(rho) * 40)
        sign = "-" if rho < 0 else "+"
        print(f"  {name:<14} {sign}{abs(rho):.3f}  {bar}")
    print()


def main() -> None:
    p = argparse.ArgumentParser(description="Monte Carlo for Macroeconomic Engine")
    p.add_argument("--trials", type=int, default=50_000,
                   help="Number of Monte Carlo trials (default: 50000)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--config", type=Path, default=None,
                   help="Optional JSON file with distribution overrides")
    p.add_argument("--out", type=Path, default=Path("results"),
                   help="Output directory for Excel + plots")
    p.add_argument("--no-plots", action="store_true")
    p.add_argument("--no-excel", action="store_true")
    args = p.parse_args()

    dists = mc.load_dists_from_json(args.config) if args.config else None

    results = mc.simulate(n_trials=args.trials, dists=dists, seed=args.seed)
    print_console_report(results, args.trials)

    args.out.mkdir(parents=True, exist_ok=True)

    if not args.no_excel:
        excel_path = args.out / "monte_carlo_results.xlsx"
        mc.write_summary_excel(results, excel_path, args.trials)
        print(f"Wrote {excel_path}")

    if not args.no_plots:
        mc.write_plots(results, args.out)
        print(f"Wrote plots to {args.out}/")


if __name__ == "__main__":
    main()
