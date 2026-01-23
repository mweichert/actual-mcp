/**
 * Extract AQL schema from Actual Budget source code
 *
 * Uses ts-morph to parse:
 * - Table definitions from schema/index.ts
 * - Operators from compileOp switch in compiler.ts
 * - Functions from compileFunction switch in compiler.ts
 *
 * Output: src/aql-schema.json
 */

import { Project, SyntaxKind, Node, ObjectLiteralExpression, CaseClause } from 'ts-morph';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const LOOT_CORE = join(__dirname, '../../actual/packages/loot-core/src');
const SCHEMA_FILE = join(LOOT_CORE, 'server/aql/schema/index.ts');
const COMPILER_FILE = join(LOOT_CORE, 'server/aql/compiler.ts');
const OUTPUT_FILE = join(__dirname, '../src/aql-schema.json');
const DESCRIPTIONS_FILE = join(__dirname, '../src/aql-schema-descriptions.json');

// Types
interface FieldDef {
  type: string;
  ref?: string;
  required?: boolean;
}

interface TableDef {
  description?: string;
  fields: Record<string, FieldDef>;
}

interface OperatorDef {
  category?: string;
  description?: string;
  example?: string;
}

interface FunctionDef {
  category?: string;
  description?: string;
  parameters?: string;
  example?: string;
}

interface AqlSchema {
  tables: Record<string, TableDef>;
  operators: Record<string, OperatorDef>;
  functions: Record<string, FunctionDef>;
}

interface Descriptions {
  tables?: Record<string, { description?: string }>;
  operators?: Record<string, OperatorDef>;
  functions?: Record<string, FunctionDef>;
}

/**
 * Extract field definition from a call expression like f('type', { ref: 'x' })
 */
function extractFieldDef(callExpr: Node): FieldDef | null {
  if (!Node.isCallExpression(callExpr)) return null;

  const args = callExpr.getArguments();
  if (args.length === 0) return null;

  // First arg is the type string
  const typeArg = args[0];
  if (!Node.isStringLiteral(typeArg)) return null;

  const fieldDef: FieldDef = {
    type: typeArg.getLiteralValue(),
  };

  // Second arg (optional) is the options object
  if (args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
    const opts = args[1] as ObjectLiteralExpression;
    for (const prop of opts.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName();
        const init = prop.getInitializer();

        if (name === 'ref' && init && Node.isStringLiteral(init)) {
          fieldDef.ref = init.getLiteralValue();
        } else if (name === 'required' && init) {
          fieldDef.required = init.getText() === 'true';
        }
        // Ignore 'default' as it's not useful for schema documentation
      }
    }
  }

  return fieldDef;
}

/**
 * Extract tables and fields from schema/index.ts
 */
function extractTables(project: Project): Record<string, TableDef> {
  const sourceFile = project.addSourceFileAtPath(SCHEMA_FILE);
  const tables: Record<string, TableDef> = {};

  // Find: export const schema = { ... }
  const schemaDecl = sourceFile.getVariableDeclaration('schema');
  if (!schemaDecl) {
    console.error('Could not find schema declaration');
    return tables;
  }

  const init = schemaDecl.getInitializer();
  if (!init || !Node.isObjectLiteralExpression(init)) {
    console.error('Schema is not an object literal');
    return tables;
  }

  // Iterate through table properties
  for (const tableProp of init.getProperties()) {
    if (!Node.isPropertyAssignment(tableProp)) continue;

    const tableName = tableProp.getName();
    const tableInit = tableProp.getInitializer();

    if (!tableInit || !Node.isObjectLiteralExpression(tableInit)) continue;

    const fields: Record<string, FieldDef> = {};

    // Iterate through field properties
    for (const fieldProp of tableInit.getProperties()) {
      if (!Node.isPropertyAssignment(fieldProp)) continue;

      const fieldName = fieldProp.getName();
      const fieldInit = fieldProp.getInitializer();

      if (!fieldInit) continue;

      const fieldDef = extractFieldDef(fieldInit);
      if (fieldDef) {
        fields[fieldName] = fieldDef;
      }
    }

    tables[tableName] = { fields };
  }

  return tables;
}

/**
 * Extract case labels from a switch statement
 */
function extractSwitchCases(switchStmt: Node): string[] {
  const cases: string[] = [];

  for (const clause of switchStmt.getDescendantsOfKind(SyntaxKind.CaseClause)) {
    const expr = clause.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      const value = expr.getLiteralValue();
      if (value.startsWith('$')) {
        cases.push(value);
      }
    }
  }

  return cases;
}

/**
 * Extract operators from compileOp function in compiler.ts
 */
function extractOperators(project: Project): Record<string, OperatorDef> {
  const sourceFile = project.addSourceFileAtPath(COMPILER_FILE);
  const operators: Record<string, OperatorDef> = {};

  // Find compileOp function (it's wrapped with saveStack)
  // Look for: const compileOp = saveStack('op', (state, fieldRef, opData) => { ... })
  const compileOpDecl = sourceFile.getVariableDeclaration('compileOp');
  if (!compileOpDecl) {
    console.error('Could not find compileOp declaration');
    return operators;
  }

  // Find switch statements in compileOp
  const switches = compileOpDecl.getDescendantsOfKind(SyntaxKind.SwitchStatement);
  for (const switchStmt of switches) {
    const cases = extractSwitchCases(switchStmt);
    for (const op of cases) {
      operators[op] = {};
    }
  }

  // Also extract $and and $or from compileConditions
  // These are handled in if/else blocks, not switch
  const compileConditionsFunc = sourceFile.getFunction('compileConditions');
  if (compileConditionsFunc) {
    const text = compileConditionsFunc.getText();
    if (text.includes("'$and'") || text.includes('"$and"')) {
      operators['$and'] = { category: 'logical' };
    }
    if (text.includes("'$or'") || text.includes('"$or"')) {
      operators['$or'] = { category: 'logical' };
    }
  }

  return operators;
}

/**
 * Extract functions from compileFunction in compiler.ts
 */
function extractFunctions(project: Project): Record<string, FunctionDef> {
  const sourceFile = project.addSourceFileAtPath(COMPILER_FILE);
  const functions: Record<string, FunctionDef> = {};

  // Find compileFunction variable (wrapped with saveStack)
  const compileFunctionDecl = sourceFile.getVariableDeclaration('compileFunction');
  if (!compileFunctionDecl) {
    console.error('Could not find compileFunction declaration');
    return functions;
  }

  // Find switch statements in compileFunction
  const switches = compileFunctionDecl.getDescendantsOfKind(SyntaxKind.SwitchStatement);
  for (const switchStmt of switches) {
    const cases = extractSwitchCases(switchStmt);
    for (const fn of cases) {
      functions[fn] = {};
    }
  }

  return functions;
}

/**
 * Categorize operators based on their names
 */
function categorizeOperators(operators: Record<string, OperatorDef>): void {
  const categories: Record<string, string> = {
    '$eq': 'comparison',
    '$ne': 'comparison',
    '$lt': 'comparison',
    '$lte': 'comparison',
    '$gt': 'comparison',
    '$gte': 'comparison',
    '$oneof': 'membership',
    '$like': 'string',
    '$notlike': 'string',
    '$regexp': 'string',
    '$and': 'logical',
    '$or': 'logical',
  };

  for (const [op, def] of Object.entries(operators)) {
    if (!def.category && categories[op]) {
      def.category = categories[op];
    }
  }
}

/**
 * Categorize functions based on their names
 */
function categorizeFunctions(functions: Record<string, FunctionDef>): void {
  const categories: Record<string, string> = {
    '$sum': 'aggregate',
    '$sumOver': 'aggregate',
    '$count': 'aggregate',
    '$substr': 'string',
    '$lower': 'string',
    '$neg': 'numeric',
    '$abs': 'numeric',
    '$idiv': 'numeric',
    '$id': 'utility',
    '$day': 'date',
    '$month': 'date',
    '$year': 'date',
    '$condition': 'utility',
    '$nocase': 'string',
    '$literal': 'utility',
  };

  for (const [fn, def] of Object.entries(functions)) {
    if (!def.category && categories[fn]) {
      def.category = categories[fn];
    }
  }
}

/**
 * Merge extracted schema with human-curated descriptions
 */
function mergeDescriptions(schema: AqlSchema): AqlSchema {
  if (!existsSync(DESCRIPTIONS_FILE)) {
    console.log('No descriptions file found, skipping merge');
    return schema;
  }

  const descriptions: Descriptions = JSON.parse(readFileSync(DESCRIPTIONS_FILE, 'utf-8'));

  // Merge table descriptions
  if (descriptions.tables) {
    for (const [tableName, tableDesc] of Object.entries(descriptions.tables)) {
      if (schema.tables[tableName] && tableDesc.description) {
        schema.tables[tableName].description = tableDesc.description;
      }
    }
  }

  // Merge operator descriptions
  if (descriptions.operators) {
    for (const [opName, opDesc] of Object.entries(descriptions.operators)) {
      if (schema.operators[opName]) {
        Object.assign(schema.operators[opName], opDesc);
      }
    }
  }

  // Merge function descriptions
  if (descriptions.functions) {
    for (const [fnName, fnDesc] of Object.entries(descriptions.functions)) {
      if (schema.functions[fnName]) {
        Object.assign(schema.functions[fnName], fnDesc);
      }
    }
  }

  return schema;
}

// Main
console.log('Extracting AQL schema...');
console.log(`Schema file: ${SCHEMA_FILE}`);
console.log(`Compiler file: ${COMPILER_FILE}`);

const project = new Project({
  compilerOptions: {
    target: 99, // ESNext
    module: 199, // NodeNext
    allowJs: true,
  },
  skipAddingFilesFromTsConfig: true,
});

const tables = extractTables(project);
console.log(`Extracted ${Object.keys(tables).length} tables`);

const operators = extractOperators(project);
categorizeOperators(operators);
console.log(`Extracted ${Object.keys(operators).length} operators`);

const functions = extractFunctions(project);
categorizeFunctions(functions);
console.log(`Extracted ${Object.keys(functions).length} functions`);

const schema: AqlSchema = { tables, operators, functions };
const merged = mergeDescriptions(schema);

writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
console.log(`\nOutput written to ${OUTPUT_FILE}`);
