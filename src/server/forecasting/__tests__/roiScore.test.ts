import { scoreSingle, roiScore } from "../roiScore";
import type { DeficitGap, PricingInputs } from "../types";

describe("scoreSingle", () => {
  const gap: DeficitGap = {
    region: "us-east-1",
    instanceFamily: "m5",
    term: "ONE_YEAR",
    instanceType: "m5.xlarge",
    forecastedDemand: 24,
    reservedCapacity: 10,
    deficit: 14,
  };

  const pricing: PricingInputs = {
    hourlyOnDemandRate: 0.192,
    hourlyRiRate: 0.096,
    upfrontCostPerUnit: 500,
  };

  it("returns null when monthly savings are zero or negative", () => {
    const badPricing: PricingInputs = {
      hourlyOnDemandRate: 0.096,
      hourlyRiRate: 0.192,
      upfrontCostPerUnit: 500,
    };
    const result = scoreSingle({
      gap,
      pricing: badPricing,
      confidenceScore: 0.9,
      termMonths: 12,
    });
    expect(result).toBeNull();
  });

  it("returns null when break-even >= 6 months", () => {
    const expensivePricing: PricingInputs = {
      hourlyOnDemandRate: 0.11,
      hourlyRiRate: 0.096,
      upfrontCostPerUnit: 5000,
    };
    const result = scoreSingle({
      gap,
      pricing: expensivePricing,
      confidenceScore: 0.9,
      termMonths: 12,
    });
    expect(result).toBeNull();
  });

  it("returns a valid candidate for good economics", () => {
    const result = scoreSingle({
      gap,
      pricing,
      confidenceScore: 0.9,
      termMonths: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.recommendedQuantity).toBe(14);
    expect(result!.region).toBe("us-east-1");
    expect(result!.instanceType).toBe("m5.xlarge");
    expect(result!.breakEvenMonths).toBeLessThan(6);
    expect(result!.roiScore).toBeGreaterThan(0);
    expect(result!.expectedSavings).toBeGreaterThan(0);
    expect(result!.confidenceScore).toBe(0.9);
  });

  it("rounds deficit up to nearest whole instance", () => {
    const smallGap: DeficitGap = { ...gap, deficit: 2.1 };
    const result = scoreSingle({
      gap: smallGap,
      pricing,
      confidenceScore: 0.8,
      termMonths: 12,
    });
    expect(result!.recommendedQuantity).toBe(3);
  });

  it("returns null when deficit is effectively zero", () => {
    const tinyGap: DeficitGap = { ...gap, deficit: 0.1 };
    const result = scoreSingle({
      gap: tinyGap,
      pricing,
      confidenceScore: 0.8,
      termMonths: 12,
    });
    expect(result!.recommendedQuantity).toBe(1);
    expect(result).not.toBeNull();
  });

  it("computes correct savings for known values", () => {
    const knownGap: DeficitGap = {
      region: "us-east-1",
      instanceFamily: "m5",
      term: "ONE_YEAR",
      instanceType: "m5.xlarge",
      forecastedDemand: 10,
      reservedCapacity: 0,
      deficit: 10,
    };
    const knownPricing: PricingInputs = {
      hourlyOnDemandRate: 1.0,
      hourlyRiRate: 0.5,
      upfrontCostPerUnit: 100,
    };
    const result = scoreSingle({
      gap: knownGap,
      pricing: knownPricing,
      confidenceScore: 1.0,
      termMonths: 12,
    });
    expect(result).not.toBeNull();
    // Monthly savings = 10 * (1.0 - 0.5) * 730 = 3650
    // Total savings = 3650 * 12 = 43800
    expect(result!.expectedSavings).toBeCloseTo(43800, 0);
    // Upfront = 10 * 100 = 1000
    // ROI = 43800 / 1000 = 43.8
    expect(result!.roiScore).toBeCloseTo(43.8, 0);
    // Break-even = 1000 / 3650 = 0.27 months
    expect(result!.breakEvenMonths).toBeCloseTo(0.27, 1);
  });

  it("includes a human-readable reason", () => {
    const result = scoreSingle({
      gap,
      pricing,
      confidenceScore: 0.9,
      termMonths: 12,
    });
    expect(result!.reason).toContain("m5");
    expect(result!.reason).toContain("us-east-1");
    expect(result!.reason).toContain("breaks even");
  });
});

describe("roiScore (batch)", () => {
  const pricing: PricingInputs = {
    hourlyOnDemandRate: 0.192,
    hourlyRiRate: 0.096,
    upfrontCostPerUnit: 500,
  };

  it("returns empty array when all gaps are uneconomical", () => {
    const inputs = [
      {
        gap: {
          region: "us-east-1",
          instanceFamily: "m5",
          term: "ONE_YEAR",
          instanceType: "m5.xlarge",
          forecastedDemand: 24,
          reservedCapacity: 10,
          deficit: 14,
        } as DeficitGap,
        pricing: {
          hourlyOnDemandRate: 0.096,
          hourlyRiRate: 0.192,
          upfrontCostPerUnit: 500,
        } as PricingInputs,
        confidenceScore: 0.9,
        termMonths: 12,
      },
    ];
    expect(roiScore(inputs)).toEqual([]);
  });

  it("ranks candidates by ROI descending", () => {
    const inputs = [
      {
        gap: {
          region: "us-east-1",
          instanceFamily: "m5",
          term: "ONE_YEAR",
          instanceType: "m5.xlarge",
          forecastedDemand: 24,
          reservedCapacity: 10,
          deficit: 5,
        } as DeficitGap,
        pricing: { ...pricing, upfrontCostPerUnit: 2000 },
        confidenceScore: 0.9,
        termMonths: 12,
      },
      {
        gap: {
          region: "eu-west-1",
          instanceFamily: "r5",
          term: "THREE_YEAR",
          instanceType: "r5.xlarge",
          forecastedDemand: 50,
          reservedCapacity: 0,
          deficit: 50,
        } as DeficitGap,
        pricing: { ...pricing, upfrontCostPerUnit: 100 },
        confidenceScore: 0.8,
        termMonths: 36,
      },
    ];
    const candidates = roiScore(inputs);
    expect(candidates).toHaveLength(2);
    // The larger gap with lower upfront should have much higher ROI
    expect(candidates[0].roiScore).toBeGreaterThan(candidates[1].roiScore);
  });

  it("falls back to confidence score when ROI ties", () => {
    const gap: DeficitGap = {
      region: "us-east-1",
      instanceFamily: "m5",
      term: "ONE_YEAR",
      instanceType: "m5.xlarge",
      forecastedDemand: 24,
      reservedCapacity: 10,
      deficit: 10,
    };
    const inputs = [
      {
        gap,
        pricing,
        confidenceScore: 0.5,
        termMonths: 12,
      },
      {
        gap,
        pricing,
        confidenceScore: 0.95,
        termMonths: 12,
      },
    ];
    const candidates = roiScore(inputs);
    expect(candidates[0].confidenceScore).toBe(0.95);
    expect(candidates[1].confidenceScore).toBe(0.5);
  });

  it("is deterministic", () => {
    const gap: DeficitGap = {
      region: "us-east-1",
      instanceFamily: "m5",
      term: "ONE_YEAR",
      instanceType: "m5.xlarge",
      forecastedDemand: 24,
      reservedCapacity: 10,
      deficit: 10,
    };
    const inputs = [
      {
        gap,
        pricing,
        confidenceScore: 0.9,
        termMonths: 12,
      },
    ];
    const a = roiScore(inputs);
    const b = roiScore(inputs);
    expect(a).toEqual(b);
  });
});
