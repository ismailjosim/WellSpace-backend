import { Router } from 'express';
import { AdminController } from './admin.controller';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/audit-logs/export-csv',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdminController.exportAuditLogsCsv
);
router.get(
  '/audit-logs',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdminController.getAuditLogs
);
router.get('/', checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN), AdminController.getAllAdmin);
router.get(
  '/:id',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdminController.getSingleAdminByID
);
router.patch(
  '/:id',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdminController.updateAdminInfo
);

export const AdminRoutes = router;

/*
 * admin features
 * Implement get all admins with pagination, filtering, searching, and sorting.
 * Implement get admin by ID functionality.
 * Implement update admin by ID functionality.
 * Implement delete admin by ID functionality.
 */
