import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "@actual-app/api";
import { ensureInitialized, isBudgetLoaded } from "../index.js";

const ObjectExpressionSchema = z.record(z.any());

export function registerExecuteAqlQueryTool(server: McpServer): void {
  server.tool(
    "execute_aql_query",
    `Execute an AQL (Actual Query Language) query against the budget database.

Use get_aql_schema to discover available tables, fields, operators, and functions.

Example - Get 10 uncategorized transactions:
{
  "table": "transactions",
  "filterExpressions": [{ "category": null }, { "is_parent": false }],
  "selectExpressions": ["id", "date", "amount", { "payee_name": "payee.name" }, { "account_name": "account.name" }],
  "orderExpressions": [{ "date": "desc" }],
  "limit": 10
}`,
    {
      table: z.string().describe('Table to query: transactions, accounts, categories, payees, schedules, category_groups'),
      tableOptions: z.record(z.unknown()).optional().describe('Table options, e.g., { splits: "grouped" }'),
      filterExpressions: z.array(ObjectExpressionSchema).optional().describe('Filter conditions as array of objects'),
      selectExpressions: z.array(z.union([ObjectExpressionSchema, z.string()])).optional().describe('Fields to select'),
      groupExpressions: z.array(z.union([ObjectExpressionSchema, z.string()])).optional().describe('Fields to group by'),
      orderExpressions: z.array(z.union([ObjectExpressionSchema, z.string()])).optional().describe('Sort order'),
      limit: z.number().nullable().optional().describe('Max rows to return'),
      offset: z.number().nullable().optional().describe('Rows to skip'),
      rawMode: z.boolean().optional().describe('Return raw DB values'),
      withDead: z.boolean().optional().describe('Include soft-deleted records'),
    },
    async (params): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
      await ensureInitialized();

      if (!isBudgetLoaded()) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No budget loaded. Call loadBudget first." }, null, 2) }],
          isError: true,
        };
      }

      try {
        // Reconstruct Query from params using the builder pattern
        let query = api.q(params.table);

        if (params.tableOptions) {
          query = query.options(params.tableOptions);
        }
        if (params.filterExpressions) {
          for (const expr of params.filterExpressions) {
            query = query.filter(expr);
          }
        }
        if (params.selectExpressions) {
          query = query.select(params.selectExpressions);
        }
        if (params.groupExpressions) {
          query = query.groupBy(params.groupExpressions);
        }
        if (params.orderExpressions) {
          query = query.orderBy(params.orderExpressions);
        }
        if (params.limit != null) {
          query = query.limit(params.limit);
        }
        if (params.offset != null) {
          query = query.offset(params.offset);
        }
        if (params.rawMode) {
          query = query.raw();
        }
        if (params.withDead) {
          query = query.withDead();
        }

        const result = await api.aqlQuery(query) as { data: unknown };

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true, data: result.data }, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: errorMessage, stack: errorStack }, null, 2) }],
          isError: true,
        };
      }
    }
  );
}
