/**
 * ID Resolution Layer for actual-mcp
 *
 * Resolves human-readable names to UUIDs automatically, so LLMs can use
 * names instead of UUIDs for entity references.
 *
 * Convention-based resolution:
 * - accountId → getAccounts() → match by name
 * - categoryId → getCategories() → match by name
 * - payeeId → getPayees() → match by name
 * - etc.
 *
 * Special cases are defined in SPECIAL_RESOLVERS.
 */

import * as api from "@actual-app/api";

// Only define exceptions to the convention
const SPECIAL_RESOLVERS: Record<string, { getter: string; idField: string }> = {
  syncId: { getter: "getBudgets", idField: "groupId" },
};

/**
 * Check if a value looks like a UUID
 */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Derive the getter function name from a parameter name.
 * accountId → getAccounts, categoryId → getCategories, etc.
 */
function deriveGetter(paramName: string): string | null {
  const match = paramName.match(/^(.+)Id$/);
  if (!match) return null;

  const entity = match[1];
  // budget → getBudgets, account → getAccounts
  return `get${entity.charAt(0).toUpperCase()}${entity.slice(1)}s`;
}

interface Entity {
  id: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Resolve a parameter value from a name to an ID.
 *
 * If the value is already a UUID, returns it unchanged.
 * Otherwise, looks up the entity by name and returns its ID.
 *
 * @param paramName - The parameter name (e.g., "accountId", "categoryId")
 * @param value - The value to resolve (name or UUID)
 * @returns The resolved UUID
 * @throws Error if the entity is not found
 */
export async function resolveId(
  paramName: string,
  value: string
): Promise<string> {
  // Pass through UUIDs unchanged
  if (isUUID(value)) return value;

  const special = SPECIAL_RESOLVERS[paramName];
  const getter = special?.getter ?? deriveGetter(paramName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiFn = (api as any)[getter];
  if (typeof apiFn !== "function") return value;

  const entities = (await apiFn()) as Entity[];
  const idField = special?.idField ?? "id";

  // Match by id, name, or the special idField
  const match = entities.find(
    (e) => e.id === value || e.name === value || e[idField] === value
  );

  if (!match) {
    const available = entities.map((e) => e.name ?? e.id).join(", ");
    throw new Error(
      `${paramName} "${value}" not found. Available: ${available}`
    );
  }

  return match[idField] as string;
}

/**
 * Resolve all ID parameters in a params object.
 *
 * For each parameter ending in "Id" that contains a string value,
 * attempts to resolve it from a name to an ID.
 *
 * @param params - The parameters object
 * @returns A new object with resolved IDs
 */
export async function resolveParams(
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved = { ...params };

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && key.endsWith("Id")) {
      resolved[key] = await resolveId(key, value);
    }
  }

  return resolved;
}
