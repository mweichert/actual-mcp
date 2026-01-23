/**
 * Generate descriptions for API methods that are missing from api-method-descriptions.json
 *
 * This script is ADDITIVE - it only generates descriptions for new methods,
 * preserving existing descriptions.
 *
 * Usage:
 *   npx tsx scripts/generate-api-method-descriptions.ts          # Generate missing descriptions
 *   npx tsx scripts/generate-api-method-descriptions.ts --check  # Check for missing descriptions
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExtractedMethod {
  name: string;
  params: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
}

interface MethodDescription {
  description: string;
  params: Record<string, string>;
  returns: string;
  category: string;
}

const CHECK_MODE = process.argv.includes('--check');

function main() {
  const methodsPath = join(__dirname, '..', 'src', 'api-methods.json');
  const descriptionsPath = join(__dirname, '..', 'src', 'api-method-descriptions.json');

  if (!existsSync(methodsPath)) {
    console.error(`Error: ${methodsPath} not found. Run 'npm run extract-api' first.`);
    process.exit(1);
  }

  const { methods } = JSON.parse(readFileSync(methodsPath, 'utf-8')) as { methods: ExtractedMethod[] };

  // Load existing descriptions or start with empty object
  let existingDescriptions: Record<string, MethodDescription> = {};
  if (existsSync(descriptionsPath)) {
    existingDescriptions = JSON.parse(readFileSync(descriptionsPath, 'utf-8'));
  }

  // Find methods that are missing descriptions
  const methodNames = new Set(methods.map(m => m.name));
  const missingMethods = methods.filter(m => !existingDescriptions[m.name]);

  // Find stale descriptions (methods that no longer exist)
  const staleDescriptions = Object.keys(existingDescriptions).filter(name => !methodNames.has(name));

  if (missingMethods.length === 0 && staleDescriptions.length === 0) {
    console.log('All methods have descriptions and no stale entries. Nothing to do.');
    return;
  }

  if (missingMethods.length > 0) {
    console.log(`Found ${missingMethods.length} methods missing descriptions:`);
    for (const m of missingMethods) {
      console.log(`  - ${m.name}`);
    }
  }

  if (staleDescriptions.length > 0) {
    console.log(`Found ${staleDescriptions.length} stale descriptions to remove:`);
    for (const name of staleDescriptions) {
      console.log(`  - ${name}`);
    }
  }

  if (CHECK_MODE) {
    if (missingMethods.length > 0 || staleDescriptions.length > 0) {
      console.error('\nRun without --check to update descriptions.');
      process.exit(1);
    }
    return;
  }

  // Remove stale descriptions
  for (const name of staleDescriptions) {
    delete existingDescriptions[name];
  }
  if (staleDescriptions.length > 0) {
    console.log(`\nRemoved ${staleDescriptions.length} stale descriptions.`);
  }

  // If no missing methods, just write the cleaned file and exit
  if (missingMethods.length === 0) {
    writeFileSync(descriptionsPath, JSON.stringify(existingDescriptions, null, 2) + '\n');
    console.log(`Updated ${descriptionsPath}`);
    return;
  }

  // Generate descriptions using Claude CLI
  console.log('\nGenerating descriptions using Claude CLI...');

  const prompt = `You are documenting API methods for Actual Budget (a personal finance app).

Given these method signatures that need descriptions:
${JSON.stringify({ methods: missingMethods }, null, 2)}

Generate a JSON object where keys are method names and values have:
- description: 2-3 sentences explaining what it does and when to use it
- params: { paramName: description } for each parameter (empty object if no params)
- returns: description of return value
- category: one of lifecycle|budget|transactions|accounts|categories|payees|rules|schedules|query|bank-sync

Important context:
- Amounts are integers in cents (10000 = $100.00)
- Dates: YYYY-MM-DD format, months: YYYY-MM format
- IDs are UUIDs (strings)
- syncId for downloadBudget is the groupId from getBudgets() response (NOT cloudFileId!)
- Methods that take callback functions (func parameter) should note they are not callable via MCP

Output only valid JSON, no markdown fences or other text.`;

  try {
    const result = execSync(`claude -p ${JSON.stringify(prompt)}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    // Parse the generated descriptions
    const newDescriptions = JSON.parse(result.trim()) as Record<string, MethodDescription>;

    // Merge with existing descriptions
    const mergedDescriptions = {
      ...existingDescriptions,
      ...newDescriptions,
    };

    // Write back to file
    writeFileSync(descriptionsPath, JSON.stringify(mergedDescriptions, null, 2) + '\n');
    console.log(`\nAdded ${Object.keys(newDescriptions).length} new descriptions to ${descriptionsPath}`);
    console.log('Review the new descriptions and run "npm run generate-manifest" to update manifest.ts');

  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      console.error('\nFailed to generate descriptions. Make sure Claude CLI is installed and configured.');
      console.error('You can manually add descriptions to src/api-method-descriptions.json for:');
      for (const m of missingMethods) {
        console.error(`  - ${m.name}`);
      }
      process.exit(1);
    }
    throw error;
  }
}

main();
