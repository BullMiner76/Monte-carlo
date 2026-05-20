# Macroeconomic Engine — Monte Carlo

A Monte Carlo wrapper around the deterministic gold-mine FCF model in
`Macroeconomic_engine.xlsx`.

## Model

Replicates the workbook's formulas exactly:

```
Gold AUD/oz      = Gold_USD / AUD
AISC adjusted    = Base_AISC * Cost_Conf * (1 + (CPI - 0.025))
Adj production   = Prod_Oz * Grade_Recon * Recovery_Adj
Margin (A$/oz)   = Gold_AUD - AISC_Adj
Annual FCF (A$)  = Margin * Adj_Production * Jurisdiction
```

Eight macro/operational drivers are sampled from configurable distributions
(`monte_carlo.default_distributions`). Defaults:

| Driver         | Distribution             | Notes                              |
|----------------|--------------------------|------------------------------------|
| `gold_usd`     | Lognormal, sigma 18%     | annual gold realised vol           |
| `aud_usd`      | Normal, std 0.04         | clipped to [0.45, 0.95]            |
| `cpi`          | Normal, std 1.2pp        | clipped to [-1%, 12%]              |
| `base_aisc`    | Lognormal, sigma 8%      | operating-cost uncertainty         |
| `grade_recon`  | Beta on [0.50, 0.95]     | mode ~0.68                         |
| `recovery_adj` | Beta on [0.85, 0.99]     | mode ~0.95                         |
| `cost_conf`    | Triangular(0.90, 1.00, 1.15) | confidence multiplier on AISC  |
| `jurisdiction` | Beta on [0.70, 1.00]     | heavy mass near 1                  |

The point estimate of each distribution matches the deterministic value
in the workbook, so the median of the simulation aligns with the
spreadsheet's baseline.

## Run

```bash
pip install -r requirements.txt
python run_simulation.py                     # 50k trials
python run_simulation.py --trials 200000     # more trials
python run_simulation.py --config config_example.json --out results/
```

Outputs (in `results/`):

- `monte_carlo_results.xlsx` — summary stats, percentiles, Spearman
  sensitivities, risk metrics, and a 2,000-row sample of draws.
- `fcf_hist.png` — Annual FCF distribution with P5/P95 markers.
- `margin_hist.png` — Margin distribution.
- `tornado_fcf.png` — Driver sensitivities to FCF.
- `fcf_cdf.png` — Empirical CDF of FCF.

## Custom distributions

Pass a JSON file via `--config`. Each key overrides the matching driver;
omitted keys keep the defaults. See `config_example.json`.

```json
{
  "gold_usd":  {"kind": "lognormal",  "params": {"mean": 4496, "sigma": 0.22}},
  "aud_usd":   {"kind": "triangular", "params": {"low": 0.62, "mode": 0.735, "high": 0.82}}
}
```

Supported kinds: `normal`, `lognormal`, `triangular`, `uniform`, `beta`, `fixed`.

## Programmatic use

```python
import monte_carlo as mc

results = mc.simulate(n_trials=100_000)
print(mc.summarise(results["fcf"]))
print(mc.rank_correlations_safe(results, target="fcf"))
```
