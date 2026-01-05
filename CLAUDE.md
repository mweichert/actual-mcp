# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Actual Budget MCP Server - exposes Actual Budget financial data to LLMs through the Model Context Protocol (MCP). Supports both stdio and SSE/HTTP transports.

## Common Commands

```bash
# Development
npm run build         # Compile TypeScript
npm run watch         # Auto-rebuild on changes
npm run start         # Run with tsx (dev mode)

# Testing
npm run test                    # Run all tests once
npm run test:unit:watch         # Watch mode
npm run test -- --testNamePattern="pattern"  # Run specific test by name
npm run test -- src/path/to/file.test.ts     # Run specific test file
npm run test:coverage           # Generate coverage report
npm run test:ui                 # Interactive Vitest UI

# Code Quality
npm run quality       # Run lint + format:check + type-check
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format with Prettier

# Debugging/Testing Connection
node build/index.js --test-resources         # Verify Actual Budget connectivity
npm run inspector                             # Launch MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js  # Alternative inspector
```

## Architecture

### Entry Points & Transport

- `src/index.ts` - Main server with CLI arg parsing (`--sse`, `--enable-write`, `--enable-bearer`, `--port`)
- Supports stdio (default), SSE (`/sse`), and Streamable HTTP (`/`, `/mcp`) transports
- Write operations disabled by default; enable with `--enable-write`

### API Layer

- `src/actual-api.ts` - Singleton wrapper around `@actual-app/api` with lazy initialization
- All API functions ensure initialization before execution via `initActualApi()`
- Connection uses env vars: `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_DATA_DIR`, `ACTUAL_BUDGET_SYNC_ID`

### Tool System

Tools are registered in `src/tools/index.ts` which separates read vs write tools.

Each tool follows a modular pattern in `src/tools/<tool-name>/`:
- `index.ts` - Schema (Zod → JSON Schema) and handler orchestration
- `input-parser.ts` - Argument validation
- `data-fetcher.ts` - Data retrieval
- `report-generator.ts` - Markdown output formatting
- `types.ts` - Tool-specific types (if needed)

Handler pattern:
```typescript
export async function handler(args: ArgsType): Promise<CallToolResult> {
  const input = new InputParser().parse(args);
  const data = await new DataFetcher().fetchAll(...);
  const result = process(data);
  return success(new ReportGenerator().generate(result));
}
```

### Core Utilities (`src/core/`)

Shared functionality re-exported from `src/core/index.ts`:
- `data/` - Fetch functions for accounts, transactions, categories, payees, rules
- `input/` - Argument parsing and validation utilities
- `aggregation/` - Group-by, sum-by, sort-by helpers
- `mapping/` - Entity mappers and classifiers

### MCP Components

- `src/resources.ts` - MCP resources (account listings, details, transactions)
- `src/prompts.ts` - MCP prompts (financial-insights, budget-review)
- `src/types.ts` - Zod schemas for all tool arguments

## Testing Conventions

- Co-locate tests: `foo.ts` → `foo.test.ts` in same directory
- Use `vi.mock()` for external dependencies
- Cover: happy path, edge case, error handling
- Mock `@actual-app/api` and `../actual-api.js` in tool tests

## Environment Variables

```bash
ACTUAL_DATA_DIR              # Local data directory (default: ~/.actual)
ACTUAL_SERVER_URL            # Remote Actual server URL
ACTUAL_PASSWORD              # Server authentication password
ACTUAL_BUDGET_SYNC_ID        # Specific budget ID to use
ACTUAL_BUDGET_ENCRYPTION_PASSWORD  # Budget encryption password (if different from server password)
BEARER_TOKEN                 # Required when --enable-bearer is set
```
