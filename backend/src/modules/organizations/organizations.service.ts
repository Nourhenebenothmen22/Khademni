import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import { saveFile, getFileStream, deleteFile, fileExists } from "../../lib/file-storage.js";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationQuery,
} from "../../common/validators/organization.validators.js";

export function getLogoUrl(orgId: string, logoKey: string | null): string | null {
  return logoKey ? `/api/v1/organizations/${orgId}/logo` : null;
}

export async function createOrganization(input: CreateOrganizationInput, createdById: string) {
  const existingSlug = await prisma.organization.findUnique({
    where: { slug: input.slug },
  });

  if (existingSlug) {
    throw new AppError("An organization with this slug already exists.", 409);
  }

  if (input.domain) {
    const existingDomain = await prisma.organization.findUnique({
      where: { domain: input.domain },
    });
    if (existingDomain) {
      throw new AppError("An organization with this domain already exists.", 409);
    }
  }

  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      domain: input.domain || null,
    },
  });

  logAuditAction({
    userId: createdById,
    organizationId: organization.id,
    action: "ORGANIZATION_CREATED",
    entityType: "Organization",
    entityId: organization.id,
    metadata: { name: organization.name, slug: organization.slug },
  });

  return {
    ...organization,
    logoUrl: getLogoUrl(organization.id, organization.logoKey),
  };
}

export async function getOrganizationById(id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, jobPosts: true },
      },
    },
  });

  if (!organization) {
    throw new AppError("Organization not found.", 404);
  }

  return {
    ...organization,
    logoUrl: getLogoUrl(organization.id, organization.logoKey),
  };
}

export async function getCurrentUserOrganization(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: { users: true, jobPosts: true },
      },
    },
  });

  if (!organization) {
    throw new AppError("Organization not found.", 404);
  }

  return {
    ...organization,
    logoUrl: getLogoUrl(organization.id, organization.logoKey),
  };
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
  updatedById: string,
) {
  const existing = await prisma.organization.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError("Organization not found.", 404);
  }

  if (input.slug && input.slug !== existing.slug) {
    const duplicateSlug = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });
    if (duplicateSlug) {
      throw new AppError("An organization with this slug already exists.", 409);
    }
  }

  if (input.domain && input.domain !== existing.domain) {
    const duplicateDomain = await prisma.organization.findUnique({
      where: { domain: input.domain },
    });
    if (duplicateDomain) {
      throw new AppError("An organization with this domain already exists.", 409);
    }
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.domain !== undefined ? { domain: input.domain } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  logAuditAction({
    userId: updatedById,
    organizationId: id,
    action: "ORGANIZATION_UPDATED",
    entityType: "Organization",
    entityId: id,
    metadata: { changes: input },
  });

  return {
    ...updated,
    logoUrl: getLogoUrl(updated.id, updated.logoKey),
  };
}

export async function uploadOrganizationLogo(
  orgId: string,
  file: Express.Multer.File | undefined,
  updatedById: string,
) {
  if (!file) {
    throw new AppError("No image file uploaded.", 400);
  }

  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!existing) {
    throw new AppError("Organization not found.", 404);
  }

  if (existing.logoKey) {
    await deleteFile(existing.logoKey).catch(() => {});
  }

  const ext = path.extname(file.originalname).toLowerCase() || ".png";
  const storageKey = `avatars/orgs/${orgId}_${Date.now()}${ext}`;

  const fileBuffer = fs.readFileSync(file.path);
  await saveFile(fileBuffer, storageKey);

  fs.unlink(file.path, () => {});

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { logoKey: storageKey },
  });

  logAuditAction({
    userId: updatedById,
    organizationId: orgId,
    action: "ORGANIZATION_LOGO_UPLOADED",
    entityType: "Organization",
    entityId: orgId,
  });

  return {
    ...updated,
    logoUrl: getLogoUrl(updated.id, updated.logoKey),
  };
}

export async function deleteOrganizationLogo(orgId: string, updatedById: string) {
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!existing) {
    throw new AppError("Organization not found.", 404);
  }

  if (existing.logoKey) {
    await deleteFile(existing.logoKey).catch(() => {});
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { logoKey: null },
  });

  logAuditAction({
    userId: updatedById,
    organizationId: orgId,
    action: "ORGANIZATION_LOGO_DELETED",
    entityType: "Organization",
    entityId: orgId,
  });

  return {
    ...updated,
    logoUrl: null,
  };
}

export async function getOrganizationLogoStream(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, logoKey: true },
  });

  if (!org || !org.logoKey) {
    throw new AppError("Organization logo image not found.", 404);
  }

  const exists = await fileExists(org.logoKey);
  if (!exists) {
    throw new AppError("Logo file not found on disk.", 404);
  }

  const stream = getFileStream(org.logoKey);
  const ext = path.extname(org.logoKey).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  if (ext === ".webp") mimeType = "image/webp";

  return { stream, mimeType };
}

export async function getOrganizations(query: OrganizationQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.OrganizationWhereInput = {};
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
      { domain: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || "createdAt"]: query.sortOrder || "desc" },
      include: {
        _count: {
          select: { users: true, jobPosts: true },
        },
      },
    }),
  ]);

  const itemsWithLogoUrl = items.map((org) => ({
    ...org,
    logoUrl: getLogoUrl(org.id, org.logoKey),
  }));

  return {
    items: itemsWithLogoUrl,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
