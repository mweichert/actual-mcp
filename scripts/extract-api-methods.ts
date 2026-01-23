/**
 * Extract API method signatures from @actual-app/api TypeScript declarations
 *
 * Uses ts-morph to parse methods.d.ts and output structured JSON.
 * Output: src/api-methods.json
 */

import { Project } from 'ts-morph';
import { writeFileSync } from 'fs';
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

function extractMethods(): ExtractedMethod[] {
  const project = new Project({
    compilerOptions: {
      target: 99, // ESNext
      module: 199, // NodeNext
      moduleResolution: 99, // NodeNext
    },
    skipAddingFilesFromTsConfig: true,
  });

  // Parse the .d.ts file from node_modules
  const dtsPath = join(__dirname, '..', 'node_modules', '@actual-app', 'api', '@types', 'methods.d.ts');
  const sourceFile = project.addSourceFileAtPath(dtsPath);

  const methods: ExtractedMethod[] = [];

  for (const func of sourceFile.getFunctions()) {
    if (!func.isExported()) continue;

    const name = func.getName();
    if (!name) continue;

    // Skip deprecated methods
    const jsDocs = func.getJsDocs();
    const isDeprecated = jsDocs.some(doc =>
      doc.getTags().some(tag => tag.getTagName() === 'deprecated')
    );
    if (isDeprecated) continue;

    const params = func.getParameters().map(param => {
      // Get the parameter name, handling destructured parameters
      let paramName = param.getName();

      // For destructured parameters like { password }, extract a meaningful name
      if (paramName.startsWith('{')) {
        // Try to extract property names from the destructure pattern
        const text = param.getText();
        const match = text.match(/\{\s*(\w+)/);
        if (match) {
          paramName = 'options'; // Use 'options' for object params
        }
      }

      // Get the type text, simplifying complex types
      let typeText = param.getType().getText(param);

      // Simplify very long type definitions
      if (typeText.length > 100) {
        const typeNode = param.getTypeNode();
        if (typeNode) {
          typeText = typeNode.getText();
        }
      }

      return {
        name: paramName,
        type: typeText,
        required: !param.isOptional() && !param.hasInitializer() && !param.hasQuestionToken(),
      };
    });

    // Get return type
    let returnType = func.getReturnType().getText(func);
    if (returnType.length > 100) {
      const returnTypeNode = func.getReturnTypeNode();
      if (returnTypeNode) {
        returnType = returnTypeNode.getText();
      }
    }

    methods.push({ name, params, returnType });
  }

  return methods;
}

const methods = extractMethods();
const output = { methods, extractedAt: new Date().toISOString() };
const outputPath = join(__dirname, '..', 'src', 'api-methods.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Extracted ${methods.length} methods to ${outputPath}`);
