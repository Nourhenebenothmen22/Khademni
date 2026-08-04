# Sub-Agent 10 — Utilities Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Shared Utilities, Helpers, Custom Error Classes, Constants, Formatting Functions, and Reusable Infrastructure Drivers.

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
    ├── cache.ts               # Memory Map TTL cache
    ├── email.ts               # Nodemailer transporter & template renderer
    ├── file-storage.ts        # Disk storage with path traversal validation
    ├── jwt.ts                 # Jose JWT sign & verify wrappers
    ├── logger.ts              # Pino logger configuration
    ├── password.ts            # Argon2 password hashing wrappers
    ├── prisma.ts              # Global Prisma Client instance
    ├── redis.ts               # Centralized ioredis client singleton with fallback logging
    ├── secrets.ts             # Cloud secret provider factory
    └── token.ts               # Token generator & SHA-256 hash helper
```

---

## 2. Utility Specifications

### 1. Custom Error Hierarchy (`app-error.ts`)
Extends JavaScript `Error` to represent operational HTTP exceptions ([app-error.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/errors/app-error.ts)):

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

### 2. Express Async Handler (`async-handler.ts`)
Eliminates boilerplate `try/catch` blocks inside controllers by forwarding rejected Promises to `next(error)` ([async-handler.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/utils/async-handler.ts)):

```typescript
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
```

### 3. File Storage Driver (`file-storage.ts`)
Provides safe disk I/O operations (`saveFile`, `getFileStream`, `deleteFile`, `fileExists`). Includes strict path traversal guard (`resolveAndValidate()`) preventing access outside `UPLOAD_DIR` ([file-storage.ts:L13-L22](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/file-storage.ts#L13-L22)).

### 4. Cryptographic Helper (`token.ts`)
Generates 32-byte cryptographically secure random hex strings (`generateRandomToken()`) and computes SHA-256 digests (`hashToken()`) for database token matching.
