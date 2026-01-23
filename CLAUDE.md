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
├── index.ts              # Entry point, server setup, lifecycle
├── manifest.ts           # API method definitions (48 methods)
└── tools/
    ├── list-methods.ts   # list_api_methods tool
    └── call-method.ts    # call_api_method tool
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
| rules | getRules, createRule, applyRuleToTransactions, etc. |
| schedules | getSchedules, createSchedule, etc. |
| query | aqlQuery, getIDByName, getServerVersion |
| bank-sync | runBankSync |

## Adding New API Methods

When `@actual-app/api` adds new methods:

1. Update `src/manifest.ts` with the new method definition
2. Include: name, description, params (with types), returns, category
3. Rebuild and test

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

## Key Points

- Entry point has shebang (`#!/usr/bin/env node`) for npx compatibility
- `bin` field in package.json enables `npx github:mweichert/actual-mcp`
- Uses `@modelcontextprotocol/sdk` for MCP protocol
- Logging goes to stderr (stdout reserved for MCP protocol)
