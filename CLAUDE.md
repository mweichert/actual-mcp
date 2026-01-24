# Actual Budget MCP Server

MCP server exposing the Actual Budget API for LLM agents.

**Repository**: [mweichert/actual-mcp](https://github.com/mweichert/actual-mcp)

## Quick Reference

```bash
# Run directly from GitHub
npx github:mweichert/actual-mcp

# Local development
npm install
npm run build
npm run dev          # Watch mode

# Run with config
ACTUAL_SERVER_URL=http://localhost:5006 npm start
```

## Architecture

```
src/
├── index.ts                      # Entry point, server setup, lifecycle
├── manifest.ts                   # AUTO-GENERATED - API method definitions (51 methods)
├── api-method-descriptions.json  # Human-curated method descriptions
└── tools/
    ├── list-methods.ts           # list_api_methods tool
    └── call-method.ts            # call_api_method tool

scripts/
├── extract-api-methods.ts            # Extracts method signatures from @actual-app/api types
├── generate-api-method-descriptions.ts  # Adds/removes descriptions (uses Claude CLI)
└── generate-manifest.ts              # Generates manifest.ts from types + descriptions
```

### Tools

| Tool | Purpose |
|------|---------|
| `list_api_methods` | Returns method manifest, filterable by category |
| `call_api_method` | Dynamically invokes any API method by name |

### Manifest Categories

| Category | Methods |
|----------|---------|
| lifecycle | loadBudget, downloadBudget, getBudgets, sync |
| budget | getBudgetMonths, setBudgetAmount, etc. |
| transactions | getTransactions, addTransactions, etc. |
| accounts | getAccounts, createAccount, etc. |
| categories | getCategories, createCategory, etc. |
| payees | getPayees, createPayee, etc. |
| rules | getRules, getPayeeRules, createRule, updateRule, deleteRule |
| schedules | getSchedules, createSchedule, etc. |
| query | aqlQuery, getIDByName, getServerVersion |
| bank-sync | runBankSync |

## Updating the Manifest

The manifest is auto-generated from `@actual-app/api` TypeScript types. When the API package is updated:

```bash
npm run generate-manifest
```

This single command:
1. Extracts method signatures from `@actual-app/api` types
2. Adds descriptions for new methods / removes stale ones (uses Claude CLI)
3. Regenerates `manifest.ts`

### Files

| File | Tracked | Purpose |
|------|---------|---------|
| `src/api-method-descriptions.json` | Yes | Human-curated descriptions |
| `src/api-methods.json` | No | Extracted signatures (regenerated) |
| `src/manifest.ts` | Yes | Auto-generated manifest |

### Pre-commit Hook

A Husky pre-commit hook runs `npm run check-manifest` to ensure the manifest stays in sync with the API types. If it fails, run `npm run generate-manifest`.

## Releasing

```bash
git tag v0.1.0
git push origin v0.1.0
# GitHub Action creates draft release
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ACTUAL_SERVER_URL` | Yes | Actual Budget server URL |
| `ACTUAL_PASSWORD` | No | Server password |
| `ACTUAL_DATA_DIR` | No | Local budget cache dir (default: `$XDG_DATA_HOME/actual-mcp` or `~/.local/share/actual-mcp`) |
| `ACTUAL_BUDGET_ID` | No | Auto-load this budget on start |

## Lazy Budget Loading

Tools that require a budget (`execute_aql_query`, `get_rules`) support an optional `budget_id` parameter:

| Scenario | Behavior |
|----------|----------|
| No `budget_id`, budget loaded | Uses current budget |
| No `budget_id`, no budget | Returns error with hint |
| `budget_id` matches current | Uses current (no-op) |
| `budget_id` differs | Loads new budget, updates state |

This makes the MCP server resilient to process restarts - each tool call can be self-contained.

### State Tracking

- `budgetLoaded: boolean` - Whether any budget is loaded
- `currentBudgetId: string | null` - ID of the currently loaded budget

## Key Points

- Entry point has shebang (`#!/usr/bin/env node`) for npx compatibility
- `bin` field in package.json enables `npx github:mweichert/actual-mcp`
- Uses `@modelcontextprotocol/sdk` for MCP protocol
- Logging goes to stderr (stdout reserved for MCP protocol)
