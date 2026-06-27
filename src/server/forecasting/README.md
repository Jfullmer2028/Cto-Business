# ReserveIQ Forecasting Engine

Pure, deterministic TypeScript functions that power the >95% committed-spend utilization KPI.

## Modules

| File | Purpose |
|------|---------|
| `exponentialSmoothing.ts` | Holt-Winters with additive 7-day seasonality. 90-day trailing window → 30-day forecast. |
| `binPacking.ts` | Matches existing reservations against forecasted demand per `(region, instanceFamily, term)`. |
| `roiScore.ts` | Ranks deficit gaps by ROI, filtering out candidates with break-even ≥ 6 months. |
| `types.ts` | Shared interfaces (no Prisma dependency — keeps the engine testable anywhere). |

## Pipeline

```
UsageMetric[]
    → exponentialSmoothing() → ForecastPoint[]
    → binPacking() → DeficitGap[]
    → roiScore() → RecommendationCandidate[] (ranked)
```

## Testing

```bash
npm test -- src/server/forecasting/__tests__
```

Coverage thresholds: 80% branches, functions, lines, statements.

## Key Design Decisions

- **Pure functions** — no database calls, no randomness, no side effects.
- **Deterministic** — same input always produces same output (critical for reproducible recommendations).
- **No external dependencies** — the engine only needs basic math operators; it can run in Node, edge workers, or the browser.
- **Self-contained types** — mirrors Prisma schema shapes but does not import `@prisma/client`, avoiding circular dependencies and keeping tests fast.
