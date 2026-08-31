import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../common/middlewares/validate.middleware.js";
import { z } from "zod";
import {
  createJobPostSchema,
  updateJobPostSchema,
  jobPostQuerySchema,
  jobPostParamsSchema,
} from "../../common/validators/job-post.validators.js";
import { cuidSchema } from "../../common/validators/shared.validators.js";
import { uploadRateLimiter } from "../../common/middlewares/rate-limit.middleware.js";
import { upload, validateAndSaveUpload } from "../../common/middlewares/upload.middleware.js";
import { applyToJobController } from "../applications/applications.controller.js";
import * as jobsController from "./jobs.controller.js";
import * as keywordsController from './job-keywords.controller.js';
import * as rulesController from './job-matching-rules.controller.js';
import {
  bulkCreateJobKeywordsSchema,
  createJobKeywordSchema,
} from '../../common/validators/job-keyword.validators.js';
import {
  createJobMatchingRuleSchema,
  updateJobMatchingRuleSchema,
} from '../../common/validators/job-matching-rule.validators.js';

const router = Router();

// Job Application Upload Route
router.post(
  "/:jobId/apply",
  authenticate,
  uploadRateLimiter,
  validateParams(z.object({ jobId: cuidSchema })),
  upload.single("file"),
  validateAndSaveUpload,
  applyToJobController,
);

router.get(
  "/",
  optionalAuthenticate,
  validateQuery(jobPostQuerySchema),
  jobsController.getJobsController,
);

router.get(
  "/:id",
  optionalAuthenticate,
  validateParams(jobPostParamsSchema),
  jobsController.getJobByIdController,
);

router.post(
  "/",
  authenticate,
  requireTenantAccess,
  requireRole("ORGANIZATION_ADMIN"),
  validateBody(createJobPostSchema),
  jobsController.createJobController,
);

router.put(
  "/:id",
  authenticate,
  requireTenantAccess,
  requireRole("ORGANIZATION_ADMIN"),
  validateParams(jobPostParamsSchema),
  validateBody(updateJobPostSchema),
  jobsController.updateJobController,
);

router.delete(
  "/:id",
  authenticate,
  requireTenantAccess,
  requireRole("ORGANIZATION_ADMIN"),
  validateParams(jobPostParamsSchema),
  jobsController.deleteJobController,
);

// ─── Job Keywords ──────────────────────────────────────────────
router.get('/:jobPostId/keywords', keywordsController.getKeywordsController);

router.post(
  '/:jobPostId/keywords',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  validateBody(bulkCreateJobKeywordsSchema),
  keywordsController.addKeywordsController,
);

router.patch(
  '/:jobPostId/keywords/:id',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  validateBody(createJobKeywordSchema.partial()),
  keywordsController.updateKeywordController,
);

router.delete(
  '/:jobPostId/keywords/:id',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  keywordsController.removeKeywordController,
);

// ─── Job Matching Rules ────────────────────────────────────────
router.get(
  '/:jobPostId/rules',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  rulesController.getRulesController,
);

router.post(
  '/:jobPostId/rules',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  validateBody(createJobMatchingRuleSchema),
  rulesController.addRuleController,
);

router.put(
  '/:jobPostId/rules/:id',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  validateBody(updateJobMatchingRuleSchema),
  rulesController.updateRuleController,
);

router.delete(
  '/:jobPostId/rules/:id',
  authenticate,
  requireTenantAccess,
  requireRole('ORGANIZATION_ADMIN'),
  rulesController.removeRuleController,
);

export { router as jobsRouter };
