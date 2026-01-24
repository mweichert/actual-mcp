#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as api from "@actual-app/api";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { registerListMethodsTool } from "./tools/list-methods.js";
import { registerCallMethodTool } from "./tools/call-method.js";
import { registerExecuteAqlQueryTool } from "./tools/execute-aql-query.js";
import { registerGetAqlSchemaTool } from "./tools/get-aql-schema.js";
import { registerGetRulesTool } from "./tools/get-rules.js";

function getDefaultDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdgDataHome, "actual-mcp");
}

const server = new McpServer({
  name: "actual-budget-mcp",
  version: "0.1.0",
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
    console.error(`Created data directory: ${dataDir}`);
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
    console.error(`Loaded budget: ${budgetId}`);
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

export async function ensureBudgetLoaded(budgetId?: string): Promise<void> {
  await ensureInitialized();

  // No budget_id provided and a budget is already loaded - use current
  if (!budgetId && budgetLoaded) return;

  // No budget_id provided and no budget loaded - error
  if (!budgetId && !budgetLoaded) {
    throw new Error("No budget loaded. Provide budget_id or call loadBudget first.");
  }

  // budget_id matches current - no-op
  if (budgetId === currentBudgetId) return;

  // Load the requested budget (budgetId is guaranteed to be defined at this point)
  await api.loadBudget(budgetId!);
  setBudgetLoaded(true, budgetId);
}

// Register tools
registerListMethodsTool(server);
registerCallMethodTool(server);
registerExecuteAqlQueryTool(server);
registerGetAqlSchemaTool(server);
registerGetRulesTool(server);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.error("Shutting down...");
  if (initialized) {
    await api.shutdown();
  }
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Actual Budget MCP server started");
  console.error(`Server URL: ${process.env.ACTUAL_SERVER_URL || "(not set)"}`);
  console.error(`Data dir: ${process.env.ACTUAL_DATA_DIR || getDefaultDataDir()}`);
  console.error(`Budget ID: ${process.env.ACTUAL_BUDGET_ID || "(auto-detect)"}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
