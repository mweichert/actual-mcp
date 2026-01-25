/**
 * Smart Budget Loading for actual-mcp
 *
 * Provides intelligent budget loading that handles:
 * - Loading by name or ID
 * - Auto-downloading remote budgets if needed
 * - Clear error messages with available options
 */

import * as api from "@actual-app/api";

interface BudgetEntity {
  id?: string;
  name: string;
  groupId?: string;
}

export interface SmartLoadResult {
  id: string;
  name: string;
}

/**
 * Smart budget loading that handles both local and remote budgets.
 *
 * Tries to load a budget by ID or name, automatically downloading
 * from the server if needed.
 *
 * @param budgetIdOrName - Budget ID, name, or sync groupId
 * @returns Object with loaded budget's id and name
 * @throws Error if budget not found
 */
export async function smartLoadBudget(
  budgetIdOrName: string
): Promise<SmartLoadResult> {
  // Get all available budgets first
  const budgets = (await api.getBudgets()) as BudgetEntity[];

  // Find matching budget by id, name, or groupId
  const match = budgets.find(
    (b) =>
      b.id === budgetIdOrName ||
      b.name === budgetIdOrName ||
      b.groupId === budgetIdOrName
  );

  if (!match) {
    const available = budgets
      .map((b) => `"${b.name}"${b.id ? ` (id: ${b.id})` : ""}`)
      .join(", ");
    throw new Error(
      `Budget "${budgetIdOrName}" not found. Available: ${available}`
    );
  }

  // If it's a remote-only budget (has groupId but no local id), download first
  if (match.groupId && !match.id) {
    await api.downloadBudget(match.groupId);
    // After download, we need to get the updated budget list to find the local id
    const updatedBudgets = (await api.getBudgets()) as BudgetEntity[];
    const downloaded = updatedBudgets.find(
      (b) => b.groupId === match.groupId && b.id
    );
    if (!downloaded?.id) {
      throw new Error(
        `Failed to download budget "${budgetIdOrName}". Try again.`
      );
    }
    await api.loadBudget(downloaded.id);
    return { id: downloaded.id, name: downloaded.name };
  }

  // Local budget - just load it
  if (!match.id) {
    throw new Error(`Budget "${budgetIdOrName}" has no local ID to load.`);
  }

  await api.loadBudget(match.id);
  return { id: match.id, name: match.name };
}
