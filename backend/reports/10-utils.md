# Sub-Agent 10 — Utilities & Shared Infrastructure Audit Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: Shared Utilities, Helpers, Custom Error Classes, AES-256-GCM Encryption, Formatting Functions, and Reusable Infrastructure Drivers.

---

## 1. Utility Topology

Cross-cutting utility functions are housed under `backend/src/common/` and `backend/src/lib/`:

```
backend/src/
├── common/
│   ├── errors/
│   │   └── app-error.ts       # Custom operational error class
│   └── utils/
│       └── async-handler.ts   # Express async wrapper function
└── lib/
    ├── audit.ts               # Asynchronous fire-and-forget audit logger
    ├── cache.ts               # Redis & in-memory TTL cache with fallback
    ├── email.ts               # Brevo SMTP transporter & template renderer
    ├── encryption.ts          # Authenticated AES-256-GCM column encryption
    ├── file-storage.ts        # Disk storage with path traversal validation
    ├── jwt.ts                 # Jose JWT sign & verify wrappers
    ├── logger.ts              # Pino logger configuration
    ├── password.ts            # Argon2 password hashing wrappers
    ├── prisma.ts              # Global Prisma Client instance
    ├── redis.ts               # Centralized ioredis client singleton with password auth
    ├── secrets.ts             # Cloud secret provider factory
    └── token.ts               # Token generator & SHA-256 hash helper
```

---

## 2. Utility Specifications

### 1. Custom Error Hierarchy (`app-error.ts`)
Extends JavaScript `Error` to represent operational HTTP exceptions:

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

### 2. Authenticated AES-256-GCM Column Encryption (`encryption.ts`)
Provides cryptographically secure encryption and decryption for sensitive database columns (MFA secrets, third-party provider API keys):
- Uses standard 12-byte initialization vectors (`crypto.randomBytes(12)`).
- Generates 16-byte authentication tags to ensure ciphertext integrity.
- Encodes output as `iv:authTag:encryptedHex` strings.

### 3. Express Async Handler (`async-handler.ts`)
Eliminates boilerplate `try/catch` blocks inside controllers by forwarding rejected Promises to `next(error)`.

### 4. File Storage Driver (`file-storage.ts`)
Provides safe disk I/O operations (`saveFile`, `getFileStream`, `deleteFile`, `fileExists`) with strict path traversal validation (`resolveAndValidate()`) preventing access outside `UPLOAD_DIR`.

### 5. Cryptographic Helper (`token.ts`)
Generates 32-byte cryptographically secure random hex strings (`generateRandomToken()`) and computes SHA-256 digests (`hashToken()`) for database token matching.
