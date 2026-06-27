/**
 * Bin-packing / coverage-deficit calculator.
 *
 * Matches existing ReservationPortfolio items against forecasted demand
 * per `(region, instanceFamily, term)`.  Where forecasted demand exceeds
 * reserved capacity, a deficit gap is emitted.
 *
 * Pure & deterministic — no database calls, no randomness.
 */

import type {
  ReservationItem,
  ForecastPoint,
  DeficitGap,
} from "./types";

export interface BinPackingInput {
  /** Forecasted daily demand per (region, instanceFamily, term, instanceType). */
  forecast: ForecastPoint[];
  /** The instance type that produced the forecast. */
  instanceType: string;
  region: string;
  instanceFamily: string;
  term: string;
  /** Active reservations that overlap the forecast window. */
  reservations: ReservationItem[];
}

/**
 * Compute effective reserved capacity for a set of reservations.
 * Capacity is the sum of `quantity` items, weighted by utilization rate.
 * Reservations that have expired (endDate < now) are ignored.
 */
export function computeReservedCapacity(
  reservations: ReservationItem[],
  now: Date = new Date(),
): number {
  return reservations
    .filter((r) => r.endDate >= now)
    .reduce((sum, r) => {
      const util = r.utilizationRate ?? 1.0;
      return sum + r.quantity * util;
    }, 0);
}

/**
 * Given a single forecast stream and matching reservations, return the
 * deficit gap (if any).  A positive deficit means uncovered demand.
 */
export function computeDeficitGap(
  input: BinPackingInput,
  now: Date = new Date(),
): DeficitGap | null {
  const { forecast, instanceType, region, instanceFamily, term, reservations } =
    input;

  if (forecast.length === 0) {
    return null;
  }

  // Average forecasted demand across the horizon (units per day)
  const totalForecasted = forecast.reduce(
    (sum, p) => sum + p.forecastedUnits,
    0,
  );
  const avgDemand = totalForecasted / forecast.length;

  // Only count reservations that match the grouping key and are still active
  const matching = reservations.filter(
    (r) =>
      r.region === region &&
      r.instanceFamily === instanceFamily &&
      r.term === term &&
      r.instanceType === instanceType,
  );

  const reservedCapacity = computeReservedCapacity(matching, now);
  const deficit = Math.max(0, avgDemand - reservedCapacity);

  if (deficit <= 0) {
    return null;
  }

  return {
    region,
    instanceFamily,
    term,
    instanceType,
    forecastedDemand: avgDemand,
    reservedCapacity,
    deficit,
  };
}

/**
 * Batch version: accept an array of forecast/reservation bundles and
 * emit all deficit gaps.
 */
export function binPacking(
  inputs: BinPackingInput[],
  now: Date = new Date(),
): DeficitGap[] {
  const gaps: DeficitGap[] = [];
  for (const input of inputs) {
    const gap = computeDeficitGap(input, now);
    if (gap) {
      gaps.push(gap);
    }
  }
  // Sort by largest deficit first (most urgent)
  return gaps.sort((a, b) => b.deficit - a.deficit);
}
