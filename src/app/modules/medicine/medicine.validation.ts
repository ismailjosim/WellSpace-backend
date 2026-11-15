import { z } from 'zod';
import { MedicineOrderStatus, MedicinePaymentMethod } from '@prisma/client';

const medicineFields = {
  name: z.string().trim().min(2),
  genericName: z.string().trim().min(2),
  brand: z.string().trim().min(1),
  category: z.string().trim().min(2),
  description: z.string().trim().min(5),
  dosageForm: z.string().trim().min(2),
  strength: z.string().trim().min(1),
  manufacturer: z.string().trim().min(2),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  requiresPrescription: z.boolean(),
};

export const medicineCreateSchema = z.object(medicineFields);
export const medicineUpdateSchema = z.object({
  name: medicineFields.name.optional(),
  genericName: medicineFields.genericName.optional(),
  brand: medicineFields.brand.optional(),
  category: medicineFields.category.optional(),
  description: medicineFields.description.optional(),
  dosageForm: medicineFields.dosageForm.optional(),
  strength: medicineFields.strength.optional(),
  manufacturer: medicineFields.manufacturer.optional(),
  price: medicineFields.price.optional(),
  stock: medicineFields.stock.optional(),
  requiresPrescription: medicineFields.requiresPrescription.optional(),
  isActive: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(30),
  paymentMethod: z.nativeEnum(MedicinePaymentMethod),
  deliveryAddress: z.string().trim().min(10).max(500),
  contactNumber: z.string().trim().min(7).max(32),
});

export const orderStatusSchema = z.object({
  status: z.nativeEnum(MedicineOrderStatus),
  rejectionReason: z.string().trim().max(500).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
});

export const stockUpdateSchema = z.object({
  stock: z.number().int().min(0),
});
