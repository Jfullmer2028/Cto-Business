/**
 * Holt-Winters exponential smoothing with additive seasonality.
 *
 * Used by ReserveIQ to forecast normalized cloud usage demand from a
 * trailing window of UsageMetric rows.  The default configuration targets
 * a 7-day weekly seasonality cycle (common for cloud workloads) and
 * produces a 30-day forward forecast.
 *
 * All functions are pure and deterministic — no side effects, no I/O,
 * no randomness.  This makes the engine trivially unit-testable and
 * safe to run inside edge workers or serverless functions.
 */

import type {
  UsageDataPoint,
  ForecastPoint,
  HoltWintersConfig,
  ForecastSummary,
} from "./types";

/** Sensible defaults tuned for cloud-cost usage patterns. */
export const DEFAULT_HW_CONFIG: HoltWintersConfig = {
  alpha: 0.3,
  beta: 0.1,
  gamma: 0.2,
  seasonalPeriod: 7,
  forecastHorizon: 30,
};

/**
 * Sorts usage data by timestamp ascending and removes duplicate days.
 */
export function prepareUsageData(
  raw: UsageDataPoint[],
): UsageDataPoint[] {
  const map = new Map<string, UsageDataPoint>();
  for (const point of raw) {
    const key = point.timestamp.toISOString().split("T")[0];
    // If duplicate day, keep the latest value (idempotent re-imports)
    map.set(key, point);
  }
  const sorted = Array.from(map.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  return sorted;
}

/**
 * Initialize Holt-Winters level, trend, and seasonal components from the
 * first `seasonalPeriod * 2` observations.
 */
export function initializeHoltWinters(
  observations: number[],
  m: number,
): {
  level: number;
  trend: number;
  seasonal: number[];
} {
  if (observations.length < m * 2) {
    // Not enough data for classical decomposition — fall back to simple mean
    const level =
      observations.reduce((sum, v) => sum + v, 0) / observations.length;
    const trend = 0;
    const seasonal = Array.from({ length: m }, () => 0);
    return { level, trend, seasonal };
  }

  // Average of first m periods as initial level
  const firstPeriod = observations.slice(0, m);
  const level = firstPeriod.reduce((s, v) => s + v, 0) / m;

  // Trend from average difference between corresponding seasons
  let trendSum = 0;
  for (let i = 0; i < m; i++) {
    trendSum += observations[m + i] - observations[i];
  }
  const trend = trendSum / (m * m);

  // Initial seasonal indices: deviation of each observation from (level + trend offset)
  const seasonal: number[] = [];
  for (let i = 0; i < m; i++) {
    const expected = level + trend * i;
    seasonal.push(observations[i] - expected);
  }

  return { level, trend, seasonal };
}

/**
 * Run one step of Holt-Winters update given a new observation.
 */
export function holtWintersStep(
  observation: number,
  levelPrev: number,
  trendPrev: number,
  seasonalPrev: number,
  alpha: number,
  beta: number,
  gamma: number,
): { level: number; trend: number; seasonal: number } {
  const level =
    alpha * (observation - seasonalPrev) +
    (1 - alpha) * (levelPrev + trendPrev);
  const trend =
    beta * (level - levelPrev) + (1 - beta) * trendPrev;
  const seasonal =
    gamma * (observation - level) + (1 - gamma) * seasonalPrev;
  return { level, trend, seasonal };
}

/**
 * Fit Holt-Winters on a time-series of daily observations and return the
 * smoothed state (level, trend, seasonal) at the end of the series.
 */
export function fitHoltWinters(
  observations: number[],
  config: HoltWintersConfig,
): {
  level: number;
  trend: number;
  seasonal: number[];
} {
  const { alpha, beta, gamma, seasonalPeriod: m } = config;

  if (observations.length === 0) {
    return { level: 0, trend: 0, seasonal: Array.from({ length: m }, () => 0) };
  }

  if (observations.length < m) {
    const level =
      observations.reduce((s, v) => s + v, 0) / observations.length;
    return {
      level,
      trend: 0,
      seasonal: Array.from({ length: m }, () => 0),
    };
  }

  let { level, trend, seasonal } = initializeHoltWinters(observations, m);

  for (let t = m; t < observations.length; t++) {
    const seasonalIndex = t % m;
    const result = holtWintersStep(
      observations[t],
      level,
      trend,
      seasonal[seasonalIndex],
      alpha,
      beta,
      gamma,
    );
    level = result.level;
    trend = result.trend;
    seasonal[seasonalIndex] = result.seasonal;
  }

  return { level, trend, seasonal };
}

/**
 * Generate a forward forecast from the fitted Holt-Winters state.
 */
export function forecastHoltWinters(
  fitted: {
    level: number;
    trend: number;
    seasonal: number[];
  },
  config: HoltWintersConfig,
  startDate: Date,
): ForecastPoint[] {
  const { trend, seasonal } = fitted;
  let { level } = fitted;
  const { seasonalPeriod: m, forecastHorizon: h } = config;
  const result: ForecastPoint[] = [];

  // The last fitted observation index is effectively `observations.length - 1`.
  // We forecast from the next day onward.
  const lastIndex = 0; // relative offset; we iterate h steps forward

  for (let i = 1; i <= h; i++) {
    const seasonalIndex = (lastIndex + i) % m;
    const forecast = level + trend * i + seasonal[seasonalIndex];
    const ts = new Date(startDate);
    ts.setDate(ts.getDate() + i);
    result.push({
      timestamp: ts,
      forecastedUnits: Math.max(0, forecast),
    });
  }

  return result;
}

/**
 * Convenience wrapper: accept raw UsageDataPoint[], clean them, fit
 * Holt-Winters, and return a 30-day forecast.
 */
export function exponentialSmoothing(
  rawData: UsageDataPoint[],
  config: Partial<HoltWintersConfig> = {},
): { forecast: ForecastPoint[]; summary: ForecastSummary; fitted: ReturnType<typeof fitHoltWinters> } {
  const merged = { ...DEFAULT_HW_CONFIG, ...config };
  const prepared = prepareUsageData(rawData);

  if (prepared.length === 0) {
    return {
      forecast: [],
      summary: {
        totalForecastedUnits: 0,
        averageDailyUnits: 0,
        peakDailyUnits: 0,
        peakDate: new Date(),
      },
      fitted: { level: 0, trend: 0, seasonal: [] },
    };
  }

  const observations = prepared.map((d) => d.normalizedUnits);
  const fitted = fitHoltWinters(observations, merged);
  const lastDate = prepared[prepared.length - 1].timestamp;
  const forecast = forecastHoltWinters(fitted, merged, lastDate);

  const totalForecastedUnits = forecast.reduce(
    (s, p) => s + p.forecastedUnits,
    0,
  );
  const averageDailyUnits = totalForecastedUnits / forecast.length;
  const peak = forecast.reduce((max, p) =>
    p.forecastedUnits > max.forecastedUnits ? p : max,
  );

  return {
    forecast,
    fitted,
    summary: {
      totalForecastedUnits,
      averageDailyUnits,
      peakDailyUnits: peak.forecastedUnits,
      peakDate: peak.timestamp,
    },
  };
}
