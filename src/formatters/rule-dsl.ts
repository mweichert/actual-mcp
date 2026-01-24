/**
 * DSL formatter for Actual Budget rules
 * Converts rules to a concise human/LLM-readable format
 */

export interface NameResolver {
  payee: Map<string, string>;
  category: Map<string, string>;
  account: Map<string, string>;
  schedule: Map<string, string>;
}

interface RuleCondition {
  field: string;
  op: string;
  value: unknown;
  options?: {
    inflow?: boolean;
    outflow?: boolean;
    month?: boolean;
    year?: boolean;
  };
}

interface RuleAction {
  op: string;
  field?: string;
  value?: unknown;
  options?: {
    template?: string;
    formula?: string;
    splitIndex?: number;
    method?: string;
  };
}

interface Rule {
  id: string;
  stage: 'pre' | null | 'post';
  conditionsOp: 'and' | 'or';
  conditions: RuleCondition[];
  actions: RuleAction[];
}

const DSL_HEADER = `# Rules DSL: [id] [stage] IF conditions THEN actions
# Stages: PRE|RUN|POST  Ops: AND|OR
# Refs: @payee:Name|@cat:Name|@acct:Name|@sched:Name
# To update: call_api_method with getRule(id) for full JSON, then updateRule
`;

export function formatRulesToDsl(rules: Rule[], resolver?: NameResolver): string {
  if (rules.length === 0) {
    return DSL_HEADER + "\n# (no rules)";
  }

  const lines = rules.map(rule => formatRule(rule, resolver));
  return DSL_HEADER + "\n" + lines.join("\n");
}

function formatRule(rule: Rule, resolver?: NameResolver): string {
  const id = rule.id;
  const stage = formatStage(rule.stage);
  const conditions = formatConditions(rule.conditions, rule.conditionsOp, resolver);
  const actions = formatActions(rule.actions, resolver);

  return `${id} ${stage} IF ${conditions} THEN ${actions}`;
}

function formatStage(stage: 'pre' | null | 'post'): string {
  if (stage === 'pre') return 'PRE';
  if (stage === 'post') return 'POST';
  return 'RUN';
}

function formatConditions(
  conditions: RuleCondition[],
  conditionsOp: 'and' | 'or',
  resolver?: NameResolver
): string {
  if (conditions.length === 0) {
    return '(always)';
  }
  const formatted = conditions.map(c => formatCondition(c, resolver));
  const joiner = conditionsOp === 'and' ? ' AND ' : ' OR ';
  return formatted.join(joiner);
}

function formatCondition(cond: RuleCondition, resolver?: NameResolver): string {
  const field = cond.field;
  const op = cond.op;
  const value = formatValue(cond.value, field, op, resolver);
  const options = formatConditionOptions(cond.options);

  return `${field}${options} ${op} ${value}`;
}

function formatConditionOptions(options?: RuleCondition['options']): string {
  if (!options) return '';

  const flags: string[] = [];
  if (options.inflow) flags.push('inflow');
  if (options.outflow) flags.push('outflow');
  if (options.month) flags.push('month');
  if (options.year) flags.push('year');

  return flags.length > 0 ? `[${flags.join(',')}]` : '';
}

function formatValue(
  value: unknown,
  field: string,
  _op: string,
  resolver?: NameResolver
): string {
  // Handle arrays (oneOf, notOneOf)
  if (Array.isArray(value)) {
    const items = value.map(v => formatSingleValue(v, field, resolver));
    return `(${items.join(',')})`;
  }

  // Handle between ranges
  if (typeof value === 'object' && value !== null && 'num1' in value && 'num2' in value) {
    const range = value as { num1: number; num2: number };
    return `(${range.num1},${range.num2})`;
  }

  return formatSingleValue(value, field, resolver);
}

function formatSingleValue(value: unknown, field: string, resolver?: NameResolver): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);

  // String value - check if it's an ID that should be resolved
  if (typeof value === 'string') {
    if (resolver) {
      // Check if this is a resolvable field
      if (field === 'payee') {
        const name = resolver.payee.get(value);
        if (name) return `@payee:${escapeName(name)}`;
      }
      if (field === 'category') {
        const name = resolver.category.get(value);
        if (name) return `@cat:${escapeName(name)}`;
      }
      if (field === 'account') {
        const name = resolver.account.get(value);
        if (name) return `@acct:${escapeName(name)}`;
      }
    }

    // Check if value needs quoting
    if (value.includes(' ') || value.includes('"') || value.includes(',') || value.includes('(') || value.includes(')')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  // Fallback for complex objects
  return JSON.stringify(value);
}

function escapeName(name: string): string {
  // Quote names with special characters
  if (name.includes(' ') || name.includes(':') || name.includes(',') || name.includes('(') || name.includes(')')) {
    return `"${name.replace(/"/g, '\\"')}"`;
  }
  return name;
}

function formatActions(actions: RuleAction[], resolver?: NameResolver): string {
  if (actions.length === 0) {
    return '(no action)';
  }
  return actions.map(a => formatAction(a, resolver)).join('; ');
}

function formatAction(action: RuleAction, resolver?: NameResolver): string {
  switch (action.op) {
    case 'set':
      return formatSetAction(action, resolver);
    case 'set-split-amount':
      return formatSetSplitAmountAction(action);
    case 'link-schedule':
      return formatLinkScheduleAction(action, resolver);
    case 'prepend-notes':
      return `prepend-notes("${action.value}")`;
    case 'append-notes':
      return `append-notes("${action.value}")`;
    case 'delete-transaction':
      return 'delete-transaction';
    default:
      return `${action.op}(${JSON.stringify(action)})`;
  }
}

function formatSetAction(
  action: RuleAction,
  resolver?: NameResolver
): string {
  const field = action.field || 'unknown';
  const value = formatActionValue(action.value, field, resolver);

  let options = '';
  if (action.options) {
    const optParts: string[] = [];
    if (action.options.template) optParts.push(`template:${action.options.template}`);
    if (action.options.formula) optParts.push(`formula:${action.options.formula}`);
    if (action.options.splitIndex !== undefined) optParts.push(`splitIndex:${action.options.splitIndex}`);
    if (optParts.length > 0) options = `[${optParts.join(',')}]`;
  }

  return `set(${field}=${value})${options}`;
}

function formatSetSplitAmountAction(action: RuleAction): string {
  let options = '';
  if (action.options) {
    const optParts: string[] = [];
    if (action.options.method) optParts.push(`method:${action.options.method}`);
    if (action.options.splitIndex !== undefined) optParts.push(`splitIndex:${action.options.splitIndex}`);
    if (optParts.length > 0) options = `[${optParts.join(',')}]`;
  }
  return `set-split-amount(${action.value})${options}`;
}

function formatLinkScheduleAction(
  action: RuleAction,
  resolver?: NameResolver
): string {
  // value is a ScheduleEntity or schedule ID
  const scheduleId = typeof action.value === 'object' && action.value !== null && 'id' in action.value
    ? (action.value as { id: string }).id
    : String(action.value);

  if (resolver) {
    const name = resolver.schedule.get(scheduleId);
    if (name) return `link-schedule(@sched:${escapeName(name)})`;
  }
  return `link-schedule(${scheduleId})`;
}

function formatActionValue(value: unknown, field: string, resolver?: NameResolver): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string' && resolver) {
    // Resolve based on field type
    if (field === 'payee') {
      const name = resolver.payee.get(value);
      if (name) return `@payee:${escapeName(name)}`;
    }
    if (field === 'category') {
      const name = resolver.category.get(value);
      if (name) return `@cat:${escapeName(name)}`;
    }
    if (field === 'account') {
      const name = resolver.account.get(value);
      if (name) return `@acct:${escapeName(name)}`;
    }
  }

  if (typeof value === 'string') {
    if (value.includes(' ') || value.includes('"') || value.includes(',')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  return JSON.stringify(value);
}
