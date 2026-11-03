import { UserStatus } from '@prisma/client';
import { prisma } from '@/config/prisma.config';
import { passwordManage } from '@/utils/passwordManage';
import { JWT } from '@/utils/jwtToken';
import { envVars } from '@/config/env';
import AppError from '../../helpers/AppError';
import StatusCode from '../../utils/statusCode';
import type { JwtPayload } from 'jsonwebtoken';
import { sendMail } from '../../utils/sendEmail';

const changePasswordIntoDB = async (oldPassword: string, newPassword: string, user: JwtPayload) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: UserStatus.ACTIVE,
    },
  });

  const isCorrectPass: boolean = await passwordManage.checkingPassword(
    oldPassword,
    userData.password
  );

  if (!isCorrectPass) {
    throw new AppError(StatusCode.UNAUTHORIZED, "Old Password doesn't match");
  }

  if (oldPassword === newPassword) {
    throw new AppError(StatusCode.BAD_REQUEST, 'New Password must be different from Old Password');
  }

  if (newPassword.includes(user.email)) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Password cannot include user email');
  }

  const hashedNewPassword = await passwordManage.hashingPassword(newPassword);

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

  if (token) {
    const decodedToken = JWT.verifyToken(token, envVars.JWT.ACCESS_TOKEN_SECRET);

    if (!decodedToken) {
      throw new AppError(StatusCode.FORBIDDEN, 'Invalid or expired reset token!');
    }

    if (payload.email && decodedToken.email !== payload.email) {
      throw new AppError(StatusCode.FORBIDDEN, 'Email mismatch! Invalid reset request.');
    }

    userEmail = decodedToken.email;
  } else if (user && user.email) {
    console.log({ user }, 'needPasswordChange');
    const authenticatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: user.email,
        status: UserStatus.ACTIVE,
      },
    });

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

  const password = await passwordManage.hashingPassword(payload?.password as string);

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

export const AuthPasswordServices = {
  changePasswordIntoDB,
  forgetPasswordIntoDB,
  resetPasswordIntoDB,
};
