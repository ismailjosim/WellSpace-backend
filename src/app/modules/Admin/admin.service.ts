import type { Admin, Prisma } from '@prisma/client';

import { buildWhereCondition } from '@/utils/prismaFilter';
import { paginationHelper } from '@/utils/paginationHelper';
import { prisma } from '@/config/prisma.config';

const getAllAdminFromDB = async (params: any, options: any) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  const whereConditions: Prisma.AdminWhereInput = buildWhereCondition<{
    name: string;
    email: string;
  }>(['name', 'email'], params);

  const result = await prisma.admin.findMany({
    // search query
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      sortBy && orderBy
        ? {
            [sortBy]: orderBy,
          }
        : {
            createdAt: 'desc',
          },
  });
  const total = await prisma.admin.count({
    where: whereConditions,
  });
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};
const getSingleAdminByIDFromDB = async (id: string) => {
  const result = await prisma.admin.findUnique({
    where: {
      id,
    },
  });
  return result;
};
const updateAdminInfoIntoDB = async (id: string, payload: Partial<Admin>) => {
  // 🚫 Prevent user from updating email
  if ('email' in payload) {
    throw new Error('You are not authorized to update the email address');
  }

  const result = await prisma.admin.update({
    where: { id },
    data: payload as Prisma.AdminUpdateInput,
  });

  return result;
};

const getAuditLogsFromDB = async (
  filters: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
  },
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    orderBy?: 'asc' | 'desc';
  }
) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (filters.userId) {
    andConditions.push({ userId: filters.userId });
  }
  if (filters.userEmail) {
    andConditions.push({ userEmail: { contains: filters.userEmail, mode: 'insensitive' } });
  }
  if (filters.userRole) {
    andConditions.push({ userRole: filters.userRole });
  }
  if (filters.action) {
    andConditions.push({ action: { contains: filters.action, mode: 'insensitive' } });
  }
  if (filters.resourceType) {
    andConditions.push({ resourceType: filters.resourceType });
  }
  if (filters.resourceId) {
    andConditions.push({ resourceId: filters.resourceId });
  }
  if (filters.searchTerm) {
    andConditions.push({
      OR: [
        { action: { contains: filters.searchTerm, mode: 'insensitive' } },
        { resourceType: { contains: filters.searchTerm, mode: 'insensitive' } },
        { userEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
        { userRole: { contains: filters.searchTerm, mode: 'insensitive' } },
        { resourceId: { contains: filters.searchTerm, mode: 'insensitive' } },
      ],
    });
  }
  if (filters.startDate || filters.endDate) {
    const createdAtCondition: Prisma.DateTimeFilter = {};
    if (filters.startDate) {
      createdAtCondition.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      createdAtCondition.lte = new Date(filters.endDate);
    }
    andConditions.push({ createdAt: createdAtCondition });
  }

  const whereConditions: Prisma.AuditLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.auditLog.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
  });

  const total = await prisma.auditLog.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const exportAuditLogsCsvFromDB = async (filters: {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action?: string;
  resourceType?: string;
  searchTerm?: string;
}) => {
  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (filters.userId) andConditions.push({ userId: filters.userId });
  if (filters.userEmail) {
    andConditions.push({ userEmail: { contains: filters.userEmail, mode: 'insensitive' } });
  }
  if (filters.userRole) andConditions.push({ userRole: filters.userRole });
  if (filters.action) {
    andConditions.push({ action: { contains: filters.action, mode: 'insensitive' } });
  }
  if (filters.resourceType) andConditions.push({ resourceType: filters.resourceType });
  if (filters.searchTerm) {
    andConditions.push({
      OR: [
        { action: { contains: filters.searchTerm, mode: 'insensitive' } },
        { resourceType: { contains: filters.searchTerm, mode: 'insensitive' } },
        { userEmail: { contains: filters.searchTerm, mode: 'insensitive' } },
        { resourceId: { contains: filters.searchTerm, mode: 'insensitive' } },
      ],
    });
  }

  const whereConditions: Prisma.AuditLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const logs = await prisma.auditLog.findMany({
    where: whereConditions,
    take: 5000,
    orderBy: { createdAt: 'desc' },
  });

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    return `"${str.replace(/"/g, '""')}"`;
  };

  const header = [
    'Log ID',
    'Timestamp',
    'User ID',
    'User Email',
    'Role',
    'Action',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'User Agent',
  ].join(',');

  const rows = logs.map((log) =>
    [
      escapeCsv(log.id),
      escapeCsv(log.createdAt.toISOString()),
      escapeCsv(log.userId),
      escapeCsv(log.userEmail),
      escapeCsv(log.userRole),
      escapeCsv(log.action),
      escapeCsv(log.resourceType),
      escapeCsv(log.resourceId),
      escapeCsv(log.ipAddress),
      escapeCsv(log.userAgent),
    ].join(',')
  );

  return [header, ...rows].join('\n');
};

export const AdminService = {
  getAllAdminFromDB,
  getSingleAdminByIDFromDB,
  updateAdminInfoIntoDB,
  getAuditLogsFromDB,
  exportAuditLogsCsvFromDB,
};
