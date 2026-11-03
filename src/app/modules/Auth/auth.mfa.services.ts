import { UserStatus } from '@prisma/client';
import { prisma } from '@/config/prisma.config';
import { JWT } from '@/utils/jwtToken';
import { envVars } from '@/config/env';
import AppError from '../../helpers/AppError';
import StatusCode from '../../utils/statusCode';
import type { JwtPayload } from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/shared/auditService';

const mfaSetupIntoDB = async (userPayload: JwtPayload) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userPayload.userId, status: UserStatus.ACTIVE },
  });

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `WellSpace (${user.email})`,
    issuer: 'WellSpace Healthcare',
  });

  const otpauthUrl = secret.otpauth_url || '';
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  const plainBackupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    plainBackupCodes.push(rawCode);
    const hashed = await bcrypt.hash(rawCode, 10);
    hashedBackupCodes.push(hashed);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: secret.base32,
      mfaBackupCodes: hashedBackupCodes,
      mfaMethod: 'TOTP',
    },
  });

  return {
    qrCode: qrCodeDataUrl,
    secretKey: secret.base32,
    backupCodes: plainBackupCodes,
  };
};

const mfaVerifySetupIntoDB = async (userPayload: JwtPayload, token: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userPayload.userId, status: UserStatus.ACTIVE },
  });

  if (!user.mfaSecret) {
    throw new AppError(StatusCode.BAD_REQUEST, 'MFA setup has not been initiated');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: token.trim(),
    window: 1,
  });

  if (!isValid) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Invalid 6-digit verification code');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isMfaEnabled: true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'MFA_ENABLED',
    resourceType: 'User',
    resourceId: user.id,
    newData: { isMfaEnabled: true, mfaMethod: 'TOTP' },
  });

  return {
    success: true,
    message: 'Two-factor authentication enabled successfully',
  };
};

const mfaChallengeIntoDB = async (
  mfaToken: string,
  code: string,
  isBackupCode: boolean = false
) => {
  let decoded: JwtPayload;
  try {
    decoded = JWT.verifyToken(mfaToken, envVars.JWT.ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError(
      StatusCode.UNAUTHORIZED,
      'MFA challenge session expired. Please log in again.'
    );
  }

  if (!decoded.mfaRequired || !decoded.userId) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid MFA challenge token');
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: decoded.userId, status: UserStatus.ACTIVE },
  });

  if (!user.isMfaEnabled || !user.mfaSecret) {
    throw new AppError(StatusCode.BAD_REQUEST, 'MFA is not enabled for this user');
  }

  if (isBackupCode) {
    let matchedIndex = -1;
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(code.trim().toUpperCase(), user.mfaBackupCodes[i]);
      if (isMatch) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid backup recovery code');
    }

    const updatedBackupCodes = [...user.mfaBackupCodes];
    updatedBackupCodes.splice(matchedIndex, 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaBackupCodes: updatedBackupCodes },
    });
  } else {
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code.trim(),
      window: 1,
    });

    if (!isValid) {
      throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid 6-digit verification code');
    }
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = JWT.generateToken(
    tokenPayload,
    envVars.JWT.ACCESS_TOKEN_SECRET,
    envVars.JWT.ACCESS_TOKEN_EXPIRES
  );

  const refreshToken = JWT.generateToken(
    tokenPayload,
    envVars.JWT.REFRESH_TOKEN_SECRET,
    envVars.JWT.REFRESH_TOKEN_EXPIRES
  );

  const {
    password: _password,
    mfaSecret: _sec,
    mfaBackupCodes: _bc,
    ...userWithoutPassword
  } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

const mfaDisableIntoDB = async (userPayload: JwtPayload, token: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userPayload.userId, status: UserStatus.ACTIVE },
  });

  if (!user.isMfaEnabled || !user.mfaSecret) {
    throw new AppError(StatusCode.BAD_REQUEST, 'MFA is not currently enabled');
  }

  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: token.trim(),
    window: 1,
  });

  if (!isValid) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Invalid 6-digit verification code to disable MFA');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isMfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
      mfaMethod: null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'MFA_DISABLED',
    resourceType: 'User',
    resourceId: user.id,
    newData: { isMfaEnabled: false },
  });

  return {
    success: true,
    message: 'Two-factor authentication disabled successfully',
  };
};

export const AuthMfaServices = {
  mfaSetupIntoDB,
  mfaVerifySetupIntoDB,
  mfaChallengeIntoDB,
  mfaDisableIntoDB,
};
