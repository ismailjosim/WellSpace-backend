import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '@/config/prisma.config';
import { passwordManage } from '@/utils/passwordManage';
import StatusCode from '../../utils/statusCode';
import AppError from '../../helpers/AppError';

export const createPatientIntoDB = async (req: Request) => {
  const hashedPassword: string = await passwordManage.hashingPassword(req.body.password);
  const cloudinaryUrl = req.file?.path;

  const payloadData = req.body.patient;

  const patientData = {
    ...payloadData,
    profilePhoto: cloudinaryUrl,
  };

  const result = await prisma.$transaction(async (transactionClient) => {
    await transactionClient.user.create({
      data: {
        email: payloadData.email,
        password: hashedPassword,
      },
    });

    return await transactionClient.patient.create({
      data: {
        ...patientData,
      },
    });
  });

  return result;
};

export const createAdminIntoDB = async (req: Request) => {
  const hashedPassword: string = await passwordManage.hashingPassword(req.body.password);
  const cloudinaryUrl = req.file?.path;

  const payloadData = req.body.admin;

  const adminData = {
    ...payloadData,
    profilePhoto: cloudinaryUrl,
  };

  const result = await prisma.$transaction(async (transactionClient) => {
    await transactionClient.user.create({
      data: {
        email: payloadData.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });

    return await transactionClient.admin.create({
      data: {
        ...adminData,
      },
    });
  });

  return result;
};

export const createDoctorIntoDB = async (req: Request) => {
  const hashedPassword: string = await passwordManage.hashingPassword(req.body.password);
  const cloudinaryUrl = req.file?.path;

  const { specialties, ...payloadData } = req.body.doctor;
  const doctorData = {
    ...payloadData,
    profilePhoto: cloudinaryUrl,
  };

  const result = await prisma.$transaction(async (transactionClient) => {
    await transactionClient.user.create({
      data: {
        email: payloadData.email,
        password: hashedPassword,
        role: UserRole.DOCTOR,
      },
    });

    const createDoctorData = await transactionClient.doctor.create({
      data: {
        ...doctorData,
      },
    });

    if (specialties && Array.isArray(specialties) && specialties.length > 0) {
      const existingSpecialties = await transactionClient.specialties.findMany({
        where: {
          id: { in: specialties },
        },
        select: { id: true },
      });

      const existingSpecialtiesIds = existingSpecialties.map((s) => s.id);
      const invalidSpecialties = specialties.filter(
        (id: string) => !existingSpecialtiesIds.includes(id)
      );
      if (invalidSpecialties.length > 0) {
        throw new AppError(
          StatusCode.BAD_REQUEST,
          `Invalid specialties IDs: ${invalidSpecialties.join(', ')}`
        );
      }

      const doctorSpecialtiesData = specialties.map((specialtyId: string) => ({
        doctorId: createDoctorData.id,
        specialtiesId: specialtyId,
      }));

      await transactionClient.doctorSpecialties.createMany({
        data: doctorSpecialtiesData,
      });
    }

    const doctorWithSpecialties = await transactionClient.doctor.findUnique({
      where: { id: createDoctorData.id },
      include: {
        doctorSpecialties: {
          include: { specialties: true },
        },
      },
    });
    return doctorWithSpecialties;
  });

  return result;
};
