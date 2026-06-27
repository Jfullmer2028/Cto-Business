/**
 * ROI scoring engine.
 *
 * For each deficit gap, compute the projected return-on-investment of
 * purchasing additional reserved capacity.  Only candidates with a
 * break-even point < 6 months are emitted (this is the ReserveIQ
 * quality gate that protects the >95% utilization KPI).
 *
 * Pure & deterministic — no side effects.
 */

import type {
  DeficitGap,
  PricingInputs,
  RecommendationCandidate,
} from "./types";

export interface RoiScoreInput {
  gap: DeficitGap;
  pricing: PricingInputs;
  /** Confidence score from the forecasting model (0–1). */
  confidenceScore: number;
  /** Number of months in the reservation term. */
  termMonths: number;
}

/** Hours in an average month (365.25 / 12 * 24 ≈ 730). */
const HOURS_PER_MONTH = 730;

/** Maximum acceptable break-even months (6). */
const MAX_BREAK_EVEN_MONTHS = 6;

/**
 * Compute ROI for a single deficit gap.
 *
 * Returns `null` if the candidate does not meet the break-even threshold.
 */
export function scoreSingle(
  input: RoiScoreInput,
): RecommendationCandidate | null {
  const {
    gap,
    pricing,
    confidenceScore,
    termMonths,
  } = input;

  // Recommended quantity: round deficit up to nearest whole instance
  const recommendedQuantity = Math.ceil(gap.deficit);
  if (recommendedQuantity <= 0) {
    return null;
  }

  const {
    hourlyOnDemandRate,
    hourlyRiRate,
    upfrontCostPerUnit,
  } = pricing;

  const totalUpfront = recommendedQuantity * upfrontCostPerUnit;

  // Monthly costs
  const monthlyOnDemandCost =
    recommendedQuantity * hourlyOnDemandRate * HOURS_PER_MONTH;
  const monthlyRiCost =
    recommendedQuantity * hourlyRiRate * HOURS_PER_MONTH;
  const monthlySavings = monthlyOnDemandCost - monthlyRiCost;

  if (monthlySavings <= 0) {
    return null;
  }

  const breakEvenMonths = totalUpfront / monthlySavings;

  if (breakEvenMonths >= MAX_BREAK_EVEN_MONTHS) {
    return null;
  }

  const totalSavings = monthlySavings * termMonths;
  const roiScore =
    totalUpfront > 0 ? totalSavings / totalUpfront : Number.POSITIVE_INFINITY;

  const reason = buildReason(
    gap,
    recommendedQuantity,
    breakEvenMonths,
    monthlySavings,
  );

  return {
    region: gap.region,
    instanceFamily: gap.instanceFamily,
    term: gap.term,
    instanceType: gap.instanceType,
    recommendedQuantity,
    expectedSavings: totalSavings,
    roiScore,
    breakEvenMonths,
    confidenceScore,
    reason,
  };
}

/**
 * Score a batch of deficit gaps and return ranked recommendation candidates.
 */
export function roiScore(
  inputs: RoiScoreInput[],
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];
  for (const input of inputs) {
    const candidate = scoreSingle(input);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  // Rank by ROI score descending, then by confidence descending
  return candidates.sort(
    (a, b) =>
      b.roiScore - a.roiScore ||
      b.confidenceScore - a.confidenceScore,
  );
}

/**
 * Human-readable explanation for the recommendation.
 */
function buildReason(
  gap: DeficitGap,
  quantity: number,
  breakEvenMonths: number,
  monthlySavings: number,
): string {
  const termLabel = gap.term.toLowerCase().replace(/_/g, " ");
  return (
    `Forecasted ${gap.instanceFamily} demand in ${gap.region} exceeds ` +
    `reserved capacity by ${gap.deficit.toFixed(1)} units. ` +
    `Purchasing ${quantity} ${gap.instanceType} ${termLabel} reserved ` +
    `instances breaks even in ${breakEvenMonths.toFixed(1)} months ` +
    `and saves ~$${monthlySavings.toFixed(0)}/month.`
  );
}
