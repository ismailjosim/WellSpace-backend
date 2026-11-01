import { prisma } from '@/config/prisma.config';
import { envVars } from '@/config/env';
import { UserRole, UserStatus } from '@prisma/client';
import { passwordManage } from './passwordManage';
import { logAuditEvent } from '@/shared/auditService';

const seedSuperAdmin = async (): Promise<void> => {
  try {
    const superAdminEmail =
      envVars.SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'super@wellspace.com';
    const superAdminPass = envVars.SUPER_ADMIN_PASS || process.env.SUPER_ADMIN_PASS || '123456';

    if (!superAdminEmail || !superAdminPass) {
      console.warn('⚠️ Super Admin credentials not configured.');
      return;
    }

    // 1. Check if Super Admin already exists by role or by email
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        OR: [{ role: UserRole.SUPER_ADMIN }, { email: superAdminEmail }],
      },
    });

    if (isSuperAdminExist) {
      // If user exists with the designated email but role is not SUPER_ADMIN, ensure upgraded
      if (
        isSuperAdminExist.email === superAdminEmail &&
        isSuperAdminExist.role !== UserRole.SUPER_ADMIN
      ) {
        await prisma.user.update({
          where: { id: isSuperAdminExist.id },
          data: { role: UserRole.SUPER_ADMIN },
        });
        console.log(`👑 Upgraded account ${superAdminEmail} to SUPER_ADMIN.`);
      }
      return;
    }

    // 2. Hash password and seed super admin + admin record in atomic transaction
    const hashedPassword = await passwordManage.hashingPassword(superAdminPass);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: superAdminEmail,
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          needPasswordChange: false,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.admin.create({
        data: {
          name: 'Super Admin',
          email: superAdminEmail,
          contactNumber: '+8801700000000',
          isDeleted: false,
        },
      });
    });

    console.log(`👑 Super Admin created successfully with email: ${superAdminEmail}`);

    await logAuditEvent({
      action: 'SUPER_ADMIN_SEEDED',
      resourceType: 'User',
      resourceId: superAdminEmail,
      userRole: 'SUPER_ADMIN',
      userEmail: superAdminEmail,
      newData: { email: superAdminEmail, role: UserRole.SUPER_ADMIN },
    });
  } catch (error) {
    console.error('❌ Failed to seed Super Admin:', error);
  }
};

export default seedSuperAdmin;
