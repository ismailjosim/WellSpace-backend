import type { Request } from 'express';
import { prisma } from '../../config/prisma.config';
import { deleteFromCloudinary } from '../../config/multer.config';
import { paginationHelper, type IOptions } from '../../utils/paginationHelper';
import { buildWhereCondition } from '../../utils/prismaFilter';
import type { Prisma } from '@prisma/client';

const createSpecialtyIntoDB = async (req: Request) => {
  const cloudinaryUrl = req.file?.path;
  const payloadData = req.body;
  const specialtyData = {
    ...payloadData,
    icon: cloudinaryUrl,
  };

  try {
    const result = await prisma.specialties.create({
      data: specialtyData,
    });
    return result;
  } catch (error) {
    if (cloudinaryUrl) {
      try {
        await deleteFromCloudinary(cloudinaryUrl);
      } catch (deleteError) {
        console.error('Failed to delete Cloudinary image:', deleteError);
      }
    }
    throw error;
  }
};

const getAllSpecialtiesFromDB = async (filters: any, options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calcPagination(options);

  const whereConditions = buildWhereCondition<Prisma.SpecialtiesWhereInput>(
    ['title'] as (keyof Prisma.SpecialtiesWhereInput)[],
    filters
  );

  const result = await prisma.specialties.findMany({
    where: whereConditions,
    skip,
    take: limit,
  });

  const total = await prisma.specialties.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: result,
  };
};
const deleteSpecialtyFromDB = async (id: string) => {
  try {
    // 1️⃣ Find the specialty record first to get its Cloudinary URL
    const specialty = await prisma.specialties.findUnique({
      where: { id },
    });

    if (!specialty) {
      throw new Error('Specialty not found');
    }

    // 2️⃣ Delete the specialty record from the database
    const result = await prisma.specialties.delete({
      where: { id },
    });

    // 3️⃣ Then attempt to delete the image from Cloudinary
    if (specialty.icon) {
      try {
        await deleteFromCloudinary(specialty.icon);
      } catch (cloudErr) {
        console.error('Failed to delete image from Cloudinary:', cloudErr);
      }
    }

    return result;
  } catch (error) {
    console.error('Error deleting specialty:', error);
    throw error;
  }
};

const updateSpecialtyInDB = async (id: string, req: Request) => {
  const existingSpecialty = await prisma.specialties.findUnique({
    where: { id },
  });

  if (!existingSpecialty) {
    throw new Error('Specialty not found');
  }

  const newCloudinaryUrl = req.file?.path;
  const payloadData = req.body || {};

  const updateData: { title?: string; icon?: string } = {};
  if (payloadData.title) {
    updateData.title = payloadData.title;
  }
  if (newCloudinaryUrl) {
    updateData.icon = newCloudinaryUrl;
  }

  try {
    const result = await prisma.specialties.update({
      where: { id },
      data: updateData,
    });

    // If new icon was uploaded and saved successfully, delete the previous icon from Cloudinary
    if (newCloudinaryUrl && existingSpecialty.icon && existingSpecialty.icon !== newCloudinaryUrl) {
      try {
        await deleteFromCloudinary(existingSpecialty.icon);
      } catch (cloudErr) {
        console.error('Failed to delete previous icon from Cloudinary:', cloudErr);
      }
    }

    return result;
  } catch (error) {
    // If DB update failed, delete the newly uploaded file to avoid orphaned assets
    if (newCloudinaryUrl) {
      try {
        await deleteFromCloudinary(newCloudinaryUrl);
      } catch (deleteError) {
        console.error('Failed to delete newly uploaded icon after failure:', deleteError);
      }
    }
    throw error;
  }
};

export const SpecialtiesServices = {
  createSpecialtyIntoDB,
  getAllSpecialtiesFromDB,
  updateSpecialtyInDB,
  deleteSpecialtyFromDB,
};
