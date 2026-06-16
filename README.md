# ReserveIQ

Predictive automation platform for multi-cloud FinOps. Eliminates manual reserved-instance (RI) management by ingesting cost and usage data from AWS, Azure, and GCP, forecasting demand, identifying coverage gaps, and generating ranked purchase plans.

## Local Development Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) 20+ (for running outside containers)
- [Git](https://git-scm.com/)

### Quick Start (Docker)

The fastest way to get the entire stack running locally is with Docker Compose:

```bash
# Clone the repository
git clone <repo-url>
cd reserveiq

# Start PostgreSQL, Redis, and the Next.js app
docker compose up --build
```

The application will be available at [http://localhost:3000](http://localhost:3000).

Services started:

| Service    | Host Port | Description                     |
| ---------- | --------- | ------------------------------- |
| App        | 3000      | Next.js application (dev mode)  |
| PostgreSQL | 5432      | Primary database                |
| Redis      | 6379      | Cache & BullMQ job queue        |

### Environment Variables

Create a `.env.local` file in the project root (it is ignored by Git):

```env
# Database
DATABASE_URL=postgresql://reserveiq:reserveiq_dev@localhost:5432/reserveiq

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=change-me-in-production
NEXTAUTH_URL=http://localhost:3000
```

When running inside Docker Compose, these values are injected automatically via `docker-compose.yml`.

### Running Locally (without Docker)

If you prefer to run services directly on your machine:

1. **Start PostgreSQL & Redis**

   You can use the Docker Compose file to spin up only the infrastructure services:

   ```bash
   docker compose up postgres redis -d
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up the database**

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

### Useful Commands

| Command                                | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `docker compose up --build`            | Build images and start all services            |
| `docker compose up -d`                 | Start all services in detached mode            |
| `docker compose down`                  | Stop and remove containers                     |
| `docker compose down -v`               | Stop containers **and** delete volumes (data)  |
| `docker compose logs -f app`           | Tail application logs                          |
| `docker compose exec app sh`           | Open a shell inside the running app container  |
| `docker compose exec postgres psql -U reserveiq` | Open PostgreSQL CLI                    |
| `docker compose exec redis redis-cli`  | Open Redis CLI                                 |

### Health Checks

All services expose health checks:

- **App**: `GET http://localhost:3000/api/health`
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`

### Production Build

To verify the production Docker image locally:

```bash
docker build --target runner -t reserveiq:local .
docker run -p 3000:3000 --env-file .env reserveiq:local
```

> **Note:** Ensure `next.config.js` contains `output: 'standalone'` so the production stage can copy the minimal server bundle.

---

## Project Structure

```
.
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development stack
├── prisma/                    # Database schema & migrations
├── src/
│   ├── app/                   # Next.js App Router
│   ├── components/            # React components
│   ├── lib/                   # Utilities, Prisma client, queue workers
│   └── server/                # API routes, services, forecasting engine
└── README.md
```

## License

Proprietary — ReserveIQ, Inc.
