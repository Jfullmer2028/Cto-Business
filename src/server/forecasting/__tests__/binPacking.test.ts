import {
  computeReservedCapacity,
  computeDeficitGap,
  binPacking,
} from "../binPacking";
import type { ReservationItem, ForecastPoint, BinPackingInput } from "../types";

describe("computeReservedCapacity", () => {
  it("returns 0 for empty reservations", () => {
    expect(computeReservedCapacity([])).toBe(0);
  });

  it("sums quantity of active reservations", () => {
    const now = new Date("2024-06-15");
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 10, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 5, startDate: new Date("2024-03-01"), endDate: new Date("2025-03-01"), hourlyPrice: 0.1, upfrontCost: 250, totalValue: 500 },
    ];
    expect(computeReservedCapacity(reservations, now)).toBe(15);
  });

  it("ignores expired reservations", () => {
    const now = new Date("2024-06-15");
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 10, startDate: new Date("2023-01-01"), endDate: new Date("2024-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 5, startDate: new Date("2024-03-01"), endDate: new Date("2025-03-01"), hourlyPrice: 0.1, upfrontCost: 250, totalValue: 500 },
    ];
    expect(computeReservedCapacity(reservations, now)).toBe(5);
  });

  it("applies utilization rate weighting", () => {
    const now = new Date("2024-06-15");
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 10, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000, utilizationRate: 0.8 },
    ];
    expect(computeReservedCapacity(reservations, now)).toBe(8);
  });
});

describe("computeDeficitGap", () => {
  const baseInput: BinPackingInput = {
    forecast: Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
      forecastedUnits: 24,
    })),
    instanceType: "m5.xlarge",
    region: "us-east-1",
    instanceFamily: "m5",
    term: "ONE_YEAR",
    reservations: [],
  };

  it("returns null for empty forecast", () => {
    const result = computeDeficitGap({ ...baseInput, forecast: [] });
    expect(result).toBeNull();
  });

  it("returns null when demand is fully covered", () => {
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 30, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
    ];
    const result = computeDeficitGap({ ...baseInput, reservations });
    expect(result).toBeNull();
  });

  it("returns deficit when demand exceeds capacity", () => {
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 10, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
    ];
    const result = computeDeficitGap({ ...baseInput, reservations });
    expect(result).not.toBeNull();
    expect(result!.deficit).toBeCloseTo(14, 0);
    expect(result!.forecastedDemand).toBe(24);
    expect(result!.reservedCapacity).toBe(10);
  });

  it("ignores non-matching reservations", () => {
    const reservations: ReservationItem[] = [
      { region: "eu-west-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 30, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
      { region: "us-east-1", instanceFamily: "r5", term: "ONE_YEAR", instanceType: "r5.large", quantity: 30, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
    ];
    const result = computeDeficitGap({ ...baseInput, reservations });
    expect(result).not.toBeNull();
    expect(result!.deficit).toBe(24);
  });

  it("ignores expired reservations in deficit calc", () => {
    const now = new Date("2024-06-15");
    const reservations: ReservationItem[] = [
      { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 30, startDate: new Date("2023-01-01"), endDate: new Date("2024-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
    ];
    const result = computeDeficitGap({ ...baseInput, reservations }, now);
    expect(result).not.toBeNull();
    expect(result!.deficit).toBe(24);
  });
});

describe("binPacking", () => {
  it("returns empty array when all demand is covered", () => {
    const inputs: BinPackingInput[] = [
      {
        forecast: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
          forecastedUnits: 10,
        })),
        instanceType: "m5.xlarge",
        region: "us-east-1",
        instanceFamily: "m5",
        term: "ONE_YEAR",
        reservations: [
          { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 20, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
        ],
      },
    ];
    expect(binPacking(inputs)).toEqual([]);
  });

  it("returns multiple deficit gaps sorted by deficit descending", () => {
    const inputs: BinPackingInput[] = [
      {
        forecast: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
          forecastedUnits: 10,
        })),
        instanceType: "m5.xlarge",
        region: "us-east-1",
        instanceFamily: "m5",
        term: "ONE_YEAR",
        reservations: [
          { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 5, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
        ],
      },
      {
        forecast: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
          forecastedUnits: 50,
        })),
        instanceType: "r5.xlarge",
        region: "eu-west-1",
        instanceFamily: "r5",
        term: "THREE_YEAR",
        reservations: [],
      },
    ];
    const gaps = binPacking(inputs);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].deficit).toBe(50);
    expect(gaps[1].deficit).toBe(5);
  });

  it("is deterministic", () => {
    const inputs: BinPackingInput[] = [
      {
        forecast: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(`2024-06-${String(i + 1).padStart(2, "0")}`),
          forecastedUnits: 20,
        })),
        instanceType: "m5.xlarge",
        region: "us-east-1",
        instanceFamily: "m5",
        term: "ONE_YEAR",
        reservations: [
          { region: "us-east-1", instanceFamily: "m5", term: "ONE_YEAR", instanceType: "m5.xlarge", quantity: 5, startDate: new Date("2024-01-01"), endDate: new Date("2025-01-01"), hourlyPrice: 0.1, upfrontCost: 500, totalValue: 1000 },
        ],
      },
    ];
    const a = binPacking(inputs);
    const b = binPacking(inputs);
    expect(a).toEqual(b);
  });
});
