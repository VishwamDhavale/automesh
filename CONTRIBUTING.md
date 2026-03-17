# Contributing to Automesh

Thank you for your interest in contributing to Automesh! We welcome community contributions, whether it's fixing bugs, improving documentation, or building new action plugins and integrations.

## 🛠️ Development Setup

Automesh is a monorepo built using `pnpm` workspaces.

1. Fork the repository and clone it locally.
2. Install dependencies using `pnpm install`.
3. Set up the local databases via `docker-compose up -d`.
4. Run migrations using `pnpm db:generate` and `pnpm db:migrate`.
5. Start development servers with `pnpm dev`.

## 🧩 Adding New Integrations or Plugins

If you are adding a new core plugin or a third-party integration, please refer to our [Plugin Development Guide](./docs/plugin-development.md). 

Ensure your new plugins include relevant tests in the `packages/` directory, and that you export them correctly so the API engine can locate them.

## 🐛 Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- A clear descriptive title.
- Steps to reproduce the issue.
- Expected behavior vs actual behavior.
- Context (OS, Node version, logs).

## 💡 Submitting Pull Requests

1. Create a new branch for your feature/fix: `git checkout -b feature/my-new-feature`
2. Make your changes.
3. Commit with descriptive messages. We follow Conventional Commits (e.g., `feat: add slack plugin`, `fix: webhook retry logic`).
4. Ensure tests and linting pass (`pnpm test` and `pnpm lint`).
5. Open a Pull Request and describe the changes thoroughly.

## 📝 License

By contributing to Automesh, you agree that your contributions will be licensed under its Apache License 2.0.
