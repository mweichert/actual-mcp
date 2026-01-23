/**
 * API Method Manifest for Actual Budget MCP Server
 *
 * This manifest describes all available API methods from the Actual Budget API,
 * providing type information, parameter documentation, and categorization for
 * use by the MCP server tools.
 */
export interface MethodParam {
    name: string;
    type: string;
    required: boolean;
    description: string;
}
export interface MethodManifest {
    name: string;
    description: string;
    params: MethodParam[];
    returns: {
        type: string;
        description: string;
    };
    category: 'lifecycle' | 'budget' | 'transactions' | 'accounts' | 'categories' | 'payees' | 'rules' | 'schedules' | 'query' | 'bank-sync';
}
export declare const manifest: MethodManifest[];
/**
 * Get all methods in a specific category
 */
export declare function getMethodsByCategory(category: MethodManifest['category']): MethodManifest[];
/**
 * Get a method by its name
 */
export declare function getMethodByName(name: string): MethodManifest | undefined;
/**
 * Get all available categories
 */
export declare function getCategories(): MethodManifest['category'][];
/**
 * Get a summary of methods per category
 */
export declare function getMethodSummary(): Record<MethodManifest['category'], number>;
//# sourceMappingURL=manifest.d.ts.map