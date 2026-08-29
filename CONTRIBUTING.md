# Contributing to Command Center

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/jvbalcita/command-center.git
cd command-center
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Code Style

- **TypeScript** — strict mode, no `any` unless necessary
- **ESLint** — follow existing patterns
- **Tailwind CSS** — utility classes, no custom CSS unless needed
- **Shadcn/ui** — use existing components, don't create new ones without discussion

## Testing

```bash
npm test           # Run all tests
npm run typecheck  # Type check
npm run lint       # Lint
```

All changes must pass tests and typecheck before submitting a PR.

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure typecheck passes: `npm run typecheck`
6. Submit your PR with a clear description

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when filing issues.

## Requesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## Questions?

Open a [discussion](https://github.com/jvbalcita/command-center/discussions) for general questions.
