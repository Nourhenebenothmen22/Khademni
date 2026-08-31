import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../..');
const backendConstantsPath = path.resolve(rootDir, 'backend/src/config/constants.ts');
const frontendConstantsPath = path.resolve(rootDir, 'frontend/src/config/constants.ts');
const prismaSchemaPath = path.resolve(rootDir, 'backend/prisma/schema.prisma');
const frontendTypesPath = path.resolve(rootDir, 'frontend/src/types/backend.ts');

console.log('=== Cross-Stack Configuration Consistency Audit ===\n');

let failureCount = 0;

function assertEqual(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`CONFIG MISMATCH: ${name}\n   Backend:  ${a}\n   Frontend: ${e}`);
    failureCount++;
  } else {
    console.log(`PASS: ${name}`);
  }
}

// 1. Check constants files existence
if (!fs.existsSync(backendConstantsPath)) {
  console.error('Missing backend/src/config/constants.ts');
  process.exit(1);
}
if (!fs.existsSync(frontendConstantsPath)) {
  console.error('Missing frontend/src/config/constants.ts');
  process.exit(1);
}

// Dynamically import backend constants
const backendConstants = await import('../src/config/constants.js');

// 2. Verify CV_UPLOAD_CONFIG
assertEqual(
  backendConstants.CV_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
  10 * 1024 * 1024,
  'CV_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES === 10MB'
);
assertEqual(
  backendConstants.CV_UPLOAD_CONFIG.MAX_FILE_SIZE_MB,
  10,
  'CV_UPLOAD_CONFIG.MAX_FILE_SIZE_MB === 10'
);
assertEqual(
  backendConstants.CV_UPLOAD_CONFIG.ALLOWED_EXTENSIONS,
  ['.pdf', '.doc', '.docx'],
  'CV_UPLOAD_CONFIG.ALLOWED_EXTENSIONS'
);
assertEqual(
  backendConstants.CV_UPLOAD_CONFIG.ALLOWED_MIME_TYPES,
  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  'CV_UPLOAD_CONFIG.ALLOWED_MIME_TYPES'
);

// 3. Verify AVATAR_UPLOAD_CONFIG
assertEqual(
  backendConstants.AVATAR_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
  2 * 1024 * 1024,
  'AVATAR_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES === 2MB'
);
assertEqual(
  backendConstants.AVATAR_UPLOAD_CONFIG.MAX_FILE_SIZE_MB,
  2,
  'AVATAR_UPLOAD_CONFIG.MAX_FILE_SIZE_MB === 2'
);
assertEqual(
  backendConstants.AVATAR_UPLOAD_CONFIG.ALLOWED_EXTENSIONS,
  ['.jpg', '.jpeg', '.png', '.webp'],
  'AVATAR_UPLOAD_CONFIG.ALLOWED_EXTENSIONS'
);

// 4. Verify PAGINATION_CONFIG
assertEqual(backendConstants.PAGINATION_CONFIG.DEFAULT_PAGE, 1, 'PAGINATION_CONFIG.DEFAULT_PAGE');
assertEqual(backendConstants.PAGINATION_CONFIG.DEFAULT_LIMIT, 10, 'PAGINATION_CONFIG.DEFAULT_LIMIT');
assertEqual(backendConstants.PAGINATION_CONFIG.MAX_LIMIT, 100, 'PAGINATION_CONFIG.MAX_LIMIT');

// 5. Verify PASSWORD_CONFIG
assertEqual(backendConstants.PASSWORD_CONFIG.MIN_LENGTH, 8, 'PASSWORD_CONFIG.MIN_LENGTH');
assertEqual(backendConstants.PASSWORD_CONFIG.MAX_LENGTH, 128, 'PASSWORD_CONFIG.MAX_LENGTH');
assertEqual(backendConstants.PASSWORD_CONFIG.MFA_CODE_LENGTH, 6, 'PASSWORD_CONFIG.MFA_CODE_LENGTH');

// 6. Verify Status Machine
const statusMachine = await import('../src/modules/applications/status-machine.js');
assertEqual(
  Object.keys(statusMachine.VALID_TRANSITIONS).sort(),
  ['ACCEPTED', 'INTERVIEWED', 'INTERVIEW_SCHEDULED', 'REJECTED', 'SHORTLISTED', 'SUBMITTED', 'UNDER_REVIEW', 'WITHDRAWN'].sort(),
  'Status Machine covers all ApplicationStatus enum values'
);

// 7. Verify Prisma Schema Enums match Frontend Types
const prismaSchema = fs.readFileSync(prismaSchemaPath, 'utf8');
const frontendTypes = fs.readFileSync(frontendTypesPath, 'utf8');

const enumMatches = [...prismaSchema.matchAll(/enum\s+(\\w+)\s+\{([^}]+)\}/g)];
for (const match of enumMatches) {
  const enumName = match[1];
  const enumValues = match[2]
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));

  if (!frontendTypes.includes(enumName)) {
    console.error('FAIL: Frontend types/backend.ts missing enum ' + enumName);
    failureCount++;
  } else {
    let allValsMatch = true;
    for (const val of enumValues) {
      if (!frontendTypes.includes('"' + val + '"')) {
        console.error('FAIL: Frontend types/backend.ts missing enum value ' + enumName + '.' + val);
        failureCount++;
        allValsMatch = false;
      }
    }
    if (allValsMatch) {
      console.log('PASS: Prisma enum ' + enumName + ' (' + enumValues.length + ' values) synced');
    }
  }
}

// 8. Result Summary
console.log('\n=================================================');
if (failureCount === 0) {
  console.log('ALL_CONFIGURATION_CONSISTENCY_CHECKS_PASSED\n');
  process.exit(0);
} else {
  console.error(failureCount + ' CONFIGURATION CONSISTENCY CHECKS FAILED\n');
  process.exit(1);
}
