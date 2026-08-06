import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { OrganizationQuery } from "../../common/validators/organization.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as organizationsService from "./organizations.service.js";

export async function createOrganizationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const createdById = req.user!.userId;
    const organization = await organizationsService.createOrganization(req.body, createdById);

    res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyOrganizationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new AppError("User is not associated with any organization.", 404);
    }

    const organization = await organizationsService.getCurrentUserOrganization(orgId);

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const organization = await organizationsService.getOrganizationById(id);

    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrganizationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const updatedById = req.user!.userId;
    const updated = await organizationsService.updateOrganization(id, req.body, updatedById);

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = ((req as any).validatedQuery as OrganizationQuery) || (req.query as unknown as OrganizationQuery);
    const result = await organizationsService.getOrganizations(query);

    res.status(200).json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
