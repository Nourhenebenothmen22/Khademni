/**
 * Centralized Application Constants & Configuration (Backend)
 * Single source of truth for file uploads, pagination, auth rules, status transitions, and API endpoints.
 */

export const CV_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as const,
  ALLOWED_EXTENSIONS: [".pdf", ".doc", ".docx"] as const,
  DROPZONE_ACCEPT: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
} as const;

export const AVATAR_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
  MAX_FILE_SIZE_MB: 2,
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"] as const,
  INPUT_ACCEPT: "image/jpeg, image/png, image/webp",
} as const;

export const GENERAL_UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_FILES: 5,
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  ALLOWED_EXTENSIONS: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"] as const,
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_SORT_ORDER: "desc" as const,
} as const;

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REGEX_UPPERCASE: /[A-Z]/,
  REGEX_LOWERCASE: /[a-z]/,
  REGEX_DIGIT: /\d/,
  REGEX_SPECIAL: /[^A-Za-z0-9]/,
  MFA_CODE_LENGTH: 6,
} as const;

export const TOKEN_EXPIRATION_CONFIG = {
  ACCESS_TOKEN: "15m",
  REFRESH_TOKEN: "7d",
  MFA_PENDING_TOKEN: "5m",
  EMAIL_VERIFICATION_HOURS: 24,
  PASSWORD_RESET_HOURS: 1,
} as const;

export const COOKIE_CONFIG = {
  REFRESH_TOKEN_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  ACCESS_TOKEN_MAX_AGE_MS: 15 * 60 * 1000, // 15 minutes
} as const;

export const SECURITY_CONFIG = {
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes
  TOKEN_ROTATION_GRACE_PERIOD_MS: 10000, // 10 seconds
  SHUTDOWN_TIMEOUT_MS: 10000, // 10 seconds
} as const;

export const CACHE_TTL_CONFIG = {
  DEFAULT_SECONDS: 3600, // 1 hour
  JOB_CACHE_SECONDS: 3600,
  MODEL_CACHE_SECONDS: 3600,
} as const;

export const API_ROUTES = {
  BASE_V1: "/api/v1",
  AUTH: "/api/v1/auth",
  USERS: "/api/v1/users",
  JOBS: "/api/v1/jobs",
  APPLICATIONS: "/api/v1/applications",
  ADMIN: "/api/v1/admin",
  MATCHING: "/api/v1/matching",
  AI_MODELS: "/api/v1/ai-models",
  NOTIFICATIONS: "/api/v1/notifications",
  ORGANIZATIONS: "/api/v1/organizations",
  INTERVIEWS: "/api/v1/interviews",
} as const;
