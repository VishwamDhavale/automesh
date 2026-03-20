```json
{
  "title": "Automesh",
  "slug": "automesh",
  "shortDescription": "An open-source, event-driven AI Workflow Engine with a visual builder and AI-powered generation.",
  "longDescription": "Automesh is a powerful workflow automation platform that allows users to connect various tools like Stripe, GitHub, Slack, and Email to automatically run custom actions based on specific events or schedules. It features a Next.js-based Dashboard with a drag-and-drop Visual Builder and a robust Fastify API powered by BullMQ and Postgres for reliable workflow orchestration.",
  "category": "Full Stack",
  "year": 2024,
  "status": "live",
  "techStack": [
    { "technology": "Next.js" },
    { "technology": "Fastify" },
    { "technology": "BullMQ" },
    { "technology": "PostgreSQL" },
    { "technology": "Redis" },
    { "technology": "Drizzle ORM" },
    { "technology": "ReactFlow" },
    { "technology": "Tailwind CSS" }
  ],
  "features": [
    { "feature": "Event-driven architecture supporting webhooks from Stripe, GitHub, Slack, and Resend" },
    { "feature": "Interactive drag-and-drop visual workflow builder using ReactFlow" },
    { "feature": "AI-powered workflow generation from natural language descriptions" },
    { "feature": "Reliable job orchestration with BullMQ, supporting retries and fallbacks" },
    { "feature": "Scheduled workflow executions using Cron syntax" }
  ],
  "architectureDescription": "The application is structured as a monorepo utilizing pnpm workspaces. The frontend is a Next.js App Router application that provides the visual dashboard and workflow builder. The backend is a high-performance Fastify API that handles webhooks and job queuing. Asynchronous workflow execution is managed by BullMQ backed by Redis, ensuring reliable processing and fault tolerance. Data is persisted in a PostgreSQL database using Drizzle ORM for type-safe queries.",
  "challenges": "Implementing a reliable, fault-tolerant workflow execution engine that can handle complex state transitions and variable interpolation between steps. This was solved by leveraging BullMQ for robust job queueing and creating a custom orchestration layer that manages data context passing and automatic error handling mechanisms like retries and fallbacks.",
  "githubUrl": "https://github.com/VishwamDhavale/automesh",
  "tags": [
    { "tag": "Workflow Engine" },
    { "tag": "Automation" },
    { "tag": "Event-Driven" },
    { "tag": "AI" }
  ],
  "featured": true
}
```
