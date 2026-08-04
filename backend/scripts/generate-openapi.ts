import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openApiDocument } from '../src/config/swagger.js';

async function generateOpenApi() {
  try {
    const outputPath = resolve(process.cwd(), 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf-8');
    console.log(`✅ OpenAPI 3.0 specification generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI specification:', error);
    process.exit(1);
  }
}

generateOpenApi();
