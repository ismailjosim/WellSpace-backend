import type { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { pick } from '@/utils/prismaFilter';
import { adminFilterableFields } from './admin.constant';

const getAllAdmin = async (req: Request, res: Response) => {
  try {
    const filters = pick(req.query, adminFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy']);

    const result = await AdminService.getAllAdminFromDB(filters, options);

    res.status(201).send({
      success: true,
      message: 'All Admin Retrieved Successfully',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: error.name || 'something went wrong!',
      error,
    });
  }
};
const getSingleAdminByID = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.getSingleAdminByIDFromDB(req.params.id as string);

    res.status(201).send({
      success: true,
      message: `Admin Info Retrieved Successfully`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: error.name || 'something went wrong!',
      error,
    });
  }
};
const updateAdminInfo = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.updateAdminInfoIntoDB(req.params.id as string, req.body);

    res.status(201).send({
      success: true,
      message: `Admin Info Retrieved Successfully`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: error.message || 'something went wrong!',
      error,
    });
  }
};

const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const filters = pick(req.query, [
      'userId',
      'userEmail',
      'userRole',
      'action',
      'resourceType',
      'resourceId',
      'searchTerm',
      'startDate',
      'endDate',
    ]);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy']);

    const result = await AdminService.getAuditLogsFromDB(filters, options);

    res.status(200).send({
      success: true,
      message: 'Audit logs retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: error.message || 'Failed to retrieve audit logs',
      error,
    });
  }
};

const exportAuditLogsCsv = async (req: Request, res: Response) => {
  try {
    const filters = pick(req.query, [
      'userId',
      'userEmail',
      'userRole',
      'action',
      'resourceType',
      'searchTerm',
    ]);

    const csvData = await AdminService.exportAuditLogsCsvFromDB(filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs-export.csv"');
    res.status(200).send(csvData);
  } catch (error: any) {
    res.status(500).send({
      success: false,
      message: error.message || 'Failed to export audit logs',
      error,
    });
  }
};

export const AdminController = {
  getAllAdmin,
  getSingleAdminByID,
  updateAdminInfo,
  getAuditLogs,
  exportAuditLogsCsv,
};
