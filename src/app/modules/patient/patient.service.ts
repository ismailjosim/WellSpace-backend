import { paginationHelper, type IOptions } from '@/utils/paginationHelper';
import type { Prisma } from '@prisma/client';
import { buildWhereCondition } from '@/utils/prismaFilter';
import { prisma } from '@/config/prisma.config';
import { patientSearchableFields } from './patient.constants';
import StatusCode from '@/utils/statusCode';
import AppError from '@/helpers/AppError';
import type { JwtPayload } from 'jsonwebtoken';
import { deleteFromCloudinary } from '@/config/multer.config';
import type { Request } from 'express';

const getCurrentPatientOrThrow = async (user: JwtPayload) => {
  return prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
      isDeleted: false,
    },
  });
};

/*
 * Get all patients (paginated & filterable)
 */
const getAllPatientsFromDB = async (filters: any, options: IOptions) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  const whereConditions = buildWhereCondition<Prisma.PatientWhereInput>(
    patientSearchableFields as (keyof Prisma.PatientWhereInput)[],
    filters
  );

  const finalWhere: Prisma.PatientWhereInput = {
    AND: [whereConditions, { isDeleted: false }],
  };

  const result = await prisma.patient.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
  });

  const total = await prisma.patient.count({
    where: finalWhere,
  });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

/*
 * Get single patient by ID
 */
const getPatientByIDFromDB = async (id: string) => {
  const result = await prisma.patient.findUnique({
    where: { id },
    include: {
      patientHealthData: true,
      medicalReport: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!result || result.isDeleted) {
    throw new AppError(StatusCode.NOT_FOUND, 'Patient not found');
  }

  return result;
};

const getMyHealthRecordFromDB = async (user: JwtPayload) => {
  const patientInfo = await getCurrentPatientOrThrow(user);

  return prisma.patient.findUnique({
    where: { id: patientInfo.id },
    include: {
      patientHealthData: true,
      medicalReport: {
        orderBy: { createdAt: 'desc' },
      },
      prescriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: true,
          appointment: {
            include: {
              schedule: true,
            },
          },
        },
      },
    },
  });
};

const updateMyHealthDataIntoDB = async (user: JwtPayload, payload: any) => {
  const patientInfo = await getCurrentPatientOrThrow(user);

  return prisma.patientHealthData.upsert({
    where: { patientId: patientInfo.id },
    update: payload,
    create: {
      ...payload,
      patientId: patientInfo.id,
    },
  });
};

const createMyMedicalReportIntoDB = async (user: JwtPayload, req: Request) => {
  const patientInfo = await getCurrentPatientOrThrow(user);
  const reportName = req.body.reportName;
  const reportLink = req.file?.path || req.body.reportLink;

  if (!reportName || !reportLink) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Report name and report file are required');
  }

  return prisma.medicalReport.create({
    data: {
      patientId: patientInfo.id,
      reportName,
      reportLink,
    },
  });
};

const deleteMyMedicalReportFromDB = async (user: JwtPayload, reportId: string) => {
  const patientInfo = await getCurrentPatientOrThrow(user);
  const report = await prisma.medicalReport.findFirst({
    where: {
      id: reportId,
      patientId: patientInfo.id,
    },
  });

  if (!report) {
    throw new AppError(StatusCode.NOT_FOUND, 'Medical report not found');
  }

  await prisma.medicalReport.delete({
    where: { id: report.id },
  });

  if (report.reportLink) {
    try {
      await deleteFromCloudinary(report.reportLink);
    } catch (error) {
      console.error('Failed to delete report from Cloudinary:', error);
    }
  }

  return report;
};

/*
 * Update patient info by ID
 */
const updatePatientInfoByIDIntoDB = async (user: JwtPayload, payload: any) => {
  const { medicalReport, patientHealthData, ...patientData } = payload;

  // 1. Find the patient by email
  const patientInfo = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
      isDeleted: false,
    },
  });

  // 2. Run all updates in a single transaction
  return await prisma.$transaction(async (tnx) => {
    // update patient main info
    await tnx.patient.update({
      where: { id: patientInfo.id },
      data: patientData,
    });

    // update or create health data
    if (patientHealthData) {
      await tnx.patientHealthData.upsert({
        where: { patientId: patientInfo.id },
        update: patientHealthData,
        create: {
          ...patientHealthData,
          patientId: patientInfo.id,
        },
      });
    }
    if (medicalReport) {
      await tnx.medicalReport.create({
        data: {
          ...medicalReport,
          patientId: patientInfo.id,
        },
      });
    }
    // 3. Return updated data with relations if needed
    const result = await tnx.patient.findUnique({
      where: { id: patientInfo.id },
      include: {
        patientHealthData: true,
        medicalReport: true,
      },
    });

    return result;
  });
};

/*
 * Soft delete patient by ID
 */
const deletePatientByIDFromDB = async (id: string) => {
  const existingPatient = await prisma.patient.findUnique({
    where: { id },
  });

  if (!existingPatient || existingPatient.isDeleted) {
    throw new AppError(StatusCode.NOT_FOUND, 'Patient not found');
  }

  const updatedPatient = await prisma.patient.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });

  return updatedPatient;
};

export const PatientService = {
  getAllPatientsFromDB,
  getPatientByIDFromDB,
  getMyHealthRecordFromDB,
  updateMyHealthDataIntoDB,
  createMyMedicalReportIntoDB,
  deleteMyMedicalReportFromDB,
  updatePatientInfoByIDIntoDB,
  deletePatientByIDFromDB,
};

/*
 {
    "name": "Md. Jasim", // update
    "contactNumber": "01700000000",
    "medicalReport": { // create
        "reportName": "Past surgery 01",
        "reportLink": "report Link 01"
    },
    "patientHealthData": { // create or update
        "gender": "MALE",
        "dateOfBirth": "02-06-1998",
        "bloodGroup": "AB-",
        "height": "1.75",
        "weight": "55"
    }
}
 */
