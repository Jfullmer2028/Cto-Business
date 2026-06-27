/**
 * Shared types for the ReserveIQ forecasting engine.
 *
 * These types mirror the Prisma schema shapes but are kept as plain
 * interfaces so the engine remains dependency-free and testable in any
 * runtime (Node, browser, or edge).
 */

export interface UsageDataPoint {
  timestamp: Date;
  normalizedUnits: number;
}

export interface ForecastPoint {
  timestamp: Date;
  forecastedUnits: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface ReservationItem {
  region: string;
  instanceFamily: string;
  term: string; // e.g. "ONE_YEAR" | "THREE_YEAR" | "FIVE_YEAR"
  instanceType: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  hourlyPrice: number;
  upfrontCost: number;
  totalValue: number;
  utilizationRate?: number;
}

export interface DeficitGap {
  region: string;
  instanceFamily: string;
  term: string;
  instanceType: string;
  forecastedDemand: number; // units per day (normalized)
  reservedCapacity: number;
  deficit: number; // positive means uncovered demand
}

export interface PricingInputs {
  hourlyOnDemandRate: number;
  hourlyRiRate: number;
  upfrontCostPerUnit: number;
}

export interface RecommendationCandidate {
  region: string;
  instanceFamily: string;
  term: string;
  instanceType: string;
  recommendedQuantity: number;
  expectedSavings: number; // total projected savings over term
  roiScore: number; // (onDemandCost - riCost) / upfrontCost
  breakEvenMonths: number;
  confidenceScore: number;
  reason: string;
}

export interface HoltWintersConfig {
  alpha: number; // level smoothing (0–1)
  beta: number; // trend smoothing (0–1)
  gamma: number; // seasonal smoothing (0–1)
  seasonalPeriod: number; // days (default 7)
  forecastHorizon: number; // days (default 30)
}

export interface ForecastSummary {
  totalForecastedUnits: number;
  averageDailyUnits: number;
  peakDailyUnits: number;
  peakDate: Date;
}
