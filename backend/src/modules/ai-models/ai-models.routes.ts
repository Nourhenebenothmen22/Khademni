import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import { validateBody, validateQuery, validateParams } from "../../common/middlewares/validate.middleware.js";
import { 
  createAIMatchingModelSchema, 
  updateAIMatchingModelSchema, 
  aiMatchingModelQuerySchema, 
  aiMatchingModelParamsSchema 
} from "../../common/validators/ai-matching-model.validators.js";
import { createEvaluationSchema } from "../../common/validators/ai-matching-evaluation.validators.js";
import { bulkCreateMetricsSchema } from "../../common/validators/ai-matching-metric.validators.js";
import * as aiModelsController from "./ai-models.controller.js";
import * as evaluationsController from "./evaluations.controller.js";

const router = Router();

router.use(authenticate, requireTenantAccess, requireRole("ORGANIZATION_ADMIN"));

router.get("/", validateQuery(aiMatchingModelQuerySchema), aiModelsController.getModelsController);

router.post("/", validateBody(createAIMatchingModelSchema), aiModelsController.createModelController);

router.get("/active", aiModelsController.getActiveModelController);

router.get("/:id", validateParams(aiMatchingModelParamsSchema), aiModelsController.getModelByIdController);

router.patch("/:id", validateParams(aiMatchingModelParamsSchema), validateBody(updateAIMatchingModelSchema), aiModelsController.updateModelController);

// ─── AI Model Evaluations & Metrics Routes ─────────────────────
router.get("/:modelId/evaluations", evaluationsController.getEvaluationsController);

router.post(
  "/:modelId/evaluations",
  validateBody(createEvaluationSchema.omit({ modelId: true })),
  evaluationsController.createEvaluationController,
);

router.get("/:modelId/evaluations/:id", evaluationsController.getEvaluationByIdController);

router.post(
  "/:modelId/evaluations/:id/metrics",
  validateBody(bulkCreateMetricsSchema),
  evaluationsController.addMetricsController,
);

export { router as aiModelsRouter };
