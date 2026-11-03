import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.config';
import { paginationHelper, type IOptions } from '@/utils/paginationHelper';
import { userSearchableFields } from './user.constant';
import { buildWhereCondition } from '@/utils/prismaFilter';
import {
  createAdminIntoDB,
  createDoctorIntoDB,
  createPatientIntoDB,
} from './user.creation.services';
import {
  changeProfileStatusIntoDB,
  getMyProfileFromDB,
  updateMyProfileIntoDB,
} from './user.profile.services';

const getAllUsersFromDB = async (params: any, options: IOptions) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  const whereConditions = buildWhereCondition<Prisma.UserWhereInput>(
    userSearchableFields as (keyof Prisma.UserWhereInput)[],
    params
  );

  const result = await prisma.user.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: {
      [sortBy]: orderBy,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

export const UserServices = {
  createAdminIntoDB,
  createPatientIntoDB,
  createDoctorIntoDB,
  getAllUsersFromDB,
  getMyProfileFromDB,
  changeProfileStatusIntoDB,
  updateMyProfileIntoDB,
};
