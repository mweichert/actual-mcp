/**
 * Generate manifest.ts from extracted API methods and human descriptions
 *
 * Combines:
 * - src/api-methods.json (extracted from TypeScript types)
 * - src/api-method-descriptions.json (human-written descriptions)
 *
 * Output: src/manifest.ts
 *
 * Usage:
 *   npx tsx scripts/generate-manifest.ts          # Generate manifest
 *   npx tsx scripts/generate-manifest.ts --check  # Check if manifest is up-to-date
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExtractedParam {
  name: string;
  type: string;
  required: boolean;
}

interface ExtractedMethod {
  name: string;
  params: ExtractedParam[];
  returnType: string;
}

interface MethodDescription {
  description: string;
  params: Record<string, string>;
  returns: string;
  category: string;
}

const CHECK_MODE = process.argv.includes('--check');

function escapeString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

function main() {
  const methodsPath = join(__dirname, '..', 'src', 'api-methods.json');
  const descriptionsPath = join(__dirname, '..', 'src', 'api-method-descriptions.json');
  const outputPath = join(__dirname, '..', 'src', 'manifest.ts');

  if (!existsSync(methodsPath)) {
    console.error(`Error: ${methodsPath} not found. Run 'npm run extract-api' first.`);
    process.exit(1);
  }

  if (!existsSync(descriptionsPath)) {
    console.error(`Error: ${descriptionsPath} not found.`);
    process.exit(1);
  }

  const { methods } = JSON.parse(readFileSync(methodsPath, 'utf-8')) as { methods: ExtractedMethod[] };
  const descriptions = JSON.parse(readFileSync(descriptionsPath, 'utf-8')) as Record<string, MethodDescription>;

  // Check for missing descriptions
  const missing = methods.filter(m => !descriptions[m.name]);
  if (missing.length > 0) {
    console.error('Missing descriptions for:', missing.map(m => m.name).join(', '));
    if (CHECK_MODE) process.exit(1);
  }

  // Check for stale descriptions (descriptions for methods that no longer exist)
  const methodNames = new Set(methods.map(m => m.name));
  const staleDescriptions = Object.keys(descriptions).filter(name => !methodNames.has(name));
  if (staleDescriptions.length > 0) {
    console.warn('Stale descriptions (methods no longer exist):', staleDescriptions.join(', '));
  }

  // Generate manifest code
  const entries = methods.map(method => {
    const desc = descriptions[method.name] || {
      description: `TODO: Add description for ${method.name}`,
      params: {},
      returns: 'TODO',
      category: 'query',
    };

    const paramsCode = method.params.map(p => {
      const paramDesc = desc.params[p.name] || `The ${p.name} parameter`;
      return `    {
      name: '${escapeString(p.name)}',
      type: '${escapeString(p.type)}',
      required: ${p.required},
      description: '${escapeString(paramDesc)}',
    }`;
    }).join(',\n');

    return `  {
    name: '${escapeString(method.name)}',
    description:
      '${escapeString(desc.description)}',
    params: [
${paramsCode}
    ],
    returns: {
      type: '${escapeString(method.returnType)}',
      description:
        '${escapeString(desc.returns)}',
    },
    category: '${desc.category}' as const,
  }`;
  });

  const code = `/**
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
${entries.join(',\n\n')}
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
`;

  if (CHECK_MODE) {
    if (!existsSync(outputPath)) {
      console.error('Manifest file does not exist. Run: npm run generate-manifest');
      process.exit(1);
    }
    const existing = readFileSync(outputPath, 'utf-8');
    if (existing !== code) {
      console.error('Manifest is out of date. Run: npm run generate-manifest');
      process.exit(1);
    }
    console.log('Manifest is up to date.');
  } else {
    writeFileSync(outputPath, code);
    console.log(`Generated manifest with ${methods.length} methods.`);
  }
}

main();
