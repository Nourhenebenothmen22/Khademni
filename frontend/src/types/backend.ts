export type UserRole = "CANDIDATE" | "ADMIN";
export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type KeywordType = "REQUIRED" | "OPTIONAL" | "BONUS";
export type RuleType = "EXPERIENCE" | "DEGREE" | "CERTIFICATION" | "KEYWORD" | "CUSTOM";
export type ApplicationStatus = "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED" | "ACCEPTED" | "WITHDRAWN";
export type DocumentType = "CV" | "MOTIVATION_LETTER";
export type DocumentStatus = "UPLOADED" | "SCANNED" | "VALIDATED" | "REJECTED";
export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type ScoreRecommendation = "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "AVERAGE" | "NOT_RECOMMENDED";
export type EvaluationMetricType = "ACCURACY" | "PRECISION" | "RECALL" | "F1_SCORE" | "PRECISION_AT_1" | "PRECISION_AT_5" | "NDCG_AT_5" | "MAP" | "MRR";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  organizationId: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobKeyword {
  id: string;
  jobPostId: string;
  keyword: string;
  type: KeywordType;
  weight: number;
  createdAt: string;
}

export interface JobMatchingRule {
  id: string;
  jobPostId: string;
  ruleName: string;
  type: RuleType;
  condition: Record<string, unknown>;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobPost {
  id: string;
  organizationId: string | null;
  title: string;
  description: string;
  requirements: string;
  status: JobStatus;
  deadline: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization | null;
  createdBy?: User;
  keywords?: JobKeyword[];
  matchingRules?: JobMatchingRule[];
  _count?: {
    applications: number;
  };
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  type: DocumentType;
  status: DocumentStatus;
  originalName: string;
  storedName: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  scannedAt: string | null;
}

export interface ApplicationScore {
  id: string;
  applicationId: string;
  matchingRunId: string;
  finalScore: number;
  recommendation: ScoreRecommendation;
  explanation: string | null;
  calculatedAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobPostId: string;
  motivationLetter: string | null;
  status: ApplicationStatus;
  trackingCode: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  candidate?: User;
  jobPost?: JobPost;
  documents?: ApplicationDocument[];
  score?: ApplicationScore | null;
}

export interface AIMatchingModel {
  id: string;
  name: string;
  version: string;
  algorithm: string;
  description: string | null;
  isActive: boolean;
  hyperparameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AIMatchingMetric {
  id: string;
  evaluationId: string;
  type: EvaluationMetricType;
  value: number;
  createdAt: string;
}

export interface AIMatchingModelEvaluation {
  id: string;
  modelId: string;
  datasetName: string;
  evaluationSampleSize: number;
  averageLatencyMs: number | null;
  evaluationDetails: Record<string, unknown> | null;
  evaluatedAt: string | null;
  createdAt: string;
  metrics?: AIMatchingMetric[];
}

export interface MatchingRun {
  id: string;
  applicationId: string;
  modelId: string;
  status: RunStatus;
  totalScore: number | null;
  confidence: number | null;
  matchedKeywords: Array<{ keyword: string; type: string; weight: number }> | null;
  missingKeywords: Array<{ keyword: string; type: string; weight: number }> | null;
  ruleResults: Array<{ name: string; type: string; weight: number; matched: boolean; explanation: string }> | null;
  scoreBreakdown: {
    keywordsScore: number;
    rulesScore: number;
    ruleBasedScore: number;
    semanticScore: number;
    hybridScore: number;
    ruleWeight: number;
    semanticWeight: number;
    providerUsed: string;
  } | null;
  semanticResult: Record<string, unknown> | null;
  technicalMetrics: Record<string, unknown> | null;
  explanation: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  application?: Application;
  model?: AIMatchingModel;
}

export interface MatchingQueueStatus {
  queueJobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  jobPostId: string;
  processedCount: number;
  failedCount: number;
  totalApplications: number;
  progressPercent: number;
  finishedAt: string | null;
  errorMessage?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  organization?: Organization | null;
  user?: User;
}

export interface DashboardStats {
  totalUsers: number;
  totalApplications: number;
  totalJobPosts: number;
  applicationsByStatus: Array<{ status: ApplicationStatus; count: number }>;
}
