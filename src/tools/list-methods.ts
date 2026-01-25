import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  manifest,
  type MethodManifest,
  getMethodsByCategory,
  getCategories,
  getMethodSummary,
} from "../manifest.js";

const CategoryEnum = z.enum([
  "all",
  "lifecycle",
  "budget",
  "transactions",
  "accounts",
  "categories",
  "payees",
  "rules",
  "schedules",
  "query",
  "bank-sync",
]);

type Category = z.infer<typeof CategoryEnum>;

export function registerListMethodsTool(server: McpServer): void {
  server.tool(
    "list_api_methods",
    "Discover available Actual Budget API methods with their parameters, types, and descriptions. Call this BEFORE using call_api_method to understand which methods exist and how to use them. Methods are organized by category: lifecycle, budget, transactions, accounts, categories, payees, rules, schedules, query, and bank-sync.",
    {
      category: CategoryEnum.optional().default("all").describe(
        "Filter by category. Use 'all' to see all methods, or specify a category like 'accounts', 'transactions', etc."
      ),
      summary_only: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, returns only a count of methods per category instead of full details."
        ),
    },
    async ({ category, summary_only }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      if (summary_only) {
        const summary = getMethodSummary();
        const categories = getCategories();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  total_methods: manifest.length,
                  categories: categories,
                  methods_per_category: summary,
                  hint: "Use list_api_methods with a specific category to see method details.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Methods to hide from the LLM (handled internally by smart loading)
      const HIDDEN_METHODS = new Set(["downloadBudget"]);

      const methods: MethodManifest[] = (
        category === "all"
          ? manifest
          : getMethodsByCategory(category as Exclude<Category, "all">)
      ).filter((m) => !HIDDEN_METHODS.has(m.name));

      // Format for LLM consumption
      const formatted = methods.map((m) => ({
        name: m.name,
        description: m.description,
        category: m.category,
        parameters: m.params.map((p) => ({
          name: p.name,
          type: p.type,
          required: p.required,
          description: p.description,
        })),
        returns: m.returns,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: formatted.length,
                category: category,
                methods: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
