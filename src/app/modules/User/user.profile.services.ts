import { UserRole, UserStatus } from '@prisma/client';
import type { Request } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { prisma } from '@/config/prisma.config';
import { logAuditEvent } from '@/shared/auditService';
import StatusCode from '../../utils/statusCode';
import AppError from '../../helpers/AppError';

export const getMyProfileFromDB = async (user: JwtPayload) => {
  const userInfo = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: UserStatus.ACTIVE,
    },
  });
  const { password: _password, ...baseUserData } = userInfo;
  let roleBasedData: any = null;

  switch (userInfo.role) {
    case UserRole.PATIENT:
      roleBasedData = await prisma.patient.findUnique({
        where: { email: userInfo.email },
        include: {
          prescriptions: true,
          appointments: true,
          medicalReport: true,
          patientHealthData: true,
        },
      });
      break;

    case UserRole.DOCTOR:
      roleBasedData = await prisma.doctor.findUnique({
        where: { email: userInfo.email },
        include: {
          doctorSpecialties: {
            include: { specialties: true },
          },
          appointments: true,
          prescriptions: true,
        },
      });
      break;

    case UserRole.ADMIN:
      roleBasedData = await prisma.admin.findUnique({
        where: { email: userInfo.email },
      });
      break;

    case UserRole.SUPER_ADMIN:
      roleBasedData = await prisma.admin.findUnique({
        where: { email: userInfo.email },
      });
      break;

    default:
      throw new AppError(StatusCode.FORBIDDEN, 'Invalid user role');
  }

  return {
    ...baseUserData,
    profile: roleBasedData,
  };
};

export const changeProfileStatusIntoDB = async (
  user: JwtPayload,
  id: string,
  status: UserStatus
) => {
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new AppError(StatusCode.FORBIDDEN, 'You are not authorized to perform this action');
  }

  if (!Object.values(UserStatus).includes(status)) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Invalid status value');
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!existingUser) {
    throw new AppError(StatusCode.NOT_FOUND, 'User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
  });

  await logAuditEvent({
    userId: user.userId,
    userEmail: user.email,
    userRole: user.role,
    action: 'USER_STATUS_UPDATED',
    resourceType: 'User',
    resourceId: id,
    oldData: { status: existingUser.status },
    newData: { status },
  });

  const { password: _password, ...userData } = updatedUser;
  return userData;
};

const parseProfileUpdateData = (req: Request): Record<string, any> => {
  if (!req.body?.data) {
    return {};
  }

  try {
    const bodyData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    return { ...bodyData };
  } catch {
    throw new AppError(StatusCode.BAD_REQUEST, 'Invalid profile data format');
  }
};

const applyProfilePhoto = (updateData: Record<string, any>, req: Request) => {
  if (req.file?.path) {
    updateData.profilePhoto = req.file.path;
  }
};

const updateAdminProfile = async (
  email: string,
  role: UserRole,
  updateData: Record<string, any>
) => {
  const allowedAdminFields: Record<string, any> = {};
  if (updateData.name !== undefined) allowedAdminFields.name = updateData.name;
  if (updateData.contactNumber !== undefined)
    allowedAdminFields.contactNumber = updateData.contactNumber;
  if (updateData.profilePhoto !== undefined)
    allowedAdminFields.profilePhoto = updateData.profilePhoto;

  await prisma.admin.upsert({
    where: { email },
    update: allowedAdminFields,
    create: {
      email,
      name: allowedAdminFields.name || (role === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Admin'),
      contactNumber: allowedAdminFields.contactNumber || '',
      profilePhoto: allowedAdminFields.profilePhoto || null,
    },
  });
};

const updateDoctorProfile = async (email: string, updateData: Record<string, any>) => {
  const allowedDoctorFields: Record<string, any> = {};
  if (updateData.name !== undefined) allowedDoctorFields.name = updateData.name;
  if (updateData.contactNumber !== undefined)
    allowedDoctorFields.contactNumber = updateData.contactNumber;
  if (updateData.profilePhoto !== undefined)
    allowedDoctorFields.profilePhoto = updateData.profilePhoto;
  if (updateData.address !== undefined) allowedDoctorFields.address = updateData.address;
  if (updateData.registrationNumber !== undefined)
    allowedDoctorFields.registrationNumber = updateData.registrationNumber;
  if (updateData.experience !== undefined)
    allowedDoctorFields.experience = Number(updateData.experience) || 0;
  if (updateData.gender !== undefined) allowedDoctorFields.gender = updateData.gender;
  if (updateData.appointmentFee !== undefined)
    allowedDoctorFields.appointmentFee = Number(updateData.appointmentFee) || 0;
  if (updateData.qualification !== undefined)
    allowedDoctorFields.qualification = updateData.qualification;
  if (updateData.currentWorkingPlace !== undefined)
    allowedDoctorFields.currentWorkingPlace = updateData.currentWorkingPlace;
  if (updateData.designation !== undefined)
    allowedDoctorFields.designation = updateData.designation;

  await prisma.doctor.update({
    where: { email },
    data: allowedDoctorFields,
  });
};

const updatePatientProfile = async (email: string, updateData: Record<string, any>) => {
  const allowedPatientFields: Record<string, any> = {};
  if (updateData.name !== undefined) allowedPatientFields.name = updateData.name;
  if (updateData.contactNumber !== undefined)
    allowedPatientFields.contactNumber = updateData.contactNumber;
  if (updateData.profilePhoto !== undefined)
    allowedPatientFields.profilePhoto = updateData.profilePhoto;
  if (updateData.address !== undefined) allowedPatientFields.address = updateData.address;

  await prisma.patient.update({
    where: { email },
    data: allowedPatientFields,
  });
};

export const updateMyProfileIntoDB = async (user: JwtPayload, req: Request) => {
  const existingUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: UserStatus.ACTIVE,
    },
  });

  const updateData = parseProfileUpdateData(req);
  applyProfilePhoto(updateData, req);

  switch (existingUser.role) {
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      await updateAdminProfile(existingUser.email, existingUser.role, updateData);
      break;
    case UserRole.DOCTOR:
      await updateDoctorProfile(existingUser.email, updateData);
      break;
    case UserRole.PATIENT:
      await updatePatientProfile(existingUser.email, updateData);
      break;
    default:
      throw new AppError(StatusCode.FORBIDDEN, 'Invalid user role');
  }

  return { ...updateData };
};
