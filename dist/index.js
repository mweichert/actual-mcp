#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as api from "@actual-app/api";
import { registerListMethodsTool } from "./tools/list-methods.js";
import { registerCallMethodTool } from "./tools/call-method.js";
const server = new McpServer({
    name: "actual-budget-mcp",
    version: "0.1.0",
});
let initialized = false;
let budgetLoaded = false;
export async function ensureInitialized() {
    if (initialized)
        return;
    const dataDir = process.env.ACTUAL_DATA_DIR || "/data";
    const serverURL = process.env.ACTUAL_SERVER_URL;
    const password = process.env.ACTUAL_PASSWORD;
    if (!serverURL) {
        throw new Error("ACTUAL_SERVER_URL environment variable is required");
    }
    await api.init({
        dataDir,
        serverURL,
        password,
    });
    initialized = true;
    // Auto-load budget if specified
    const budgetId = process.env.ACTUAL_BUDGET_ID;
    if (budgetId) {
        await api.loadBudget(budgetId);
        budgetLoaded = true;
        console.error(`Loaded budget: ${budgetId}`);
    }
}
export function isInitialized() {
    return initialized;
}
export function isBudgetLoaded() {
    return budgetLoaded;
}
export function setBudgetLoaded(loaded) {
    budgetLoaded = loaded;
}
// Register tools
registerListMethodsTool(server);
registerCallMethodTool(server);
// Graceful shutdown
async function shutdown() {
    console.error("Shutting down...");
    if (initialized) {
        await api.shutdown();
    }
    process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Actual Budget MCP server started");
    console.error(`Server URL: ${process.env.ACTUAL_SERVER_URL || "(not set)"}`);
    console.error(`Data dir: ${process.env.ACTUAL_DATA_DIR || "/data"}`);
    console.error(`Budget ID: ${process.env.ACTUAL_BUDGET_ID || "(auto-detect)"}`);
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map