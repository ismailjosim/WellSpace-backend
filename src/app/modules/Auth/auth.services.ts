import { UserStatus, type User } from '@prisma/client';
import { prisma } from '@/config/prisma.config';
import { passwordManage } from '@/utils/passwordManage';
import { JWT } from '@/utils/jwtToken';
import { envVars } from '@/config/env';
import AppError from '../../helpers/AppError';
import StatusCode from '../../utils/statusCode';
import type { JwtPayload } from 'jsonwebtoken';
import { sendMail } from '../../utils/sendEmail';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '@/shared/auditService';

const loginIntoDB = async (payload: Partial<User>) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid email or password.');
  }

  // Check password
  const isCorrectPass = await passwordManage.checkingPassword(
    payload?.password as string,
    user.password
  );

  if (!isCorrectPass) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid email or password.');
  }

  // If MFA is enabled, issue temporary MFA token requiring 2FA challenge
  if (user.isMfaEnabled) {
    const mfaToken = JWT.generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaRequired: true,
      },
      envVars.JWT.ACCESS_TOKEN_SECRET,
      '5m'
    );

    return {
      mfaRequired: true,
      mfaToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Generate tokens
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

  // Remove password before returning
  const { password: _password, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};
const refreshTokenFromDB = async (token: string) => {
  let decodedData;
  try {
    decodedData = JWT.verifyToken(token, envVars.JWT.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError(StatusCode.BAD_REQUEST, 'You are not authorized');
  }

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
      status: UserStatus.ACTIVE,
    },
  });

  const tokenPayload = {
    userId: userData.id,
    email: userData.email,
    role: userData.role,
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

  return {
    accessToken,
    refreshToken,
    needPasswordChange: userData.needPasswordChange,
  };
};
const changePasswordIntoDB = async (oldPassword: string, newPassword: string, user: JwtPayload) => {
  // 1️⃣ Find user by email
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: UserStatus.ACTIVE,
    },
  });

  // 2️⃣ Verify old password
  const isCorrectPass: boolean = await passwordManage.checkingPassword(
    oldPassword,
    userData.password
  );

  if (!isCorrectPass) {
    throw new AppError(StatusCode.UNAUTHORIZED, "Old Password doesn't match");
  }

  // 3️⃣ Check that new password is not same as old
  if (oldPassword === newPassword) {
    throw new AppError(StatusCode.BAD_REQUEST, 'New Password must be different from Old Password');
  }

  // 4️⃣ Prevent password from including email
  if (newPassword.includes(user.email)) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Password cannot include user email');
  }

  // 5️⃣ Hash new password
  const hashedNewPassword = await passwordManage.hashingPassword(newPassword);

  // 6️⃣ Update user password in DB
  await prisma.user.update({
    where: { id: userData.id },
    data: {
      password: hashedNewPassword,
      needPasswordChange: false,
    },
  });

  return {
    message: 'Password updated successfully',
  };
};
const forgetPasswordIntoDB = async (payload: { email: string }) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
      status: UserStatus.ACTIVE,
    },
  });
  const tokenPayload = {
    userId: userData.id,
    email: userData.email,
    role: userData.role,
  };

  const resetPasswordToken = JWT.generateToken(tokenPayload, envVars.JWT.ACCESS_TOKEN_SECRET, '5m');

  const resetUILink = `${envVars.FRONTEND_URL}/reset-password?id=${userData.id}&token=${resetPasswordToken}`;

  sendMail({
    to: userData.email,
    subject: 'Password Reset',
    templateName: 'forgetPassword',
    templateData: {
      name: 'User',
      resetUILink,
    },
  });

  return null;
};
const resetPasswordIntoDB = async (
  token: string | null,
  payload: { email?: string; password: string },
  user?: { email: string }
) => {
  let userEmail: string;

  // Case 1: Token-based reset (from forgot password email)
  if (token) {
    const decodedToken = JWT.verifyToken(token, envVars.JWT.ACCESS_TOKEN_SECRET);

    if (!decodedToken) {
      throw new AppError(StatusCode.FORBIDDEN, 'Invalid or expired reset token!');
    }

    // Verify email from token matches the email in payload
    if (payload.email && decodedToken.email !== payload.email) {
      throw new AppError(StatusCode.FORBIDDEN, 'Email mismatch! Invalid reset request.');
    }

    userEmail = decodedToken.email;
  }
  // Case 2: Authenticated user with needPasswordChange (newly created admin/doctor)
  else if (user && user.email) {
    console.log({ user }, 'needPasswordChange');
    const authenticatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: user.email,
        status: UserStatus.ACTIVE,
      },
    });

    // Verify user actually needs password change
    if (!authenticatedUser.needPasswordChange) {
      throw new AppError(
        StatusCode.BAD_REQUEST,
        "You don't need to reset your password. Use change password instead."
      );
    }

    userEmail = user.email;
  } else {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      'Invalid request. Either provide a valid token or be authenticated.'
    );
  }

  // hash password
  // Check password
  const password = await passwordManage.hashingPassword(payload?.password as string);

  // update into database
  await prisma.user.update({
    where: {
      email: userEmail,
    },
    data: {
      password,
      needPasswordChange: false,
    },
  });
};
const getMeFromDB = async (userSession: any) => {
  if (!userSession || typeof userSession !== 'string') {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Authentication token not provided');
  }
  const decodedData = JWT.verifyToken(userSession, envVars.JWT.ACCESS_TOKEN_SECRET);
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
      isMfaEnabled: true,
      mfaMethod: true,
      createdAt: true,
      updatedAt: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          registrationNumber: true,
          experience: true,
          gender: true,
          appointmentFee: true,
          qualification: true,
          currentWorkingPlace: true,
          designation: true,
          averageRating: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          doctorSpecialties: {
            include: {
              specialties: true,
            },
          },
        },
      },
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          patientHealthData: true,
        },
      },
    },
  });
  return userData;
};

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

export const AuthServices = {
  loginIntoDB,
  refreshTokenFromDB,
  changePasswordIntoDB,
  forgetPasswordIntoDB,
  resetPasswordIntoDB,
  getMeFromDB,
  mfaSetupIntoDB,
  mfaVerifySetupIntoDB,
  mfaChallengeIntoDB,
  mfaDisableIntoDB,
};
