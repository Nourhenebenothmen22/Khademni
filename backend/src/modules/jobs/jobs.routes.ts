import { Router } from "express";
import {
  authenticate,
  requireRole,
} from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../common/middlewares/validate.middleware.js";
import {
  createJobPostSchema,
  updateJobPostSchema,
  jobPostQuerySchema,
  jobPostParamsSchema,
} from "../../common/validators/job-post.validators.js";
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

router.get(
  "/",
  validateQuery(jobPostQuerySchema),
  jobsController.getJobsController,
);

router.get(
  "/:id",
  validateParams(jobPostParamsSchema),
  jobsController.getJobByIdController,
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  requireTenantAccess,
  validateBody(createJobPostSchema),
  jobsController.createJobController,
);

router.put(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  requireTenantAccess,
  validateParams(jobPostParamsSchema),
  validateBody(updateJobPostSchema),
  jobsController.updateJobController,
);

// ─── Job Keywords ──────────────────────────────────────────────
router.get('/:jobPostId/keywords', keywordsController.getKeywordsController);

router.post(
  '/:jobPostId/keywords',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  validateBody(bulkCreateJobKeywordsSchema),
  keywordsController.addKeywordsController,
);

router.patch(
  '/:jobPostId/keywords/:id',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  validateBody(createJobKeywordSchema.partial()),
  keywordsController.updateKeywordController,
);

router.delete(
  '/:jobPostId/keywords/:id',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  keywordsController.removeKeywordController,
);

// ─── Job Matching Rules ────────────────────────────────────────
router.get(
  '/:jobPostId/rules',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  rulesController.getRulesController,
);

router.post(
  '/:jobPostId/rules',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  validateBody(createJobMatchingRuleSchema),
  rulesController.addRuleController,
);

router.put(
  '/:jobPostId/rules/:id',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  validateBody(updateJobMatchingRuleSchema),
  rulesController.updateRuleController,
);

router.delete(
  '/:jobPostId/rules/:id',
  authenticate,
  requireRole('ADMIN'),
  requireTenantAccess,
  rulesController.removeRuleController,
);

export { router as jobsRouter };
