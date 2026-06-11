import { prisma } from '@/config/prisma.config';
import { PaymentStatus, UserRole, AppointmentStatus, Prisma } from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';

// Types for better type safety
interface AppointmentStatusCount {
  status: AppointmentStatus;
  count: number;
}

interface BarChartDataPoint {
  month: Date;
  count: number;
}

type AnalyticsGranularity = 'day' | 'week' | 'month';

interface DashboardAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  granularity?: AnalyticsGranularity;
}

// Utility function to format appointment status distribution
const formatAppointmentStatusDistribution = (
  data: Array<{ status: AppointmentStatus; _count: { id: number } }>
): AppointmentStatusCount[] => {
  return data.map(({ status, _count }) => ({
    status,
    count: Number(_count.id),
  }));
};

const fetchDashboardMetaDataFromDB = async (
  user: JwtPayload,
  filters: DashboardAnalyticsFilters = {}
) => {
  // Fixed: Correct switch case syntax
  switch (user.role) {
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      return await getAdminMetaData(filters);
    case UserRole.DOCTOR:
      return await getDoctorMetaData(user);
    case UserRole.PATIENT:
      return await getPatientMetaData(user);
    default:
      throw new AppError(StatusCode.BAD_REQUEST, 'Invalid user role!');
  }
};

// * Patient Meta data function - Optimized with parallel queries
const getPatientMetaData = async (user: JwtPayload) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: { email: user?.email },
    select: { id: true }, // Only select needed field
  });

  // Run all queries in parallel
  const [appointmentCount, prescriptionCount, reviewCount, appointmentStatusDistribution] =
    await Promise.all([
      prisma.appointment.count({
        where: { patientId: patientData.id },
      }),
      prisma.prescription.count({
        where: { patientId: patientData.id },
      }),
      prisma.review.count({
        where: { patientId: patientData.id },
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { patientId: patientData.id },
      }),
    ]);

  return {
    appointmentCount,
    prescriptionCount,
    reviewCount,
    appointmentStatusDistribution: formatAppointmentStatusDistribution(
      appointmentStatusDistribution
    ),
  };
};

//* Doctor Meta data function - Optimized with parallel queries
const getDoctorMetaData = async (user: JwtPayload) => {
  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: { email: user?.email },
    select: { id: true }, // Only select needed field
  });

  // Run all queries in parallel
  const [
    appointmentCount,
    uniquePatients,
    reviewCount,
    totalRevenue,
    appointmentStatusDistribution,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { doctorId: doctorData.id },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctorData.id },
      distinct: ['patientId'],
      select: { patientId: true },
    }),
    prisma.review.count({
      where: { doctorId: doctorData.id },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        appointment: { doctorId: doctorData.id },
        status: PaymentStatus.PAID,
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { doctorId: doctorData.id },
    }),
  ]);

  return {
    appointmentCount,
    reviewCount,
    patientCount: uniquePatients.length,
    totalRevenue: totalRevenue._sum.amount || 0,
    appointmentStatusDistribution: formatAppointmentStatusDistribution(
      appointmentStatusDistribution
    ),
  };
};

//* Admin Meta data function - Optimized with parallel queries
const getDateRange = (filters: DashboardAnalyticsFilters) => {
  const now = new Date();
  const defaultStartDate = new Date(now);
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const startDate = filters.startDate ? new Date(filters.startDate) : defaultStartDate;
  const endDate = filters.endDate ? new Date(filters.endDate) : now;

  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: Number.isNaN(startDate.getTime()) ? defaultStartDate : startDate,
    endDate: Number.isNaN(endDate.getTime()) ? now : endDate,
    granularity: filters.granularity || 'day',
  };
};

//* Admin Meta data function - Optimized with parallel queries
const getAdminMetaData = async (filters: DashboardAnalyticsFilters) => {
  const { startDate, endDate, granularity } = getDateRange(filters);
  const dateRangeWhere = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Run all base queries and chart data in parallel
  const [
    patientCount,
    doctorCount,
    adminCount,
    appointmentCount,
    paymentCount,
    totalRevenue,
    periodRevenue,
    userRoleDistribution,
    userStatusDistribution,
    paymentStatusDistribution,
    topSpecialties,
    topRatedDoctors,
    canceledAppointments,
    barChartData,
    pieChartData,
  ] = await Promise.all([
    prisma.patient.count({ where: { isDeleted: false } }),
    prisma.doctor.count({ where: { isDeleted: false } }),
    prisma.admin.count({ where: { isDeleted: false } }),
    prisma.appointment.count({ where: dateRangeWhere }),
    prisma.payment.count({ where: dateRangeWhere }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID, ...dateRangeWhere },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    }),
    prisma.user.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ['paymentStatus'],
      _count: { id: true },
      where: dateRangeWhere,
    }),
    prisma.specialties.findMany({
      take: 5,
      orderBy: {
        doctorSpecialties: {
          _count: 'desc',
        },
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            doctorSpecialties: true,
          },
        },
      },
    }),
    prisma.doctor.findMany({
      take: 5,
      where: { isDeleted: false },
      orderBy: [{ averageRating: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        averageRating: true,
        designation: true,
        _count: {
          select: {
            reviews: true,
            appointments: true,
          },
        },
      },
    }),
    prisma.appointment.count({
      where: {
        ...dateRangeWhere,
        status: AppointmentStatus.CANCELED,
      },
    }),
    getBarChartData(startDate, endDate, granularity),
    getPieChartData(dateRangeWhere),
  ]);

  const roleCounts = userRoleDistribution.map(({ role, _count }) => ({
    role,
    count: Number(_count.id),
  }));
  const statusCounts = userStatusDistribution.map(({ status, _count }) => ({
    status,
    count: Number(_count.id),
  }));
  const paidVsUnpaidAppointments = paymentStatusDistribution.map(({ paymentStatus, _count }) => ({
    status: paymentStatus,
    count: Number(_count.id),
  }));

  return {
    patientCount,
    doctorCount,
    adminCount,
    appointmentCount,
    paymentCount,
    totalRevenue: totalRevenue._sum.amount || 0,
    periodRevenue: periodRevenue._sum.amount || 0,
    canceledAppointmentRate:
      appointmentCount > 0 ? Number(((canceledAppointments / appointmentCount) * 100).toFixed(2)) : 0,
    dateRange: {
      startDate,
      endDate,
      granularity,
    },
    userRoleDistribution: roleCounts,
    userStatusDistribution: statusCounts,
    paidVsUnpaidAppointments,
    topSpecialties: topSpecialties.map((specialty) => ({
      id: specialty.id,
      title: specialty.title,
      doctorCount: specialty._count.doctorSpecialties,
    })),
    topRatedDoctors: topRatedDoctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      designation: doctor.designation,
      averageRating: doctor.averageRating,
      reviewCount: doctor._count.reviews,
      appointmentCount: doctor._count.appointments,
    })),
    barChartData,
    pieChartData,
  };
};

// Optimized with proper typing and date formatting
const getBarChartData = async (
  startDate: Date,
  endDate: Date,
  granularity: AnalyticsGranularity
): Promise<BarChartDataPoint[]> => {
  const appointmentCountPerMonth = await prisma.$queryRaw<BarChartDataPoint[]>`
		SELECT
			DATE_TRUNC(${granularity}, "createdAt") as month,
			CAST(COUNT(*) AS INTEGER) AS count
		FROM "appointments"
		WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
		GROUP BY month
		ORDER BY month ASC
	`;
  return appointmentCountPerMonth;
};

// Optimized with helper function
const getPieChartData = async (
  where: Prisma.AppointmentWhereInput
): Promise<AppointmentStatusCount[]> => {
  const appointmentStatusDistribution = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { id: true },
    where,
  });
  return formatAppointmentStatusDistribution(appointmentStatusDistribution);
};

export const MetaService = {
  fetchDashboardMetaDataFromDB,
};
