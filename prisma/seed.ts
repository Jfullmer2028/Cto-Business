import { PrismaClient, CloudProvider, SubscriptionPlan, ServiceType, Granularity, AccountStatus, ReservationType, TermLength, OfferingClass, RecommendationType, ExecutionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing data
  await prisma.transactionLog.deleteMany();
  await prisma.executionPlan.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.reservationPortfolio.deleteMany();
  await prisma.usageMetric.deleteMany();
  await prisma.cloudAccount.deleteMany();
  await prisma.organization.deleteMany();

  // Organization 1: Acme Corp (Growth)
  const acme = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
      plan: SubscriptionPlan.GROWTH,
      cloudAccounts: {
        create: [
          {
            provider: CloudProvider.AWS,
            accountId: "123456789012",
            accountName: "Acme Production",
            region: "us-east-1",
            status: AccountStatus.ACTIVE,
          },
          {
            provider: CloudProvider.AWS,
            accountId: "123456789013",
            accountName: "Acme Staging",
            region: "us-west-2",
            status: AccountStatus.ACTIVE,
          },
          {
            provider: CloudProvider.AZURE,
            accountId: "acme-azure-prod",
            accountName: "Acme Azure Production",
            region: "eastus",
            status: AccountStatus.ACTIVE,
          },
        ],
      },
    },
    include: { cloudAccounts: true },
  });

  // Organization 2: Globex (Enterprise)
  const globex = await prisma.organization.create({
    data: {
      name: "Globex Industries",
      slug: "globex-industries",
      plan: SubscriptionPlan.ENTERPRISE,
      cloudAccounts: {
        create: [
          {
            provider: CloudProvider.AWS,
            accountId: "987654321098",
            accountName: "Globex Primary",
            region: "eu-west-1",
            status: AccountStatus.ACTIVE,
          },
          {
            provider: CloudProvider.GCP,
            accountId: "globex-gcp-001",
            accountName: "Globex GCP",
            region: "us-central1",
            status: AccountStatus.ACTIVE,
          },
        ],
      },
    },
    include: { cloudAccounts: true },
  });

  // Organization 3: Initech (Starter)
  const initech = await prisma.organization.create({
    data: {
      name: "Initech",
      slug: "initech",
      plan: SubscriptionPlan.STARTER,
      cloudAccounts: {
        create: [
          {
            provider: CloudProvider.AWS,
            accountId: "555555555555",
            accountName: "Initech Main",
            region: "us-east-2",
            status: AccountStatus.ACTIVE,
          },
        ],
      },
    },
    include: { cloudAccounts: true },
  });

  const allAccounts = [...acme.cloudAccounts, ...globex.cloudAccounts, ...initech.cloudAccounts];

  // Seed UsageMetrics for the last 90 days
  const now = new Date();
  const metricsData: {
    organizationId: string;
    cloudAccountId: string;
    serviceType: ServiceType;
    resourceType: string;
    usageAmount: number;
    unit: string;
    cost: number;
    timestamp: Date;
    granularity: Granularity;
  }[] = [];

  for (const account of allAccounts) {
    const orgId =
      account.provider === CloudProvider.AWS && account.accountId.startsWith("123")
        ? acme.id
        : account.provider === CloudProvider.AZURE
        ? acme.id
        : account.provider === CloudProvider.GCP
        ? globex.id
        : initech.id;

    for (let i = 0; i < 90; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // EC2 usage
      metricsData.push({
        organizationId: orgId,
        cloudAccountId: account.id,
        serviceType: ServiceType.EC2,
        resourceType: "m5.xlarge",
        usageAmount: 24 + Math.random() * 4,
        unit: "Hours",
        cost: 4.0 + Math.random() * 1.5,
        timestamp: date,
        granularity: Granularity.DAILY,
      });

      metricsData.push({
        organizationId: orgId,
        cloudAccountId: account.id,
        serviceType: ServiceType.EC2,
        resourceType: "r5.large",
        usageAmount: 24 + Math.random() * 2,
        unit: "Hours",
        cost: 2.5 + Math.random() * 0.8,
        timestamp: date,
        granularity: Granularity.DAILY,
      });

      // RDS usage
      if (i % 3 === 0) {
        metricsData.push({
          organizationId: orgId,
          cloudAccountId: account.id,
          serviceType: ServiceType.RDS,
          resourceType: "db.r5.xlarge",
          usageAmount: 24,
          unit: "Hours",
          cost: 6.0 + Math.random() * 1.0,
          timestamp: date,
          granularity: Granularity.DAILY,
        });
      }
    }
  }

  // Batch insert usage metrics
  for (const metric of metricsData) {
    await prisma.usageMetric.create({ data: metric });
  }

  // Seed ReservationPortfolios
  const reservationData: {
    organizationId: string;
    cloudAccountId: string;
    reservationType: ReservationType;
    term: TermLength;
    offeringClass: OfferingClass;
    instanceFamily: string;
    instanceType: string;
    region: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
    hourlyPrice: number;
    upfrontCost: number;
    totalValue: number;
    utilizationRate: number;
  }[] = [
    {
      organizationId: acme.id,
      cloudAccountId: acme.cloudAccounts[0].id,
      reservationType: ReservationType.STANDARD,
      term: TermLength.ONE_YEAR,
      offeringClass: OfferingClass.STANDARD,
      instanceFamily: "m5",
      instanceType: "m5.xlarge",
      region: "us-east-1",
      quantity: 10,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-01-01"),
      hourlyPrice: 0.096,
      upfrontCost: 500.0,
      totalValue: 1340.0,
      utilizationRate: 0.92,
    },
    {
      organizationId: acme.id,
      cloudAccountId: acme.cloudAccounts[0].id,
      reservationType: ReservationType.CONVERTIBLE,
      term: TermLength.THREE_YEAR,
      offeringClass: OfferingClass.CONVERTIBLE,
      instanceFamily: "r5",
      instanceType: "r5.large",
      region: "us-east-1",
      quantity: 20,
      startDate: new Date("2024-03-01"),
      endDate: new Date("2027-03-01"),
      hourlyPrice: 0.045,
      upfrontCost: 1200.0,
      totalValue: 3600.0,
      utilizationRate: 0.88,
    },
    {
      organizationId: globex.id,
      cloudAccountId: globex.cloudAccounts[0].id,
      reservationType: ReservationType.STANDARD,
      term: TermLength.ONE_YEAR,
      offeringClass: OfferingClass.STANDARD,
      instanceFamily: "c5",
      instanceType: "c5.2xlarge",
      region: "eu-west-1",
      quantity: 5,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-06-01"),
      hourlyPrice: 0.17,
      upfrontCost: 800.0,
      totalValue: 2400.0,
      utilizationRate: 0.95,
    },
  ];

  for (const res of reservationData) {
    await prisma.reservationPortfolio.create({ data: res });
  }

  // Seed Recommendations
  const recommendationData: {
    organizationId: string;
    cloudAccountId: string | null;
    type: RecommendationType;
    action: string;
    resourceType: string;
    instanceFamily: string | null;
    region: string | null;
    recommendedQuantity: number;
    expectedSavings: number;
    expectedUtilization: number | null;
    confidenceScore: number;
    roiScore: number | null;
    validUntil: Date;
    reason: string | null;
  }[] = [
    {
      organizationId: acme.id,
      cloudAccountId: acme.cloudAccounts[0].id,
      type: RecommendationType.PURCHASE,
      action: "purchase_m5_2xlarge_1y",
      resourceType: "m5.2xlarge",
      instanceFamily: "m5",
      region: "us-east-1",
      recommendedQuantity: 4,
      expectedSavings: 2400.0,
      expectedUtilization: 0.94,
      confidenceScore: 0.91,
      roiScore: 2.4,
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      reason: "Steady 24/7 usage on m5 family with 94% predicted utilization",
    },
    {
      organizationId: globex.id,
      cloudAccountId: globex.cloudAccounts[0].id,
      type: RecommendationType.PURCHASE,
      action: "purchase_r5_xlarge_3y",
      resourceType: "r5.xlarge",
      instanceFamily: "r5",
      region: "eu-west-1",
      recommendedQuantity: 8,
      expectedSavings: 8500.0,
      expectedUtilization: 0.96,
      confidenceScore: 0.88,
      roiScore: 3.1,
      validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      reason: "Database workloads show consistent memory-bound usage",
    },
    {
      organizationId: initech.id,
      cloudAccountId: initech.cloudAccounts[0].id,
      type: RecommendationType.PURCHASE,
      action: "purchase_t3_medium_1y",
      resourceType: "t3.medium",
      instanceFamily: "t3",
      region: "us-east-2",
      recommendedQuantity: 2,
      expectedSavings: 350.0,
      expectedUtilization: 0.85,
      confidenceScore: 0.75,
      roiScore: 1.8,
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      reason: "Dev environments running business hours only",
    },
  ];

  for (const rec of recommendationData) {
    await prisma.recommendation.create({ data: rec });
  }

  // Seed ExecutionPlans
  const executionData: {
    organizationId: string;
    recommendationId: string | null;
    status: ExecutionStatus;
    scheduledAt: Date | null;
    executedAt: Date | null;
    executedBy: string | null;
    details: any;
  }[] = [
    {
      organizationId: acme.id,
      recommendationId: null,
      status: ExecutionStatus.COMPLETED,
      scheduledAt: new Date("2024-06-01T10:00:00Z"),
      executedAt: new Date("2024-06-01T10:05:00Z"),
      executedBy: "finops@acme.com",
      details: { purchaseId: "ri-123456", instances: ["m5.xlarge"] },
    },
    {
      organizationId: globex.id,
      recommendationId: null,
      status: ExecutionStatus.PENDING_APPROVAL,
      scheduledAt: null,
      executedAt: null,
      executedBy: null,
      details: null,
    },
  ];

  for (const exec of executionData) {
    await prisma.executionPlan.create({ data: exec });
  }

  console.log("Seeded successfully!");
  console.log(`- Organizations: 3 (Acme Corp, Globex Industries, Initech)`);
  console.log(`- Cloud Accounts: ${allAccounts.length}`);
  console.log(`- Usage Metrics: ${metricsData.length}`);
  console.log(`- Reservations: ${reservationData.length}`);
  console.log(`- Recommendations: ${recommendationData.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
