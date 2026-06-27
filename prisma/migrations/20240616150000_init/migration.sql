-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'AZURE', 'GCP');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'ERROR');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('EC2', 'RDS', 'ELASTICACHE', 'COMPUTE', 'SQL', 'COSMOS', 'BIGQUERY', 'GCE');

-- CreateEnum
CREATE TYPE "Granularity" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('STANDARD', 'CONVERTIBLE', 'NEGOTIATED');

-- CreateEnum
CREATE TYPE "TermLength" AS ENUM ('ONE_YEAR', 'THREE_YEAR', 'FIVE_YEAR');

-- CreateEnum
CREATE TYPE "OfferingClass" AS ENUM ('STANDARD', 'CONVERTIBLE');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('PURCHASE', 'MODIFY', 'EXCHANGE', 'SELL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'FAILED', 'ROLLBACK', 'PENDING');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT,
    "region" TEXT,
    "credentials" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cloud_account_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "usage_amount" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "granularity" "Granularity" NOT NULL DEFAULT 'DAILY',
    "tags" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_portfolios" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cloud_account_id" TEXT NOT NULL,
    "reservation_type" "ReservationType" NOT NULL,
    "term" "TermLength" NOT NULL,
    "offering_class" "OfferingClass" NOT NULL,
    "instance_family" TEXT NOT NULL,
    "instance_type" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "hourly_price" DECIMAL(65,30) NOT NULL,
    "upfront_cost" DECIMAL(65,30) NOT NULL,
    "total_value" DECIMAL(65,30) NOT NULL,
    "utilization_rate" DECIMAL(65,30),
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "cloud_account_id" TEXT,
    "type" "RecommendationType" NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "instance_family" TEXT,
    "region" TEXT,
    "recommended_quantity" INTEGER NOT NULL,
    "expected_savings" DECIMAL(65,30) NOT NULL,
    "expected_utilization" DECIMAL(65,30),
    "confidence_score" DECIMAL(65,30) NOT NULL,
    "roi_score" DECIMAL(65,30),
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "recommendation_id" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "executed_by" TEXT,
    "details" JSONB,
    "approval_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "execution_plan_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "region" TEXT,
    "status" "TransactionStatus" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_plan_idx" ON "organizations"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_accounts_organization_id_provider_account_id_key" ON "cloud_accounts"("organization_id", "provider", "account_id");

-- CreateIndex
CREATE INDEX "cloud_accounts_organization_id_status_idx" ON "cloud_accounts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "cloud_accounts_provider_idx" ON "cloud_accounts"("provider");

-- CreateIndex
CREATE INDEX "usage_metrics_organization_id_timestamp_idx" ON "usage_metrics"("organization_id", "timestamp");

-- CreateIndex
CREATE INDEX "usage_metrics_cloud_account_id_timestamp_idx" ON "usage_metrics"("cloud_account_id", "timestamp");

-- CreateIndex
CREATE INDEX "usage_metrics_service_type_resource_type_idx" ON "usage_metrics"("service_type", "resource_type");

-- CreateIndex
CREATE INDEX "usage_metrics_timestamp_idx" ON "usage_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "reservation_portfolios_organization_id_status_idx" ON "reservation_portfolios"("organization_id", "status");

-- CreateIndex
CREATE INDEX "reservation_portfolios_cloud_account_id_end_date_idx" ON "reservation_portfolios"("cloud_account_id", "end_date");

-- CreateIndex
CREATE INDEX "reservation_portfolios_instance_family_region_idx" ON "reservation_portfolios"("instance_family", "region");

-- CreateIndex
CREATE INDEX "reservation_portfolios_end_date_idx" ON "reservation_portfolios"("end_date");

-- CreateIndex
CREATE INDEX "recommendations_organization_id_status_idx" ON "recommendations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "recommendations_status_valid_until_idx" ON "recommendations"("status", "valid_until");

-- CreateIndex
CREATE INDEX "recommendations_cloud_account_id_idx" ON "recommendations"("cloud_account_id");

-- CreateIndex
CREATE INDEX "recommendations_type_idx" ON "recommendations"("type");

-- CreateIndex
CREATE INDEX "execution_plans_organization_id_status_idx" ON "execution_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "execution_plans_status_scheduled_at_idx" ON "execution_plans"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "execution_plans_recommendation_id_idx" ON "execution_plans"("recommendation_id");

-- CreateIndex
CREATE INDEX "transaction_logs_organization_id_created_at_idx" ON "transaction_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "transaction_logs_execution_plan_id_idx" ON "transaction_logs"("execution_plan_id");

-- CreateIndex
CREATE INDEX "transaction_logs_status_idx" ON "transaction_logs"("status");

-- CreateIndex
CREATE INDEX "transaction_logs_provider_idx" ON "transaction_logs"("provider");

-- AddForeignKey
ALTER TABLE "cloud_accounts" ADD CONSTRAINT "cloud_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_cloud_account_id_fkey" FOREIGN KEY ("cloud_account_id") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_portfolios" ADD CONSTRAINT "reservation_portfolios_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_portfolios" ADD CONSTRAINT "reservation_portfolios_cloud_account_id_fkey" FOREIGN KEY ("cloud_account_id") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_execution_plan_id_fkey" FOREIGN KEY ("execution_plan_id") REFERENCES "execution_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
