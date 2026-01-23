/**
 * API Method Manifest for Actual Budget MCP Server
 *
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * Generated from @actual-app/api types + api-method-descriptions.json
 *
 * To regenerate: npm run generate-manifest
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
  category:
    | 'lifecycle'
    | 'budget'
    | 'transactions'
    | 'accounts'
    | 'categories'
    | 'payees'
    | 'rules'
    | 'schedules'
    | 'query'
    | 'bank-sync';
}

export const manifest: MethodManifest[] = [
  {
    name: 'runImport',
    description:
      'Execute a bulk import operation within an import context. This wraps import operations with proper start/finish handling and rollback on error. Note: This method takes a callback function and is not callable via MCP.',
    params: [
    {
      name: 'budgetName',
      type: 'string',
      required: true,
      description: 'The name of the budget being imported. Used for identification during the import process.',
    },
    {
      name: 'func',
      type: '() => Promise<void>',
      required: true,
      description: 'An async function containing the import operations. If an error occurs, the import is aborted and changes are rolled back.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the import is complete. Throws if the import fails.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'loadBudget',
    description:
      'Load an existing budget file by its ID. This must be called before performing any operations on a budget. The budget ID can be obtained from getBudgets().',
    params: [
    {
      name: 'budgetId',
      type: 'string',
      required: true,
      description: 'The unique identifier of the budget to load. This is the id field from the budget object returned by getBudgets().',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the budget is successfully loaded. Throws an error if the budget cannot be found or loaded.',
    },
    category: 'lifecycle' as const,
  },

  {
    name: 'downloadBudget',
    description:
      'Download a budget from the sync server using its sync ID. This is useful for accessing budgets that exist on the server but are not yet available locally.',
    params: [
    {
      name: 'syncId',
      type: 'string',
      required: true,
      description: 'The sync ID of the budget to download. IMPORTANT: This is the groupId from the getBudgets() response, NOT the cloudFileId.',
    },
    {
      name: 'options',
      type: '{ password?: string; }',
      required: false,
      description: 'Optional configuration object. If the budget is encrypted, provide an object with a password property to decrypt it.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the budget is successfully downloaded. Throws an error if download fails or password is incorrect.',
    },
    category: 'lifecycle' as const,
  },

  {
    name: 'getBudgets',
    description:
      'Retrieve a list of all available budgets. This includes both local budgets and remote budgets from the sync server. Use this to discover budget IDs for loading.',
    params: [

    ],
    returns: {
      type: 'Promise<APIFileEntity[]>',
      description:
        'An array of budget file objects containing id, name, groupId (used as syncId for downloadBudget), and other metadata about each available budget.',
    },
    category: 'lifecycle' as const,
  },

  {
    name: 'sync',
    description:
      'Synchronize the currently loaded budget with the sync server. This uploads local changes and downloads any changes made on other devices. Should be called periodically and before closing the budget.',
    params: [

    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when synchronization is complete. May throw if there are sync conflicts or network issues.',
    },
    category: 'lifecycle' as const,
  },

  {
    name: 'runBankSync',
    description:
      'Trigger a bank sync operation to download new transactions from connected bank accounts. This uses configured bank connections (GoCardless, SimpleFin, etc.).',
    params: [
    {
      name: 'args',
      type: '{ accountId: APIAccountEntity["id"]; }',
      required: false,
      description: 'Optional configuration object. If accountId is provided, only syncs that specific account. Otherwise syncs all connected accounts.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the bank sync is complete. New transactions will be imported automatically.',
    },
    category: 'bank-sync' as const,
  },

  {
    name: 'batchBudgetUpdates',
    description:
      'Execute multiple budget updates within a single batch operation for better performance. All budget operations inside the callback function are grouped together. Note: This method takes a callback function and is not callable via MCP.',
    params: [
    {
      name: 'func',
      type: '() => Promise<void>',
      required: true,
      description: 'An async function containing the budget operations to batch together. All setBudgetAmount and setBudgetCarryover calls inside this function are batched.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when all batched operations are complete.',
    },
    category: 'budget' as const,
  },

  {
    name: 'aqlQuery',
    description:
      'Execute an AQL (Actual Query Language) query against the budget database. This is the primary way to perform complex queries on budget data. Build queries using the q() query builder.',
    params: [
    {
      name: 'query',
      type: 'Query',
      required: true,
      description: 'An AQL query object built using the q() query builder. Example: q(\'transactions\').filter({ amount: { $lt: 0 } }).select(\'*\')',
    }
    ],
    returns: {
      type: 'Promise<unknown>',
      description:
        'An object containing a data array with the query results. The structure depends on the query selections.',
    },
    category: 'query' as const,
  },

  {
    name: 'getBudgetMonths',
    description:
      'Get a list of all months that have budget data. Returns months in YYYY-MM format. Use this to discover which months have been budgeted.',
    params: [

    ],
    returns: {
      type: 'Promise<string[]>',
      description:
        'An array of month strings in YYYY-MM format (e.g., [\'2024-01\', \'2024-02\', \'2024-03\']).',
    },
    category: 'budget' as const,
  },

  {
    name: 'getBudgetMonth',
    description:
      'Get detailed budget information for a specific month, including all category budgets, spending, and balances. Returns comprehensive budget data with category groups.',
    params: [
    {
      name: 'month',
      type: 'string',
      required: true,
      description: 'The month to retrieve in YYYY-MM format (e.g., \'2024-01\').',
    }
    ],
    returns: {
      type: 'Promise<{\n    month: string;\n    incomeAvailable: number;\n    lastMonthOverspent: number;\n    forNextMonth: number;\n    totalBudgeted: number;\n    toBudget: number;\n    fromLastMonth: number;\n    totalIncome: number;\n    totalSpent: number;\n    totalBalance: number;\n    categoryGroups: Record<string, unknown>[];\n}>',
      description:
        'A budget month object containing month, incomeAvailable, toBudget, totalBudgeted, totalSpent, totalBalance, and categoryGroups with their categories including budgeted amounts, spent amounts, and balances.',
    },
    category: 'budget' as const,
  },

  {
    name: 'setBudgetAmount',
    description:
      'Set the budgeted amount for a specific category in a specific month. The amount is in integer format representing cents (e.g., 10000 = $100.00).',
    params: [
    {
      name: 'month',
      type: 'string',
      required: true,
      description: 'The month to set the budget for in YYYY-MM format.',
    },
    {
      name: 'categoryId',
      type: 'string',
      required: true,
      description: 'The UUID of the category to budget for.',
    },
    {
      name: 'value',
      type: 'number',
      required: true,
      description: 'The amount to budget as an integer in cents (e.g., 10000 for $100.00).',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the budget amount is successfully set.',
    },
    category: 'budget' as const,
  },

  {
    name: 'setBudgetCarryover',
    description:
      'Enable or disable budget carryover for a specific category in a specific month. When enabled, any remaining budget at the end of the month rolls over to the next month.',
    params: [
    {
      name: 'month',
      type: 'string',
      required: true,
      description: 'The month to set carryover for in YYYY-MM format.',
    },
    {
      name: 'categoryId',
      type: 'string',
      required: true,
      description: 'The UUID of the category to set carryover for.',
    },
    {
      name: 'flag',
      type: 'boolean',
      required: true,
      description: 'True to enable carryover, false to disable it.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the carryover setting is updated.',
    },
    category: 'budget' as const,
  },

  {
    name: 'addTransactions',
    description:
      'Add new transactions to an account. Unlike importTransactions, this method does not perform duplicate detection based on imported_id. Amounts are integers in cents.',
    params: [
    {
      name: 'accountId',
      type: 'string',
      required: true,
      description: 'The UUID of the account to add transactions to.',
    },
    {
      name: 'transactions',
      type: 'Omit<ImportTransactionEntity, "account">[]',
      required: true,
      description: 'An array of transaction objects to add. Each should have date (YYYY-MM-DD), amount (integer cents), and optionally payee, payee_name, category, notes, etc.',
    },
    {
      name: 'options',
      type: '{ learnCategories?: boolean; runTransfers?: boolean; }',
      required: false,
      description: 'Optional settings. learnCategories: if true, learns category assignments for future auto-categorization. runTransfers: if true, automatically links matching transfers between accounts.',
    }
    ],
    returns: {
      type: 'Promise<"ok">',
      description:
        'Returns \'ok\' when transactions are successfully added.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'importTransactions',
    description:
      'Import transactions into an account with duplicate detection. Uses imported_id to prevent importing the same transaction twice. Best for bank imports.',
    params: [
    {
      name: 'accountId',
      type: 'string',
      required: true,
      description: 'The UUID of the account to import transactions into.',
    },
    {
      name: 'transactions',
      type: 'ImportTransactionEntity[]',
      required: true,
      description: 'An array of transaction objects to import. Include imported_id for duplicate detection. Amount is in integer cents.',
    },
    {
      name: 'opts',
      type: 'ImportTransactionsOpts',
      required: false,
      description: 'Options object. May include defaultCleared (whether new transactions are marked cleared) and dryRun (if true, returns what would be imported without actually importing).',
    }
    ],
    returns: {
      type: 'Promise<any>',
      description:
        'An object with arrays of transaction IDs that were added and updated during the import.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'getTransactions',
    description:
      'Retrieve transactions for a specific account within a date range. Returns all transactions including splits, transfers, and scheduled transactions.',
    params: [
    {
      name: 'accountId',
      type: 'string',
      required: true,
      description: 'The UUID of the account to get transactions from.',
    },
    {
      name: 'startDate',
      type: 'string',
      required: true,
      description: 'The start date of the range in YYYY-MM-DD format (inclusive).',
    },
    {
      name: 'endDate',
      type: 'string',
      required: true,
      description: 'The end date of the range in YYYY-MM-DD format (inclusive).',
    }
    ],
    returns: {
      type: 'Promise<TransactionEntity[]>',
      description:
        'An array of transaction objects with all their properties including id, date, amount (integer cents), payee, category, notes, etc.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'updateTransaction',
    description:
      'Update an existing transaction with new field values. Only the specified fields are updated; other fields remain unchanged.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the transaction to update.',
    },
    {
      name: 'fields',
      type: 'Partial<TransactionEntity>',
      required: true,
      description: 'An object containing the fields to update. Common fields: date, amount, payee, category, notes, cleared, reconciled.',
    }
    ],
    returns: {
      type: 'Promise<TransactionEntity[] | ({ id: any; transfer_id: any; } | { id: any; category: any; })[]>',
      description:
        'Returns the updated transaction(s). May return multiple transactions if the update affected linked transfers or splits.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'deleteTransaction',
    description:
      'Delete a transaction by its ID. This is a soft delete that marks the transaction as a tombstone for sync purposes.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the transaction to delete.',
    }
    ],
    returns: {
      type: 'Promise<TransactionEntity[]>',
      description:
        'Returns the deleted transaction(s) as an array.',
    },
    category: 'transactions' as const,
  },

  {
    name: 'getAccounts',
    description:
      'Get all accounts in the budget, including checking, savings, credit cards, and off-budget accounts.',
    params: [

    ],
    returns: {
      type: 'Promise<APIAccountEntity[]>',
      description:
        'An array of account objects with id, name, offbudget (boolean), and closed (boolean) properties.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'createAccount',
    description:
      'Create a new account in the budget. The account can be on-budget or off-budget.',
    params: [
    {
      name: 'account',
      type: 'Omit<APIAccountEntity, "id">',
      required: true,
      description: 'The account object with name (required), offbudget (optional, default false), and closed (optional, default false).',
    },
    {
      name: 'initialBalance',
      type: 'number',
      required: false,
      description: 'Optional initial balance as an integer in cents (e.g., 100000 for $1000.00). Creates an initial balance transaction if provided.',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the newly created account.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'updateAccount',
    description:
      'Update an existing account. Can change the name, off-budget status, or closed status.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the account to update.',
    },
    {
      name: 'fields',
      type: 'Partial<APIAccountEntity>',
      required: true,
      description: 'The fields to update: name, offbudget, and/or closed.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the account is successfully updated.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'closeAccount',
    description:
      'Close an account. Any remaining balance can be transferred to another account or assigned to a category.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the account to close.',
    },
    {
      name: 'transferAccountId',
      type: 'string',
      required: false,
      description: 'Optional UUID of another account to transfer the remaining balance to.',
    },
    {
      name: 'transferCategoryId',
      type: 'string',
      required: false,
      description: 'Optional UUID of a category to assign the remaining balance to (if not transferring to another account).',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the account is successfully closed.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'reopenAccount',
    description:
      'Reopen a previously closed account, making it active again for transactions.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the closed account to reopen.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the account is successfully reopened.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'deleteAccount',
    description:
      'Permanently delete an account. This should only be used for accounts with no transactions. For accounts with history, use closeAccount instead.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the account to delete.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the account is successfully deleted.',
    },
    category: 'accounts' as const,
  },

  {
    name: 'getAccountBalance',
    description:
      'Get the current balance of an account, optionally as of a specific date.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the account to get the balance for.',
    },
    {
      name: 'cutoff',
      type: 'Date',
      required: false,
      description: 'Optional cutoff date. If provided, returns the balance as of that date. Otherwise returns the current balance.',
    }
    ],
    returns: {
      type: 'Promise<number>',
      description:
        'The account balance as an integer in cents (e.g., 150000 for $1500.00).',
    },
    category: 'accounts' as const,
  },

  {
    name: 'getCategoryGroups',
    description:
      'Get all category groups with their nested categories. This provides a hierarchical view of the budget structure.',
    params: [

    ],
    returns: {
      type: 'Promise<APICategoryGroupEntity[]>',
      description:
        'An array of category group objects, each containing id, name, is_income, hidden, and a categories array with nested category objects.',
    },
    category: 'categories' as const,
  },

  {
    name: 'createCategoryGroup',
    description:
      'Create a new category group to organize related categories.',
    params: [
    {
      name: 'group',
      type: 'Omit<APICategoryGroupEntity, "id">',
      required: true,
      description: 'The category group object with name (required), is_income (optional), and hidden (optional).',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the newly created category group.',
    },
    category: 'categories' as const,
  },

  {
    name: 'updateCategoryGroup',
    description:
      'Update an existing category group. Can change the name, income status, or hidden status.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the category group to update.',
    },
    {
      name: 'fields',
      type: 'Partial<APICategoryGroupEntity>',
      required: true,
      description: 'The fields to update: name, is_income, and/or hidden.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the category group is successfully updated.',
    },
    category: 'categories' as const,
  },

  {
    name: 'deleteCategoryGroup',
    description:
      'Delete a category group. Categories in this group can be optionally transferred to another category.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the category group to delete.',
    },
    {
      name: 'transferCategoryId',
      type: 'string',
      required: false,
      description: 'Optional UUID of a category to transfer all transactions from categories in this group to.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the category group is successfully deleted.',
    },
    category: 'categories' as const,
  },

  {
    name: 'getCategories',
    description:
      'Get all categories in the budget as a flat list, including both regular categories and category groups. For grouped categories only, use getCategoryGroups instead.',
    params: [

    ],
    returns: {
      type: 'Promise<(APICategoryEntity | APICategoryGroupEntity)[]>',
      description:
        'An array of category and category group objects with id, name, group_id (for categories), is_income, and hidden properties.',
    },
    category: 'categories' as const,
  },

  {
    name: 'createCategory',
    description:
      'Create a new category within a category group.',
    params: [
    {
      name: 'category',
      type: 'Omit<APICategoryEntity, "id">',
      required: true,
      description: 'The category object with name (required), group_id (required), is_income (optional), and hidden (optional).',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the newly created category.',
    },
    category: 'categories' as const,
  },

  {
    name: 'updateCategory',
    description:
      'Update an existing category. Can change the name, group, income status, or hidden status.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the category to update.',
    },
    {
      name: 'fields',
      type: 'Partial<APICategoryEntity>',
      required: true,
      description: 'The fields to update: name, group_id, is_income, and/or hidden.',
    }
    ],
    returns: {
      type: 'Promise<object | { error: { type: "category-exists"; }; }>',
      description:
        'An empty object on success, or an error object if a category with that name already exists.',
    },
    category: 'categories' as const,
  },

  {
    name: 'deleteCategory',
    description:
      'Delete a category. Transactions in this category can be optionally transferred to another category.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the category to delete.',
    },
    {
      name: 'transferCategoryId',
      type: 'string',
      required: false,
      description: 'Optional UUID of another category to transfer existing transactions to.',
    }
    ],
    returns: {
      type: 'Promise<object | { error: "no-categories"; } | { error: "category-type"; }>',
      description:
        'An empty object on success, or an error object if there are issues (e.g., no categories left or category type mismatch).',
    },
    category: 'categories' as const,
  },

  {
    name: 'getCommonPayees',
    description:
      'Get the most commonly used payees, useful for autocomplete suggestions and quick selection.',
    params: [

    ],
    returns: {
      type: 'Promise<APIPayeeEntity[]>',
      description:
        'An array of the most frequently used payee objects, sorted by usage frequency.',
    },
    category: 'payees' as const,
  },

  {
    name: 'getPayees',
    description:
      'Get all payees in the budget, including transfer payees and manually created payees.',
    params: [

    ],
    returns: {
      type: 'Promise<APIPayeeEntity[]>',
      description:
        'An array of payee objects with id, name, and transfer_acct (if this is a transfer payee).',
    },
    category: 'payees' as const,
  },

  {
    name: 'createPayee',
    description:
      'Create a new payee. Payees are used to track who transactions are to/from.',
    params: [
    {
      name: 'payee',
      type: 'Omit<APIPayeeEntity, "id">',
      required: true,
      description: 'The payee object with name (required). Transfer_acct should not be set manually as it is managed by the system for transfer payees.',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the newly created payee.',
    },
    category: 'payees' as const,
  },

  {
    name: 'updatePayee',
    description:
      'Update an existing payee. Typically used to rename a payee.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the payee to update.',
    },
    {
      name: 'fields',
      type: 'Partial<APIPayeeEntity>',
      required: true,
      description: 'The fields to update, typically just name.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the payee is successfully updated.',
    },
    category: 'payees' as const,
  },

  {
    name: 'deletePayee',
    description:
      'Delete a payee. Transactions using this payee will have their payee cleared.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the payee to delete.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the payee is successfully deleted.',
    },
    category: 'payees' as const,
  },

  {
    name: 'mergePayees',
    description:
      'Merge multiple payees into a single target payee. All transactions from the merged payees will be reassigned to the target payee.',
    params: [
    {
      name: 'targetId',
      type: 'string',
      required: true,
      description: 'The UUID of the payee to merge into. This payee will be kept.',
    },
    {
      name: 'mergeIds',
      type: 'string[]',
      required: true,
      description: 'An array of payee UUIDs to merge into the target. These payees will be deleted after merge.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when all payees are successfully merged and duplicates deleted.',
    },
    category: 'payees' as const,
  },

  {
    name: 'getRules',
    description:
      'Get all transaction rules in the budget. Rules automatically categorize, modify, or filter transactions based on conditions.',
    params: [

    ],
    returns: {
      type: 'Promise<RuleEntity[]>',
      description:
        'An array of rule objects with id, stage, conditionsOp, conditions array, and actions array.',
    },
    category: 'rules' as const,
  },

  {
    name: 'getPayeeRules',
    description:
      'Get all rules associated with a specific payee. These rules are triggered when transactions match this payee.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the payee to get rules for.',
    }
    ],
    returns: {
      type: 'Promise<RuleEntity[]>',
      description:
        'An array of rule objects that have conditions matching the specified payee.',
    },
    category: 'rules' as const,
  },

  {
    name: 'createRule',
    description:
      'Create a new transaction rule. Rules can automatically categorize transactions, set fields, or perform other actions based on conditions.',
    params: [
    {
      name: 'rule',
      type: 'Omit<RuleEntity, "id">',
      required: true,
      description: 'The rule object with stage (\'pre\', null, or \'post\'), conditionsOp (\'and\' or \'or\'), conditions array, and actions array.',
    }
    ],
    returns: {
      type: 'Promise<{\n    id: string;\n} & import("./loot-core/src/types/models").NewRuleEntity>',
      description:
        'The newly created rule object including its generated UUID.',
    },
    category: 'rules' as const,
  },

  {
    name: 'updateRule',
    description:
      'Update an existing rule. Can modify conditions, actions, stage, or conditionsOp. The entire rule is replaced.',
    params: [
    {
      name: 'rule',
      type: 'RuleEntity',
      required: true,
      description: 'The complete rule object with id and all fields. The entire rule is replaced.',
    }
    ],
    returns: {
      type: 'Promise<{\n    id: string;\n} & import("./loot-core/src/types/models").NewRuleEntity>',
      description:
        'The updated rule object.',
    },
    category: 'rules' as const,
  },

  {
    name: 'deleteRule',
    description:
      'Delete a transaction rule.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the rule to delete.',
    }
    ],
    returns: {
      type: 'Promise<boolean>',
      description:
        'Returns true if the rule was successfully deleted.',
    },
    category: 'rules' as const,
  },

  {
    name: 'holdBudgetForNextMonth',
    description:
      'Hold a specified amount from the current month to be available in the next month. This is useful for setting aside money that will be needed soon.',
    params: [
    {
      name: 'month',
      type: 'string',
      required: true,
      description: 'The current month to hold funds from, in YYYY-MM format.',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      description: 'The amount to hold as an integer in cents (e.g., 50000 for $500.00).',
    }
    ],
    returns: {
      type: 'Promise<boolean>',
      description:
        'Returns true if the hold was successfully created.',
    },
    category: 'budget' as const,
  },

  {
    name: 'resetBudgetHold',
    description:
      'Release any budget hold for the specified month, returning the held funds to the available balance. This undoes a previous holdBudgetForNextMonth call.',
    params: [
    {
      name: 'month',
      type: 'string',
      required: true,
      description: 'The month to reset the hold for, in YYYY-MM format.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the hold is successfully reset.',
    },
    category: 'budget' as const,
  },

  {
    name: 'createSchedule',
    description:
      'Create a new scheduled transaction. Schedules automatically create transactions at specified intervals.',
    params: [
    {
      name: 'schedule',
      type: 'Omit<APIScheduleEntity, "id">',
      required: true,
      description: 'The schedule object. Required fields: date (recurrence pattern), amountOp (\'is\', \'isapprox\', or \'isbetween\'). Optional: name, payee, account, amount, posts_transaction.',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the newly created schedule.',
    },
    category: 'schedules' as const,
  },

  {
    name: 'updateSchedule',
    description:
      'Update an existing scheduled transaction.',
    params: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'The UUID of the schedule to update.',
    },
    {
      name: 'fields',
      type: 'Partial<APIScheduleEntity>',
      required: true,
      description: 'The fields to update. Can include name, date, amount, amountOp, payee, account, posts_transaction, completed.',
    },
    {
      name: 'resetNextDate',
      type: 'boolean',
      required: false,
      description: 'If true, recalculates the next_date based on the new schedule settings. Default is false.',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the updated schedule.',
    },
    category: 'schedules' as const,
  },

  {
    name: 'deleteSchedule',
    description:
      'Delete a scheduled transaction. Future scheduled instances will no longer be created.',
    params: [
    {
      name: 'scheduleId',
      type: 'string',
      required: true,
      description: 'The UUID of the schedule to delete.',
    }
    ],
    returns: {
      type: 'Promise<void>',
      description:
        'Resolves when the schedule is successfully deleted.',
    },
    category: 'schedules' as const,
  },

  {
    name: 'getSchedules',
    description:
      'Get all scheduled transactions in the budget. Schedules define recurring transactions that are automatically created.',
    params: [

    ],
    returns: {
      type: 'Promise<APIScheduleEntity[]>',
      description:
        'An array of schedule objects with id, name, next_date, completed, posts_transaction, payee, account, amount, amountOp, and date properties.',
    },
    category: 'schedules' as const,
  },

  {
    name: 'getIDByName',
    description:
      'Look up the UUID of an entity by its name. Useful for finding IDs when you only know the display name.',
    params: [
    {
      name: 'type',
      type: '"categories" | "accounts" | "schedules" | "payees"',
      required: true,
      description: 'The type of entity to look up: \'accounts\', \'schedules\', \'categories\', or \'payees\'.',
    },
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'The name of the entity to find.',
    }
    ],
    returns: {
      type: 'Promise<string>',
      description:
        'The UUID of the matching entity, or null if no match is found.',
    },
    category: 'query' as const,
  },

  {
    name: 'getServerVersion',
    description:
      'Get the version of the sync server that the budget is connected to. Useful for checking compatibility.',
    params: [

    ],
    returns: {
      type: 'Promise<{ error: "no-server"; } | { error: "network-failure"; } | { version: string; }>',
      description:
        'An object with either a version string (e.g., \'24.1.0\') or an error property if the server is unreachable.',
    },
    category: 'query' as const,
  }
];

/**
 * Get a method by its name
 */
export function getMethodByName(name: string): MethodManifest | undefined {
  return manifest.find((m) => m.name === name);
}

/**
 * Get all methods in a specific category
 */
export function getMethodsByCategory(
  category: MethodManifest['category'],
): MethodManifest[] {
  return manifest.filter((m) => m.category === category);
}

/**
 * Get all available categories
 */
export function getCategories(): MethodManifest['category'][] {
  return [
    'lifecycle',
    'budget',
    'transactions',
    'accounts',
    'categories',
    'payees',
    'rules',
    'schedules',
    'query',
    'bank-sync',
  ];
}

/**
 * Get a summary of methods per category
 */
export function getMethodSummary(): Record<
  MethodManifest['category'],
  number
> {
  const summary = {} as Record<MethodManifest['category'], number>;
  for (const category of getCategories()) {
    summary[category] = getMethodsByCategory(category).length;
  }
  return summary;
}
