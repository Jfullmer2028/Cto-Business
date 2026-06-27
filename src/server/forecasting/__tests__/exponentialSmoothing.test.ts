import {
  prepareUsageData,
  initializeHoltWinters,
  holtWintersStep,
  fitHoltWinters,
  forecastHoltWinters,
  exponentialSmoothing,
  DEFAULT_HW_CONFIG,
} from "../exponentialSmoothing";
import type { UsageDataPoint } from "../types";

describe("prepareUsageData", () => {
  it("sorts by timestamp ascending", () => {
    const raw: UsageDataPoint[] = [
      { timestamp: new Date("2024-06-03"), normalizedUnits: 3 },
      { timestamp: new Date("2024-06-01"), normalizedUnits: 1 },
      { timestamp: new Date("2024-06-02"), normalizedUnits: 2 },
    ];
    const result = prepareUsageData(raw);
    expect(result.map((r) => r.normalizedUnits)).toEqual([1, 2, 3]);
  });

  it("deduplicates same-day entries keeping last", () => {
    const raw: UsageDataPoint[] = [
      { timestamp: new Date("2024-06-01T08:00:00Z"), normalizedUnits: 1 },
      { timestamp: new Date("2024-06-01T20:00:00Z"), normalizedUnits: 5 },
    ];
    const result = prepareUsageData(raw);
    expect(result).toHaveLength(1);
    expect(result[0].normalizedUnits).toBe(5);
  });
});

describe("initializeHoltWinters", () => {
  it("initializes from 14 observations with m=7", () => {
    const obs = Array.from({ length: 14 }, (_, i) => 10 + i);
    const { level, trend, seasonal } = initializeHoltWinters(obs, 7);
    expect(level).toBeCloseTo(13, 0);
    expect(trend).toBeCloseTo(1, 0);
    expect(seasonal).toHaveLength(7);
  });

  it("falls back to mean when data < 2*m", () => {
    const obs = [10, 12, 14];
    const { level, trend, seasonal } = initializeHoltWinters(obs, 7);
    expect(level).toBeCloseTo(12, 0);
    expect(trend).toBe(0);
    expect(seasonal).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("holtWintersStep", () => {
  it("updates level, trend, and seasonal", () => {
    const result = holtWintersStep(15, 10, 1, 2, 0.3, 0.1, 0.2);
    expect(result.level).toBeCloseTo(10.9, 1);
    expect(result.trend).toBeCloseTo(1.09, 2);
    expect(result.seasonal).toBeCloseTo(2.82, 2);
  });

  it("is deterministic", () => {
    const a = holtWintersStep(15, 10, 1, 2, 0.3, 0.1, 0.2);
    const b = holtWintersStep(15, 10, 1, 2, 0.3, 0.1, 0.2);
    expect(a).toEqual(b);
  });
});

describe("fitHoltWinters", () => {
  it("returns zero state for empty observations", () => {
    const fitted = fitHoltWinters([], DEFAULT_HW_CONFIG);
    expect(fitted.level).toBe(0);
    expect(fitted.trend).toBe(0);
    expect(fitted.seasonal).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("fits constant data with near-zero trend", () => {
    const obs = Array.from({ length: 30 }, () => 100);
    const fitted = fitHoltWinters(obs, DEFAULT_HW_CONFIG);
    expect(fitted.level).toBeCloseTo(100, 0);
    expect(Math.abs(fitted.trend)).toBeLessThan(1);
  });

  it("preserves weekly seasonality on synthetic weekly pattern", () => {
    // 4 weeks of 7-day repeating pattern: low on weekends, high mid-week
    const base = [20, 22, 35, 38, 36, 25, 18];
    const obs: number[] = [];
    for (let w = 0; w < 4; w++) {
      obs.push(...base);
    }
    const fitted = fitHoltWinters(obs, DEFAULT_HW_CONFIG);
    // Seasonal indices should reflect the pattern
    const maxSeasonal = Math.max(...fitted.seasonal);
    const minSeasonal = Math.min(...fitted.seasonal);
    expect(maxSeasonal - minSeasonal).toBeGreaterThan(5);
  });
});

describe("forecastHoltWinters", () => {
  it("produces horizon-length forecast", () => {
    const fitted = { level: 100, trend: 0, seasonal: [0, 0, 0, 0, 0, 0, 0] };
    const forecast = forecastHoltWinters(fitted, DEFAULT_HW_CONFIG, new Date("2024-06-01"));
    expect(forecast).toHaveLength(DEFAULT_HW_CONFIG.forecastHorizon);
  });

  it("clamps negative forecasts to zero", () => {
    const fitted = { level: -5, trend: 0, seasonal: [0, 0, 0, 0, 0, 0, 0] };
    const forecast = forecastHoltWinters(fitted, DEFAULT_HW_CONFIG, new Date("2024-06-01"));
    expect(forecast[0].forecastedUnits).toBe(0);
  });

  it("advances dates by one day per step", () => {
    const fitted = { level: 50, trend: 0, seasonal: [0, 0, 0, 0, 0, 0, 0] };
    const forecast = forecastHoltWinters(fitted, DEFAULT_HW_CONFIG, new Date("2024-06-01"));
    expect(forecast[0].timestamp.getDate()).toBe(2);
    expect(forecast[6].timestamp.getDate()).toBe(8);
  });
});

describe("exponentialSmoothing (integration)", () => {
  it("returns empty forecast for empty input", () => {
    const result = exponentialSmoothing([]);
    expect(result.forecast).toHaveLength(0);
    expect(result.summary.totalForecastedUnits).toBe(0);
  });

  it("returns forecast for 90-day constant data", () => {
    const data: UsageDataPoint[] = Array.from({ length: 90 }, (_, i) => ({
      timestamp: new Date(`2024-03-${String(i + 1).padStart(2, "0")}`),
      normalizedUnits: 100,
    }));
    const result = exponentialSmoothing(data);
    expect(result.forecast).toHaveLength(30);
    expect(result.summary.averageDailyUnits).toBeCloseTo(100, 0);
    expect(result.summary.peakDailyUnits).toBeGreaterThan(90);
  });

  it("returns forecast for 90-day seasonal data", () => {
    const base = [20, 22, 35, 38, 36, 25, 18];
    const data: UsageDataPoint[] = [];
    for (let w = 0; w < 13; w++) {
      for (let d = 0; d < 7; d++) {
        const day = w * 7 + d + 1;
        if (day > 90) break;
        data.push({
          timestamp: new Date(`2024-03-${String(day).padStart(2, "0")}`),
          normalizedUnits: base[d],
        });
      }
    }
    const result = exponentialSmoothing(data);
    expect(result.forecast).toHaveLength(30);
    // Forecast should roughly preserve the pattern
    const maxForecast = Math.max(...result.forecast.map((f) => f.forecastedUnits));
    const minForecast = Math.min(...result.forecast.map((f) => f.forecastedUnits));
    expect(maxForecast - minForecast).toBeGreaterThan(5);
  });

  it("detects upward trend", () => {
    const data: UsageDataPoint[] = Array.from({ length: 90 }, (_, i) => ({
      timestamp: new Date(`2024-03-${String(i + 1).padStart(2, "0")}`),
      normalizedUnits: 50 + i * 0.5,
    }));
    const result = exponentialSmoothing(data);
    // The last few forecast days should be higher than the first few
    const firstWeek = result.forecast.slice(0, 7);
    const lastWeek = result.forecast.slice(-7);
    const firstAvg = firstWeek.reduce((s, p) => s + p.forecastedUnits, 0) / 7;
    const lastAvg = lastWeek.reduce((s, p) => s + p.forecastedUnits, 0) / 7;
    expect(lastAvg).toBeGreaterThan(firstAvg);
  });
});
