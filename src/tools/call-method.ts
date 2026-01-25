import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "@actual-app/api";
import { getMethodByName, type MethodManifest } from "../manifest.js";
import { ensureInitialized, isBudgetLoaded, setBudgetLoaded, logDebug } from "../index.js";

// Methods that don't require a budget to be loaded first
const NO_BUDGET_REQUIRED = new Set([
  "getBudgets",
  "loadBudget",
  "downloadBudget",
  "sync",
  "getServerVersion",
]);

// Methods that load a budget as a side effect
const LOADS_BUDGET = new Set(["loadBudget", "downloadBudget"]);

// Methods that take a callback function (not supported via MCP)
const CALLBACK_METHODS = new Set(["batchBudgetUpdates", "runImport"]);

export function registerCallMethodTool(server: McpServer): void {
  server.tool(
    "call_api_method",
    "Call an Actual Budget API method by name. IMPORTANT: Before using this tool, call list_api_methods first to discover available methods, their parameters, and return types. Most methods require a budget to be loaded first - use getBudgets() to list available budgets, then downloadBudget(syncId) or loadBudget(budgetId) to load one.",
    {
      method: z
        .string()
        .describe(
          "The name of the API method to call (e.g., 'getAccounts', 'addTransactions'). Use list_api_methods to see available methods."
        ),
      params: z
        .record(z.any())
        .optional()
        .default({})
        .describe(
          "Parameters to pass to the method as a JSON object. Parameter names and types vary by method - use list_api_methods to see the expected parameters."
        ),
    },
    async ({ method, params }): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
      // Validate method exists
      const methodInfo = getMethodByName(method);
      if (!methodInfo) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: `Unknown method: ${method}`,
                  hint: "Use list_api_methods to see available methods.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Check for callback methods
      if (CALLBACK_METHODS.has(method)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: `Method '${method}' requires a callback function and cannot be called via MCP.`,
                  hint: "Use the individual methods that this function would wrap instead.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        // Ensure API is initialized
        await ensureInitialized();

        // Check if budget needs to be loaded
        if (!NO_BUDGET_REQUIRED.has(method) && !isBudgetLoaded()) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: "No budget is loaded.",
                    hint: "Call loadBudget(budgetId) first. Use getBudgets() to see available budgets.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Get the method from the API
        const fn = (api as Record<string, unknown>)[method];
        if (typeof fn !== "function") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Method '${method}' is defined in manifest but not available in API.`,
                    hint: "This may be a version mismatch. Check @actual-app/api version.",
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Build arguments from params based on method signature
        const args = buildArgs(methodInfo, params);

        // Call the method
        const result = await fn(...args);

        // Track if a budget was loaded
        if (LOADS_BUDGET.has(method)) {
          // Extract budget ID based on method:
          // - loadBudget: params.budgetId (manifest name) or params.id (API internal name)
          // - downloadBudget: we don't know the resulting budget ID, leave as undefined
          const loadedBudgetId = method === 'loadBudget'
            ? (params.budgetId ?? params.id) as string
            : undefined;
          setBudgetLoaded(true, loadedBudgetId);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  method: method,
                  result: result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        // Debug: log full error details to stderr before any processing
        // This captures the raw error object including any additional properties
        // (e.g., reason, meta) that may be lost when the error gets wrapped
        // Only logs when ACTUAL_DEBUG is set
        logDebug('API method error (raw):', JSON.stringify({
          method,
          params,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            // Spread to capture any additional properties like reason, meta, etc.
            ...(Object.fromEntries(
              Object.entries(error).filter(([key]) => !['name', 'message', 'stack'].includes(key))
            ))
          } : error
        }, null, 2));

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: errorMessage,
                  method: method,
                  params: params,
                  stack: errorStack,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Build positional arguments from named params based on method signature.
 */
function buildArgs(
  methodInfo: MethodManifest,
  params: Record<string, unknown>
): unknown[] {
  return methodInfo.params.map((p) => params[p.name]);
}
