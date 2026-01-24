import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as api from "@actual-app/api";
import { ensureInitialized, ensureBudgetLoaded } from "../index.js";
import { formatRulesToDsl, type NameResolver } from "../formatters/rule-dsl.js";

export function registerGetRulesTool(server: McpServer): void {
  server.tool(
    "get_rules",
    `Get budget rules in a concise DSL format (default) or full JSON.

The DSL format is ~70% smaller than JSON and designed for LLM consumption:
- One rule per line: [id] [stage] IF conditions THEN actions
- Entity references: @payee:Name, @cat:Name, @acct:Name, @sched:Name
- Supports all operators and action types

Example DSL output:
  abc123-... RUN IF payee_name contains "AMAZON" THEN set(category=@cat:Shopping)
  def456-... PRE IF amount[inflow] > 100000 THEN set(category=@cat:Income)

To update a rule:
1. Note the rule ID from get_rules output
2. Call call_api_method with getRule(id) to get full JSON structure
3. Call call_api_method with updateRule to submit changes`,
    {
      budget_id: z
        .string()
        .optional()
        .describe("Budget ID to auto-load. If omitted, uses currently loaded budget."),
      format: z
        .enum(["dsl", "json"])
        .optional()
        .default("dsl")
        .describe("Output format: 'dsl' for concise (~70% smaller), 'json' for full data"),
      stage: z
        .enum(["pre", "run", "post", "all"])
        .optional()
        .default("all")
        .describe("Filter by rule stage: 'pre', 'run' (normal), 'post', or 'all'"),
      resolve_names: z
        .boolean()
        .optional()
        .default(true)
        .describe("Resolve UUIDs to names (e.g., @cat:Groceries instead of raw UUID)"),
    },
    async (params): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
      try {
        await ensureBudgetLoaded(params.budget_id);
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            hint: "Provide budget_id or call loadBudget first. Use getBudgets() to list budgets."
          }, null, 2) }],
          isError: true,
        };
      }

      try {
        // Fetch rules
        let rules = await api.getRules();

        // Filter by stage if specified
        if (params.stage !== "all") {
          const stageValue = params.stage === "run" ? null : params.stage;
          rules = rules.filter(r => r.stage === stageValue);
        }

        if (params.format === "json") {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ count: rules.length, rules }, null, 2) }],
          };
        }

        // Build name resolver if needed
        let resolver: NameResolver | undefined;
        if (params.resolve_names) {
          const [payees, categories, accounts, schedules] = await Promise.all([
            api.getPayees(),
            api.getCategories(),
            api.getAccounts(),
            api.getSchedules(),
          ]);

          resolver = {
            payee: new Map(payees.map(p => [p.id, p.name])),
            category: new Map(
              categories
                .filter((c): c is typeof c & { group_id: string } => 'group_id' in c && c.group_id !== undefined)
                .map(c => [c.id, c.name])
            ),
            account: new Map(accounts.map(a => [a.id, a.name])),
            schedule: new Map(schedules.map(s => [s.id, s.name || s.id])),
          };
        }

        const dsl = formatRulesToDsl(rules, resolver);

        return {
          content: [{ type: "text" as const, text: dsl }],
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
