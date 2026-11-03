import { UserStatus, type User } from '@prisma/client';
import { prisma } from '@/config/prisma.config';
import { passwordManage } from '@/utils/passwordManage';
import { JWT } from '@/utils/jwtToken';
import { envVars } from '@/config/env';
import AppError from '../../helpers/AppError';
import StatusCode from '../../utils/statusCode';
import { AuthMfaServices } from './auth.mfa.services';
import { AuthPasswordServices } from './auth.password.services';

const loginIntoDB = async (payload: Partial<User>) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid email or password.');
  }

  const isCorrectPass = await passwordManage.checkingPassword(
    payload?.password as string,
    user.password
  );

  if (!isCorrectPass) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Invalid email or password.');
  }

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

export const AuthServices = {
  loginIntoDB,
  refreshTokenFromDB,
  ...AuthPasswordServices,
  getMeFromDB,
  ...AuthMfaServices,
};
