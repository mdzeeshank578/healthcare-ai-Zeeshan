import { Router } from "express";
import { activeAccountMiddleware, authMiddleware, phcController } from "../../container/index.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { validationMiddleware } from "../../middleware/validate.middleware.js";
import {
  ashaWorkerIdParamValidation,
  emptyPhcQueryValidation,
  statisticsQueryValidation,
  updateAshaWorkerValidation,
  updatePhcValidation,
} from "./validation.js";

export const phcRoutes = Router();
phcRoutes.use(
  authMiddleware.authenticate,
  activeAccountMiddleware.verify,
  authMiddleware.allowRoles("PHC_ADMIN"),
);
phcRoutes.get("/me", asyncHandler(phcController.me));
phcRoutes.patch(
  "/me",
  validationMiddleware.validate(updatePhcValidation),
  asyncHandler(phcController.update),
);
phcRoutes.get(
  "/me/villages/statistics",
  validationMiddleware.validateQuery(emptyPhcQueryValidation),
  asyncHandler(phcController.villageStatistics),
);
phcRoutes.get(
  "/me/overview",
  validationMiddleware.validateQuery(emptyPhcQueryValidation),
  asyncHandler(phcController.overview),
);
phcRoutes.get(
  "/me/statistics",
  validationMiddleware.validateQuery(statisticsQueryValidation),
  asyncHandler(phcController.statistics),
);
phcRoutes.get(
  "/me/disease-statistics",
  validationMiddleware.validateQuery(statisticsQueryValidation),
  asyncHandler(phcController.diseaseStatistics),
);
phcRoutes.get(
  "/me/asha-workers",
  validationMiddleware.validateQuery(emptyPhcQueryValidation),
  asyncHandler(phcController.ashaWorkers),
);
phcRoutes.patch(
  "/me/asha-workers/:workerId",
  validationMiddleware.validateParams(ashaWorkerIdParamValidation),
  validationMiddleware.validate(updateAshaWorkerValidation),
  asyncHandler(phcController.updateAshaWorker),
);
phcRoutes.patch(
  "/me/asha-workers/:workerId/activate",
  validationMiddleware.validateParams(ashaWorkerIdParamValidation),
  asyncHandler(phcController.activateAshaWorker),
);
phcRoutes.patch(
  "/me/asha-workers/:workerId/deactivate",
  validationMiddleware.validateParams(ashaWorkerIdParamValidation),
  asyncHandler(phcController.deactivateAshaWorker),
);
phcRoutes.delete(
  "/me/asha-workers/:workerId",
  validationMiddleware.validateParams(ashaWorkerIdParamValidation),
  asyncHandler(phcController.deleteAshaWorker),
);
phcRoutes.get(
  "/me/operations",
  validationMiddleware.validateQuery(emptyPhcQueryValidation),
  asyncHandler(phcController.operations),
);
