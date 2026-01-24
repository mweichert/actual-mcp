# Actual Budget MCP Server

An MCP (Model Context Protocol) server that provides dynamic access to the [Actual Budget](https://actualbudget.org/) API. This allows LLM agents to interact with your budgets programmatically.

## Features

- **Dynamic API Access**: Tools expose the entire Actual Budget API:
  - `list_api_methods` - Discover available methods with documentation
  - `call_api_method` - Call any API method dynamically
  - `execute_aql_query` - Run AQL (Actual Query Language) queries
  - `get_aql_schema` - Get AQL schema for tables, fields, and functions
  - `get_rules` - Get transaction rules in human-readable DSL format

- **55 API Methods**: Full access to all Actual Budget operations:
  - Budget management (load, sync, view months)
  - Transactions (CRUD, import, bulk operations)
  - Accounts, Categories, Payees
  - Rules (including programmatic rule execution)
  - Schedules
  - Bank sync

## How It Works

This MCP server acts as a **client** to your Actual Budget sync server. It uses the `@actual-app/api` package to connect to your remote Actual instance and exposes its functionality through MCP tools.

```
┌─────────────────────────┐         ┌─────────────────────────┐
│  Your Machine           │  HTTPS  │  Remote Actual Server   │
│                         │◄───────►│                         │
│  actual-mcp             │         │  actual-sync-server     │
│  (this MCP server)      │         │                         │
│                         │         │  Stores master budget   │
│  Local data cache       │         │  data & handles sync    │
│  ($XDG_DATA_HOME/       │         │                         │
│   actual-mcp/)          │         │                         │
└─────────────────────────┘         └─────────────────────────┘
```

**Important**: The `@actual-app/api` package maintains a **local cache** of your budget data. When you load a budget, it downloads the data from the server and stores it locally. Operations run against this local cache, and `sync()` pushes/pulls changes to/from the server.

## Quick Start

Run directly from GitHub (no installation needed):

```bash
ACTUAL_SERVER_URL=http://localhost:5006 npx github:mweichert/actual-mcp
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

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ACTUAL_SERVER_URL` | **Yes** | URL of your Actual Budget sync server (e.g., `http://localhost:5006` or `https://actual.example.com`) |
| `ACTUAL_PASSWORD` | No | Server password, if authentication is enabled on your server |
| `ACTUAL_DATA_DIR` | No | Directory for local budget cache (see below) |
| `ACTUAL_BUDGET_ID` | No | Budget ID to auto-load on startup. If not set, you must call `loadBudget()` manually |

### Understanding `ACTUAL_DATA_DIR`

The `@actual-app/api` package requires a local directory to cache budget data. This is **not** the remote server's data directory—it's where the MCP server stores its local copy of the budget for offline access and performance.

**Default location** (follows [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)):
- `$XDG_DATA_HOME/actual-mcp/` if `XDG_DATA_HOME` is set
- `~/.local/share/actual-mcp/` otherwise

**Override**: Set `ACTUAL_DATA_DIR` to use a custom location:
```bash
ACTUAL_DATA_DIR=/path/to/cache npx github:mweichert/actual-mcp
```

**Docker**: When running in Docker, mount a volume to persist the cache:
```bash
docker run -v /host/path:/data -e ACTUAL_DATA_DIR=/data ...
```

## Usage

### With Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "actual-budget": {
      "type": "stdio",
      "command": "npx",
      "args": ["github:mweichert/actual-mcp"],
      "env": {
        "ACTUAL_SERVER_URL": "https://actual.example.com",
        "ACTUAL_PASSWORD": "your-password"
      }
    }
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
5. **Sync changes**: `call_api_method({ method: "sync" })`

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
