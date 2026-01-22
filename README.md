# Actual Budget MCP Server

An MCP (Model Context Protocol) server that provides dynamic access to the [Actual Budget](https://actualbudget.org/) API. This allows LLM agents to interact with your budgets programmatically.

## Features

- **Dynamic API Access**: Two tools expose the entire Actual Budget API:
  - `list_api_methods` - Discover available methods with documentation
  - `call_api_method` - Call any API method dynamically

- **48 API Methods**: Full access to all Actual Budget operations:
  - Budget management (load, sync, view months)
  - Transactions (CRUD, import, bulk operations)
  - Accounts, Categories, Payees
  - Rules (including programmatic rule execution)
  - Schedules
  - Bank sync

## Quick Start

Run directly from GitHub (no installation needed):

```bash
npx github:mweichert/actual-mcp
```

## Installation

For local development:

```bash
git clone https://github.com/mweichert/actual-mcp.git
cd actual-mcp
npm install
npm run build
```

## Configuration

Set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ACTUAL_SERVER_URL` | Yes | URL of your Actual Budget server |
| `ACTUAL_PASSWORD` | No | Server password (if authentication enabled) |
| `ACTUAL_DATA_DIR` | No | Local data directory (default: `/data`) |
| `ACTUAL_BUDGET_ID` | No | Budget ID to auto-load on startup |

## Usage

### With Letta Core (Docker)

Add to your Letta Core MCP configuration:

```json
{
  "mcp_server_type": "stdio",
  "command": "node",
  "args": ["/path/to/actual-mcp/dist/index.js"],
  "env": {
    "ACTUAL_SERVER_URL": "http://actual-server:5006",
    "ACTUAL_PASSWORD": "your-password"
  }
}
```

### Direct Testing

```bash
ACTUAL_SERVER_URL=http://localhost:5006 npm start
```

## Tool Reference

### `list_api_methods`

Discover available API methods.

**Parameters:**
- `category` (optional): Filter by category (`all`, `lifecycle`, `budget`, `transactions`, `accounts`, `categories`, `payees`, `rules`, `schedules`, `query`, `bank-sync`)
- `summary_only` (optional): Return only method counts per category

**Example:**
```json
{
  "name": "list_api_methods",
  "arguments": { "category": "accounts" }
}
```

### `call_api_method`

Call any Actual Budget API method.

**Parameters:**
- `method` (required): Method name (e.g., `getAccounts`)
- `params` (optional): Method parameters as JSON object

**Example:**
```json
{
  "name": "call_api_method",
  "arguments": {
    "method": "getAccounts",
    "params": {}
  }
}
```

## Workflow Example

1. **List budgets**: `call_api_method({ method: "getBudgets" })`
2. **Load budget**: `call_api_method({ method: "loadBudget", params: { budgetId: "..." } })`
3. **Get accounts**: `call_api_method({ method: "getAccounts" })`
4. **Get transactions**: `call_api_method({ method: "getTransactions", params: { accountId: "...", startDate: "2024-01-01", endDate: "2024-12-31" } })`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT
