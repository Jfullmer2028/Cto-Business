-- Seed synthetic data for ReserveIQ

-- Organizations
INSERT INTO "organizations" ("id", "name", "slug", "plan", "created_at", "updated_at")
VALUES
  ('org_acme', 'Acme Corp', 'acme-corp', 'GROWTH', NOW(), NOW()),
  ('org_globex', 'Globex Industries', 'globex-industries', 'ENTERPRISE', NOW(), NOW()),
  ('org_initech', 'Initech', 'initech', 'STARTER', NOW(), NOW());

-- Cloud Accounts
INSERT INTO "cloud_accounts" ("id", "organization_id", "provider", "account_id", "account_name", "region", "status", "created_at", "updated_at")
VALUES
  ('ca_acme_1', 'org_acme', 'AWS', '123456789012', 'Acme Production', 'us-east-1', 'ACTIVE', NOW(), NOW()),
  ('ca_acme_2', 'org_acme', 'AWS', '123456789013', 'Acme Staging', 'us-west-2', 'ACTIVE', NOW(), NOW()),
  ('ca_acme_3', 'org_acme', 'AZURE', 'acme-azure-prod', 'Acme Azure Production', 'eastus', 'ACTIVE', NOW(), NOW()),
  ('ca_globex_1', 'org_globex', 'AWS', '987654321098', 'Globex Primary', 'eu-west-1', 'ACTIVE', NOW(), NOW()),
  ('ca_globex_2', 'org_globex', 'GCP', 'globex-gcp-001', 'Globex GCP', 'us-central1', 'ACTIVE', NOW(), NOW()),
  ('ca_initech_1', 'org_initech', 'AWS', '555555555555', 'Initech Main', 'us-east-2', 'ACTIVE', NOW(), NOW());

-- Usage Metrics (30 days of synthetic data)
DO $$
DECLARE
  i INT;
  metric_date TIMESTAMP;
BEGIN
  FOR i IN 0..29 LOOP
    metric_date := DATE_TRUNC('day', NOW() - INTERVAL '1 day' * i);

    -- Acme Production EC2
    INSERT INTO "usage_metrics" ("id", "organization_id", "cloud_account_id", "service_type", "resource_type", "usage_amount", "unit", "cost", "currency", "timestamp", "granularity", "created_at")
    VALUES (gen_random_uuid()::text, 'org_acme', 'ca_acme_1', 'EC2', 'm5.xlarge', 24 + random() * 4, 'Hours', 4.0 + random() * 1.5, 'USD', metric_date, 'DAILY', NOW());

    INSERT INTO "usage_metrics" ("id", "organization_id", "cloud_account_id", "service_type", "resource_type", "usage_amount", "unit", "cost", "currency", "timestamp", "granularity", "created_at")
    VALUES (gen_random_uuid()::text, 'org_acme', 'ca_acme_1', 'EC2', 'r5.large', 24 + random() * 2, 'Hours', 2.5 + random() * 0.8, 'USD', metric_date, 'DAILY', NOW());

    -- Globex Primary EC2
    INSERT INTO "usage_metrics" ("id", "organization_id", "cloud_account_id", "service_type", "resource_type", "usage_amount", "unit", "cost", "currency", "timestamp", "granularity", "created_at")
    VALUES (gen_random_uuid()::text, 'org_globex', 'ca_globex_1', 'EC2', 'c5.2xlarge', 24 + random() * 3, 'Hours', 6.0 + random() * 2.0, 'USD', metric_date, 'DAILY', NOW());

    -- Initech Main EC2
    INSERT INTO "usage_metrics" ("id", "organization_id", "cloud_account_id", "service_type", "resource_type", "usage_amount", "unit", "cost", "currency", "timestamp", "granularity", "created_at")
    VALUES (gen_random_uuid()::text, 'org_initech', 'ca_initech_1', 'EC2', 't3.medium', 12 + random() * 4, 'Hours', 1.0 + random() * 0.5, 'USD', metric_date, 'DAILY', NOW());

    -- RDS every 3rd day
    IF i % 3 = 0 THEN
      INSERT INTO "usage_metrics" ("id", "organization_id", "cloud_account_id", "service_type", "resource_type", "usage_amount", "unit", "cost", "currency", "timestamp", "granularity", "created_at")
      VALUES (gen_random_uuid()::text, 'org_acme', 'ca_acme_1', 'RDS', 'db.r5.xlarge', 24, 'Hours', 6.0 + random() * 1.0, 'USD', metric_date, 'DAILY', NOW());
    END IF;
  END LOOP;
END $$;

-- Reservation Portfolios
INSERT INTO "reservation_portfolios" ("id", "organization_id", "cloud_account_id", "reservation_type", "term", "offering_class", "instance_family", "instance_type", "region", "quantity", "start_date", "end_date", "hourly_price", "upfront_cost", "total_value", "utilization_rate", "status", "created_at", "updated_at")
VALUES
  ('rp_1', 'org_acme', 'ca_acme_1', 'STANDARD', 'ONE_YEAR', 'STANDARD', 'm5', 'm5.xlarge', 'us-east-1', 10, '2024-01-01', '2025-01-01', 0.096, 500.0, 1340.0, 0.92, 'ACTIVE', NOW(), NOW()),
  ('rp_2', 'org_acme', 'ca_acme_1', 'CONVERTIBLE', 'THREE_YEAR', 'CONVERTIBLE', 'r5', 'r5.large', 'us-east-1', 20, '2024-03-01', '2027-03-01', 0.045, 1200.0, 3600.0, 0.88, 'ACTIVE', NOW(), NOW()),
  ('rp_3', 'org_globex', 'ca_globex_1', 'STANDARD', 'ONE_YEAR', 'STANDARD', 'c5', 'c5.2xlarge', 'eu-west-1', 5, '2024-06-01', '2025-06-01', 0.17, 800.0, 2400.0, 0.95, 'ACTIVE', NOW(), NOW());

-- Recommendations
INSERT INTO "recommendations" ("id", "organization_id", "cloud_account_id", "type", "action", "resource_type", "instance_family", "region", "recommended_quantity", "expected_savings", "expected_utilization", "confidence_score", "roi_score", "status", "valid_until", "reason", "created_at", "updated_at")
VALUES
  ('rec_1', 'org_acme', 'ca_acme_1', 'PURCHASE', 'purchase_m5_2xlarge_1y', 'm5.2xlarge', 'm5', 'us-east-1', 4, 2400.0, 0.94, 0.91, 2.4, 'PENDING', NOW() + INTERVAL '7 days', 'Steady 24/7 usage on m5 family with 94% predicted utilization', NOW(), NOW()),
  ('rec_2', 'org_globex', 'ca_globex_1', 'PURCHASE', 'purchase_r5_xlarge_3y', 'r5.xlarge', 'r5', 'eu-west-1', 8, 8500.0, 0.96, 0.88, 3.1, 'PENDING', NOW() + INTERVAL '14 days', 'Database workloads show consistent memory-bound usage', NOW(), NOW()),
  ('rec_3', 'org_initech', 'ca_initech_1', 'PURCHASE', 'purchase_t3_medium_1y', 't3.medium', 't3', 'us-east-2', 2, 350.0, 0.85, 0.75, 1.8, 'PENDING', NOW() + INTERVAL '7 days', 'Dev environments running business hours only', NOW(), NOW());

-- Execution Plans
INSERT INTO "execution_plans" ("id", "organization_id", "recommendation_id", "status", "scheduled_at", "executed_at", "executed_by", "details", "created_at", "updated_at")
VALUES
  ('ep_1', 'org_acme', NULL, 'COMPLETED', '2024-06-01T10:00:00Z', '2024-06-01T10:05:00Z', 'finops@acme.com', '{"purchaseId": "ri-123456", "instances": ["m5.xlarge"]}', NOW(), NOW()),
  ('ep_2', 'org_globex', NULL, 'PENDING_APPROVAL', NULL, NULL, NULL, NULL, NOW(), NOW());

-- Transaction Logs
INSERT INTO "transaction_logs" ("id", "organization_id", "execution_plan_id", "action", "resource_type", "quantity", "provider", "region", "status", "message", "created_at")
VALUES
  ('tl_1', 'org_acme', 'ep_1', 'purchase', 'm5.xlarge', 10, 'AWS', 'us-east-1', 'SUCCESS', 'Reserved Instances purchased successfully', NOW());
