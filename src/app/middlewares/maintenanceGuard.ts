import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '@/modules/settings/settings.service';
import { JWT } from '@/utils/jwtToken';
import { envVars } from '@/config/env';
import { UserRole } from '@prisma/client';

export const maintenanceGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only check write methods (POST, PUT, PATCH, DELETE)
    const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isWriteMethod) {
      next();
      return;
    }

    // Always allow auth and settings endpoints so admins can log in and turn maintenance mode off
    const path = req.path;
    if (
      path.startsWith('/api/v1/auth') ||
      path.startsWith('/api/v1/settings') ||
      path === '/webhook'
    ) {
      next();
      return;
    }

    const isMaintenance = await SettingsService.getSettingValue('maintenance_mode', 'false');
    if (isMaintenance !== 'true') {
      next();
      return;
    }

    // Check if actor is an Admin or SuperAdmin
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.accessToken;

    if (token) {
      try {
        const decoded = JWT.verifyToken(token, envVars.JWT.ACCESS_TOKEN_SECRET);
        if (decoded?.role === UserRole.ADMIN || decoded?.role === UserRole.SUPER_ADMIN) {
          next();
          return;
        }
      } catch {
        // Token invalid or expired, reject as maintenance mode
      }
    }

    res.status(503).json({
      success: false,
      statusCode: 503,
      message:
        'WellSpace is currently undergoing scheduled platform maintenance. Modifications are temporarily restricted. Please try again shortly.',
    });
  } catch {
    next();
  }
};
