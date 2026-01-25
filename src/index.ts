#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as api from "@actual-app/api";
import { homedir } from "os";
import { join, dirname } from "path";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { registerListMethodsTool } from "./tools/list-methods.js";
import { registerCallMethodTool } from "./tools/call-method.js";
import { registerExecuteAqlQueryTool } from "./tools/execute-aql-query.js";
import { registerGetAqlSchemaTool } from "./tools/get-aql-schema.js";
import { registerGetRulesTool } from "./tools/get-rules.js";
import { smartLoadBudget } from "./smart-budget.js";

// Read version from package.json dynamically
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const VERSION = packageJson.version;

// Logging control - only log info/debug when ACTUAL_DEBUG is set
const ACTUAL_DEBUG = process.env.ACTUAL_DEBUG !== undefined;

export function logInfo(...args: unknown[]): void {
  if (ACTUAL_DEBUG) console.error(...args);
}

export function logDebug(...args: unknown[]): void {
  if (ACTUAL_DEBUG) console.error(...args);
}

function getDefaultDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdgDataHome, "actual-mcp");
}

const server = new McpServer({
  name: "actual-budget-mcp",
  version: VERSION,
});

let initialized = false;
let budgetLoaded = false;
let currentBudgetId: string | null = null;

export async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  const dataDir = process.env.ACTUAL_DATA_DIR || getDefaultDataDir();
  const serverURL = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;

  if (!serverURL) {
    throw new Error("ACTUAL_SERVER_URL environment variable is required");
  }

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    logInfo(`Created data directory: ${dataDir}`);
  }

  // Build init config
  // verbose: false is critical - the API's default verbose mode logs to stdout,
  // which corrupts MCP JSON-RPC protocol over stdio
  const initConfig = {
    dataDir,
    serverURL,
    password: password || "",
    verbose: false,
  };

  await api.init(initConfig);
  initialized = true;

  // Auto-load budget if specified
  const budgetId = process.env.ACTUAL_BUDGET_ID;
  if (budgetId) {
    await api.loadBudget(budgetId);
    budgetLoaded = true;
    currentBudgetId = budgetId;
    logInfo(`Loaded budget: ${budgetId}`);
  }
}

export function isInitialized(): boolean {
  return initialized;
}

export function isBudgetLoaded(): boolean {
  return budgetLoaded;
}

export function getCurrentBudgetId(): string | null {
  return currentBudgetId;
}

export function setBudgetLoaded(loaded: boolean, budgetId?: string): void {
  budgetLoaded = loaded;
  currentBudgetId = loaded ? (budgetId ?? null) : null;
}

export async function ensureBudgetLoaded(budgetIdOrName?: string): Promise<void> {
  await ensureInitialized();

  // No budget_id provided and a budget is already loaded - use current
  if (!budgetIdOrName && budgetLoaded) return;

  // No budget_id provided and no budget loaded - error
  if (!budgetIdOrName && !budgetLoaded) {
    throw new Error("No budget loaded. Provide budget_id or call loadBudget first.");
  }

  // budget_id matches current - no-op
  if (budgetIdOrName === currentBudgetId) return;

  // Use smart loading (supports names, auto-downloads if needed)
  const result = await smartLoadBudget(budgetIdOrName!);
  setBudgetLoaded(true, result.id);
}

// Register tools
registerListMethodsTool(server);
registerCallMethodTool(server);
registerExecuteAqlQueryTool(server);
registerGetAqlSchemaTool(server);
registerGetRulesTool(server);

// Graceful shutdown
async function shutdown(): Promise<void> {
  logInfo("Shutting down...");
  if (initialized) {
    await api.shutdown();
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Global error handlers to prevent unhandled errors from crashing the MCP server
// These catch errors that escape tool handler try/catch blocks (e.g., async callbacks
// in @actual-app/api that reject promises outside our try/catch boundaries)
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception (server continuing):", error);
  // Don't exit - keep the MCP connection alive
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  // Don't exit - keep the MCP connection alive
});

// Start server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();

  // Monitor transport for debugging connection issues
  transport.onerror = (error: Error) => {
    console.error("MCP transport error:", error);
  };
  transport.onclose = () => {
    logInfo("MCP transport closed");
  };

  await server.connect(transport);
  logInfo("Actual Budget MCP server started");
  logInfo(`Server URL: ${process.env.ACTUAL_SERVER_URL || "(not set)"}`);
  logInfo(`Data dir: ${process.env.ACTUAL_DATA_DIR || getDefaultDataDir()}`);
  logInfo(`Budget ID: ${process.env.ACTUAL_BUDGET_ID || "(auto-detect)"}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
