import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import aqlSchemaRaw from "../aql-schema.json" with { type: "json" };

type Section = "all" | "tables" | "operators" | "functions";

// Cast to allow string indexing
const aqlSchema = aqlSchemaRaw as {
  tables: Record<string, unknown>;
  operators: Record<string, unknown>;
  functions: Record<string, unknown>;
};

export function registerGetAqlSchemaTool(server: McpServer): void {
  server.tool(
    "get_aql_schema",
    `Get AQL (Actual Query Language) schema information for building queries.

Returns tables, fields, operators, and functions available for use with execute_aql_query.

Examples:
- Get all schema info: { }
- Get just tables: { "section": "tables" }
- Get specific table: { "section": "tables", "table": "transactions" }
- Get operators: { "section": "operators" }
- Get functions: { "section": "functions" }`,
    {
      section: z
        .enum(["all", "tables", "operators", "functions"])
        .optional()
        .default("all")
        .describe('Section to return: "all", "tables", "operators", or "functions"'),
      table: z
        .string()
        .optional()
        .describe('When section is "tables", filter to a specific table name'),
    },
    async (params): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const section = params.section as Section;
      const tableName = params.table;

      let result: Record<string, unknown>;

      if (section === "all") {
        // Return everything, but optionally filter tables
        if (tableName) {
          const table = aqlSchema.tables[tableName];
          if (!table) {
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  error: `Table "${tableName}" not found`,
                  availableTables: Object.keys(aqlSchema.tables),
                }, null, 2),
              }],
            };
          }
          result = {
            tables: { [tableName]: table },
            operators: aqlSchema.operators,
            functions: aqlSchema.functions,
          };
        } else {
          result = aqlSchema;
        }
      } else if (section === "tables") {
        if (tableName) {
          const table = aqlSchema.tables[tableName];
          if (!table) {
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  error: `Table "${tableName}" not found`,
                  availableTables: Object.keys(aqlSchema.tables),
                }, null, 2),
              }],
            };
          }
          result = { [tableName]: table };
        } else {
          result = aqlSchema.tables;
        }
      } else if (section === "operators") {
        result = aqlSchema.operators;
      } else if (section === "functions") {
        result = aqlSchema.functions;
      } else {
        result = aqlSchema;
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );
}
