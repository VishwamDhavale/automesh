# Automesh

Automesh is a powerful, event-driven AI Workflow Engine. It allows you to connect different tools (like Stripe, GitHub, Slack, and Email) and automatically run custom actions when specific events happen or on a schedule.

Automesh provides a Next.js-based Dashboard with a Visual Builder, AI-assisted workflow generation, and a robust Fastify API powered by BullMQ and Postgres. Workflows can be defined simply using YAML files or created via our intuitive visual interface.

## 🚀 Features

- **Event-Driven Workflows:** Run actions automatically based on webhooks from tools like Stripe, GitHub, Slack, resend and more.
- **Scheduled Executions (Cron):** Run workflows periodically.
- **Visual Builder:** Drag-and-drop workflow creation in the dashboard.
- **AI-Powered Generation:** Describe your workflow in plain English and Automesh will generate the underlying YAML definition.
- **Powerful Orchestration:** Features conditions, variable interpolation (passing data between steps), and automatic error handling (retries and fallbacks).

## 🛠️ Tech Stack

This project is structured as a monorepo using `pnpm` workspaces:

- **Dashboard (`apps/dashboard`):** Next.js 14+ (App Router), ReactFlow, Tailwind CSS.
- **API Engine (`apps/api`):** Fastify, BullMQ, Redis, Postgres, Drizzle ORM, Zod.
- **Shared Packages (`packages/*`):** Shared types, action plugins, integration connectors, and the core workflow engine.

## 🏁 Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm (v9+)
- Docker & Docker Compose (for running Postgres and Redis)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VishwamDhavale/automesh.git
   cd automesh
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up the database and message broker:**
   The easiest way is to use the provided `docker-compose.yml`.
   ```bash
   pnpm docker:up
   ```

4. **Environment Variables:**
   Copy the example environment files for both the API and Dashboard and update them:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/dashboard/.env.example apps/dashboard/.env
   cp .env.example .env
   ```

5. **Initialise the Database:**
   Generate and run the database migrations:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. **Start the Development Servers:**
   Run both the API and Dashboard concurrently:
   ```bash
   pnpm dev
   ```
   > The Dashboard will be running at `http://localhost:3000` and the API at `http://localhost:3001` (or your configured port). You can also run the Smee.io webhook proxy using `pnpm webhooks`.

## 📖 Documentation

Detailed documentation on how to use Automesh, write workflows, and build plugins can be found in the [`docs/`](./docs) directory:

- [How to use Automesh](./docs/how-to-use-automesh.md)
- [Workflow DSL Reference](./docs/workflow-dsl.md)
- [API Reference](./docs/api-reference.md)
- [Plugin Development Guide](./docs/plugin-development.md)
- [Integration Setup](./docs/integration-setup.md) 

## 📜 License

This project is licensed under the [Apache License 2.0](LICENSE).
