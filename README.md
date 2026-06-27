# ReserveIQ

Predictive automation platform for multi-cloud FinOps.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start local PostgreSQL

```bash
docker compose up -d
```

### 3. Set up Prisma

Generate the Prisma Client:

```bash
npm run db:generate
```

Run the initial migration:

```bash
npm run db:migrate
```

This will create all tables and apply the schema defined in `prisma/schema.prisma`.

### 4. Seed the database

```bash
npm run db:seed
```

This creates 3 synthetic organizations with cloud accounts, 30 days of usage metrics, reservation portfolios, recommendations, and execution plans.

### 5. Start the Next.js dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 6. Explore the database (optional)

```bash
npm run db:studio
```

Opens Prisma Studio at [http://localhost:5555](http://localhost:5555).

## Database Schema

The Prisma schema models the core ReserveIQ domain:

| Model | Purpose |
|-------|---------|
| `Organization` | Customer tenants with subscription plans |
| `CloudAccount` | Linked AWS, Azure, and GCP accounts |
| `UsageMetric` | Daily cost and usage telemetry |
| `ReservationPortfolio` | Active and pending RIs / CUDs |
| `Recommendation` | ML-generated purchase/modify/exchange suggestions |
| `ExecutionPlan` | Ranked, approvable action plans |
| `TransactionLog` | Idempotent audit trail of every executed action |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed synthetic data |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:studio` | Open Prisma Studio |
