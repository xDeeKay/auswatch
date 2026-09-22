import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { AuditActionType, AuditEntityType } from "@/generated/prisma/enums";
import type { AuditLogEntryModel, UserModel } from "@/generated/prisma/models";
import type { PageParams, PaginatedResult } from "@/lib/pagination";

export type AuditLogFilters = {
  entityType?: AuditEntityType;
  action?: AuditActionType;
  actorId?: string;
};

export type AuditLogEntryWithActor = AuditLogEntryModel & {
  actor: UserModel;
  revertedBy: UserModel | null;
};

/** Paginates at the database level, since the audit log grows unboundedly over the project's lifetime. */
export async function listAuditLogEntries(
  filters: AuditLogFilters,
  pageParams: PageParams
): Promise<PaginatedResult<AuditLogEntryWithActor>> {
  const where: Prisma.AuditLogEntryWhereInput = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.action) where.action = filters.action;
  if (filters.actorId) where.actorId = filters.actorId;

  const total = await prisma.auditLogEntry.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageParams.pageSize));
  const page = Math.min(Math.max(pageParams.page, 1), totalPages);

  const items = await prisma.auditLogEntry.findMany({
    where,
    include: { actor: true, revertedBy: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageParams.pageSize,
    take: pageParams.pageSize,
  });

  return { items, page, pageSize: pageParams.pageSize, total, totalPages };
}

/** The head (most recent) entry for an entity, for deciding whether a given entry can still be reverted. */
export async function getHeadEntryId(entityType: AuditEntityType, entityId: string): Promise<string | null> {
  const head = await prisma.auditLogEntry.findFirst({
    where: { entityType, entityId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  return head?.id ?? null;
}
