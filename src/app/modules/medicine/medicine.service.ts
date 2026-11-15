import {
  MedicineOrderStatus,
  MedicinePaymentMethod,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';
import { prisma } from '@/config/prisma.config';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';
import { stripeConfig } from '@/config/stripe.config';
import { envVars } from '@/config/env';
import {
  createOrderSchema,
  medicineCreateSchema,
  medicineUpdateSchema,
  orderStatusSchema,
  stockUpdateSchema,
} from './medicine.validation';
import type Stripe from 'stripe';
import { deleteFromCloudinary, getSecurePrescriptionUrl } from '@/config/multer.config';

const toPublicMedicineWhere = (query: Record<string, unknown>) => {
  const and: Prisma.MedicineWhereInput[] = [{ isActive: true }];
  const searchTerm = typeof query.search === 'string' ? query.search.trim() : '';
  const category = typeof query.category === 'string' ? query.category.trim() : '';
  const prescription = query.prescription;

  if (searchTerm) {
    and.push({
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { genericName: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { manufacturer: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
  }
  if (category) {
    and.push({ category: { equals: category, mode: 'insensitive' } });
  }
  if (prescription === 'true' || prescription === 'false') {
    and.push({ requiresPrescription: prescription === 'true' });
  }

  return { AND: and };
};

const getMedicinesFromDB = async (query: Record<string, unknown>) => {
  return prisma.medicine.findMany({
    where: toPublicMedicineWhere(query),
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: 100,
  });
};

const getManagedMedicinesFromDB = async () => {
  return prisma.medicine.findMany({
    orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
  });
};

const parseJsonField = (value: unknown, name: string) => {
  if (typeof value !== 'string') {
    throw new AppError(StatusCode.BAD_REQUEST, `Invalid ${name} data.`);
  }
  try {
    return JSON.parse(value);
  } catch {
    throw new AppError(StatusCode.BAD_REQUEST, `Invalid ${name} data.`);
  }
};

const validateMedicineImage = async (file?: Express.Multer.File) => {
  if (file && !file.mimetype.startsWith('image/')) {
    if (file.path) await deleteFromCloudinary(file.path);
    throw new AppError(StatusCode.BAD_REQUEST, 'Medicine photos must be image files.');
  }
};

const createMedicineIntoDB = async (req: {
  body: Record<string, unknown>;
  file?: Express.Multer.File;
}) => {
  const payload = medicineCreateSchema.safeParse(parseJsonField(req.body.data, 'medicine'));
  if (!payload.success) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      payload.error.issues[0]?.message || 'Invalid medicine details.'
    );
  }
  await validateMedicineImage(req.file);

  return prisma.medicine.create({
    data: {
      ...payload.data,
      imageUrl: req.file?.path,
    },
  });
};

const updateMedicineIntoDB = async (
  id: string,
  req: { body: Record<string, unknown>; file?: Express.Multer.File }
) => {
  const payload = medicineUpdateSchema.safeParse(parseJsonField(req.body.data, 'medicine'));
  if (!payload.success) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      payload.error.issues[0]?.message || 'Invalid medicine details.'
    );
  }
  await validateMedicineImage(req.file);

  const existing = await prisma.medicine.findUnique({ where: { id } });
  if (!existing) throw new AppError(StatusCode.NOT_FOUND, 'Medicine not found.');

  const updated = await prisma.medicine.update({
    where: { id },
    data: {
      ...payload.data,
      ...(req.file?.path ? { imageUrl: req.file.path } : {}),
    },
  });
  if (req.file?.path && existing.imageUrl) {
    await deleteFromCloudinary(existing.imageUrl);
  }
  return updated;
};

const deactivateMedicineIntoDB = async (id: string) => {
  const medicine = await prisma.medicine.findUnique({ where: { id } });
  if (!medicine) throw new AppError(StatusCode.NOT_FOUND, 'Medicine not found.');
  return prisma.medicine.update({
    where: { id },
    data: { isActive: false },
  });
};

const updateStockIntoDB = async (id: string, rawPayload: unknown) => {
  const payload = stockUpdateSchema.safeParse(rawPayload);
  if (!payload.success) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Stock must be a non-negative whole number.');
  }
  return prisma.medicine.update({
    where: { id },
    data: { stock: payload.data.stock },
  });
};

const getShopOverviewFromDB = async () => {
  const [
    totalProducts,
    activeProducts,
    pendingOrders,
    totalOrders,
    inventory,
    lowStockProducts,
    revenue,
  ] = await Promise.all([
    prisma.medicine.count(),
    prisma.medicine.count({ where: { isActive: true } }),
    prisma.medicineOrder.count({ where: { status: MedicineOrderStatus.PENDING_REVIEW } }),
    prisma.medicineOrder.count(),
    prisma.medicine.aggregate({ _sum: { stock: true } }),
    prisma.medicine.count({ where: { isActive: true, stock: { lte: 5 } } }),
    prisma.medicineOrder.aggregate({
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    totalProducts,
    activeProducts,
    pendingOrders,
    totalOrders,
    totalInventory: inventory._sum.stock || 0,
    lowStockProducts,
    paidRevenue: Number(revenue._sum.totalAmount || 0),
    currency: 'BDT',
  };
};

const createMedicineOrderIntoDB = async (
  user: JwtPayload,
  rawBody: Record<string, unknown>,
  prescription?: { publicId: string; format: string }
) => {
  const body = {
    ...rawBody,
    items:
      typeof rawBody.items === 'string'
        ? parseJsonField(rawBody.items, 'order items')
        : rawBody.items,
  };
  const validation = createOrderSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      validation.error.issues[0]?.message || 'Invalid order details.'
    );
  }

  if (
    new Set(validation.data.items.map((item) => item.medicineId)).size !==
    validation.data.items.length
  ) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Each medicine can only appear once in an order.');
  }

  const patient = await prisma.patient.findUnique({
    where: { email: user.email },
  });
  if (!patient || patient.isDeleted) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'An active patient account is required to order medicines.'
    );
  }

  return prisma.$transaction(async (transaction) => {
    const medicines = await transaction.medicine.findMany({
      where: {
        id: { in: validation.data.items.map((item) => item.medicineId) },
        isActive: true,
      },
    });
    if (medicines.length !== validation.data.items.length) {
      throw new AppError(StatusCode.BAD_REQUEST, 'One or more medicines are no longer available.');
    }

    if (medicines.some((medicine) => medicine.requiresPrescription) && !prescription) {
      throw new AppError(StatusCode.BAD_REQUEST, 'A prescription is required for this order.');
    }

    let totalAmount = new Prisma.Decimal(0);
    const orderItems: Prisma.MedicineOrderItemCreateWithoutOrderInput[] = [];

    for (const item of validation.data.items) {
      const medicine = medicines.find((current) => current.id === item.medicineId);
      if (!medicine) {
        throw new AppError(StatusCode.BAD_REQUEST, 'Medicine not found.');
      }

      const stockUpdate = await transaction.medicine.updateMany({
        where: { id: medicine.id, isActive: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new AppError(StatusCode.BAD_REQUEST, `${medicine.name} does not have enough stock.`);
      }

      totalAmount = totalAmount.plus(medicine.price.mul(item.quantity));
      orderItems.push({
        medicine: { connect: { id: medicine.id } },
        productName: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.price,
      });
    }

    const order = await transaction.medicineOrder.create({
      data: {
        patient: { connect: { id: patient.id } },
        paymentMethod: validation.data.paymentMethod,
        totalAmount,
        deliveryAddress: validation.data.deliveryAddress,
        contactNumber: validation.data.contactNumber,
        prescriptionUrl: prescription?.publicId,
        prescriptionFormat: prescription?.format,
        items: { create: orderItems },
      },
      include: {
        items: { include: { medicine: true } },
      },
    });
    const { prescriptionUrl: _prescriptionId, prescriptionFormat: _format, ...publicOrder } = order;
    return { ...publicOrder, hasPrescription: Boolean(prescription) };
  });
};

const getMyMedicineOrdersFromDB = async (user: JwtPayload) => {
  const orders = await prisma.medicineOrder.findMany({
    where: { patient: { email: user.email } },
    include: {
      items: {
        include: {
          medicine: { select: { id: true, imageUrl: true, requiresPrescription: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(({ prescriptionUrl, prescriptionFormat: _format, ...order }) => ({
    ...order,
    hasPrescription: Boolean(prescriptionUrl),
  }));
};

const getManagedOrdersFromDB = async () => {
  const orders = await prisma.medicineOrder.findMany({
    include: {
      patient: {
        select: { name: true, email: true, contactNumber: true, address: true },
      },
      items: {
        include: {
          medicine: { select: { id: true, imageUrl: true, requiresPrescription: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return orders.map(({ prescriptionUrl, prescriptionFormat: _format, ...order }) => ({
    ...order,
    hasPrescription: Boolean(prescriptionUrl),
  }));
};

const getPrescriptionUrlForOrder = async (id: string, user: JwtPayload) => {
  const order = await prisma.medicineOrder.findUnique({
    where: { id },
    select: {
      prescriptionUrl: true,
      prescriptionFormat: true,
      patient: { select: { email: true } },
    },
  });
  if (!order?.prescriptionUrl || !order.prescriptionFormat) {
    throw new AppError(StatusCode.NOT_FOUND, 'Prescription not found.');
  }
  if (user.role === UserRole.PATIENT && order.patient.email !== user.email) {
    throw new AppError(StatusCode.FORBIDDEN, 'You are not authorized to view this prescription.');
  }
  if (
    user.role !== UserRole.PATIENT &&
    user.role !== UserRole.SHOP_MANAGER &&
    user.role !== UserRole.SHOP_ASSISTANT
  ) {
    throw new AppError(StatusCode.FORBIDDEN, 'You are not authorized to view this prescription.');
  }
  return {
    url: getSecurePrescriptionUrl(order.prescriptionUrl, order.prescriptionFormat),
  };
};

const updateMedicineOrderStatusIntoDB = async (
  id: string,
  staff: JwtPayload,
  rawPayload: unknown
) => {
  const payload = orderStatusSchema.safeParse(rawPayload);
  if (!payload.success) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Invalid order status update.');
  }

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.medicineOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new AppError(StatusCode.NOT_FOUND, 'Medicine order not found.');

    const allowedTransitions: Partial<Record<MedicineOrderStatus, MedicineOrderStatus[]>> = {
      PENDING_REVIEW: [MedicineOrderStatus.APPROVED, MedicineOrderStatus.REJECTED],
      APPROVED: [MedicineOrderStatus.PROCESSING],
      PROCESSING: [MedicineOrderStatus.SHIPPED],
      SHIPPED: [MedicineOrderStatus.DELIVERED],
    };
    if (!allowedTransitions[order.status]?.includes(payload.data.status)) {
      throw new AppError(
        StatusCode.BAD_REQUEST,
        `Cannot move an order from ${order.status} to ${payload.data.status}.`
      );
    }
    if (payload.data.status === MedicineOrderStatus.REJECTED && !payload.data.rejectionReason) {
      throw new AppError(StatusCode.BAD_REQUEST, 'A rejection reason is required.');
    }
    if (payload.data.status === MedicineOrderStatus.SHIPPED && !payload.data.trackingNumber) {
      throw new AppError(StatusCode.BAD_REQUEST, 'A tracking number is required before shipping.');
    }
    if (
      payload.data.status === MedicineOrderStatus.PROCESSING &&
      order.paymentMethod === MedicinePaymentMethod.STRIPE &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new AppError(
        StatusCode.BAD_REQUEST,
        'Online payment must be completed before processing this order.'
      );
    }

    if (payload.data.status === MedicineOrderStatus.REJECTED) {
      for (const item of order.items) {
        await transaction.medicine.update({
          where: { id: item.medicineId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const paymentStatus =
      payload.data.status === MedicineOrderStatus.DELIVERED &&
      order.paymentMethod === MedicinePaymentMethod.CASH_ON_DELIVERY
        ? PaymentStatus.PAID
        : order.paymentStatus;

    const updated = await transaction.medicineOrder.update({
      where: { id },
      data: {
        status: payload.data.status,
        rejectionReason: payload.data.rejectionReason || null,
        trackingNumber: payload.data.trackingNumber || order.trackingNumber,
        paymentStatus,
      },
      include: {
        patient: { select: { name: true, email: true, contactNumber: true, address: true } },
        items: {
          include: {
            medicine: { select: { id: true, imageUrl: true, requiresPrescription: true } },
          },
        },
      },
    });

    const {
      prescriptionUrl: _prescriptionId,
      prescriptionFormat: _format,
      ...publicOrder
    } = updated;
    return {
      ...publicOrder,
      hasPrescription: Boolean(order.prescriptionUrl),
      updatedBy: staff.email,
    };
  });
};

const initiateMedicinePayment = async (orderId: string, user: JwtPayload) => {
  const order = await prisma.medicineOrder.findFirst({
    where: { id: orderId, patient: { email: user.email } },
    include: { items: true },
  });
  if (!order) throw new AppError(StatusCode.NOT_FOUND, 'Medicine order not found.');
  if (order.status !== MedicineOrderStatus.APPROVED) {
    throw new AppError(StatusCode.BAD_REQUEST, 'The shop must approve this order before payment.');
  }
  if (order.paymentMethod !== MedicinePaymentMethod.STRIPE) {
    throw new AppError(StatusCode.BAD_REQUEST, 'This order uses cash on delivery.');
  }
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(StatusCode.BAD_REQUEST, 'This order has already been paid.');
  }

  const session = await stripeConfig.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email,
    line_items: order.items.map((item) => ({
      price_data: {
        currency: 'bdt',
        product_data: { name: item.productName },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    })),
    metadata: { medicineOrderId: order.id },
    success_url: `${envVars.FRONTEND_URL}/dashboard/medicine-orders?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/dashboard/medicine-orders?payment=cancelled`,
  });

  if (!session.url) {
    throw new AppError(StatusCode.BAD_REQUEST, 'Unable to start online payment.');
  }

  await prisma.medicineOrder.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });
  return { paymentUrl: session.url };
};

const markMedicineOrderSessionAsPaid = async (session: Stripe.Checkout.Session) => {
  const orderId = session.metadata?.medicineOrderId;
  if (!orderId) return false;
  const update = await prisma.medicineOrder.updateMany({
    where: {
      id: orderId,
      stripeSessionId: session.id,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: MedicinePaymentMethod.STRIPE,
    },
    data: { paymentStatus: PaymentStatus.PAID },
  });
  return update.count === 1;
};

const verifyMedicinePaymentForPatient = async (sessionId: string, user: JwtPayload) => {
  const session = await stripeConfig.checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.medicineOrderId;
  if (!orderId) throw new AppError(StatusCode.NOT_FOUND, 'Payment session was not found.');

  const order = await prisma.medicineOrder.findFirst({
    where: { id: orderId, patient: { email: user.email }, stripeSessionId: sessionId },
    select: { id: true, paymentStatus: true },
  });
  if (!order) throw new AppError(StatusCode.NOT_FOUND, 'Payment session was not found.');

  if (session.payment_status === 'paid') {
    await markMedicineOrderSessionAsPaid(session);
    return { orderId: order.id, paymentStatus: PaymentStatus.PAID };
  }
  return { orderId: order.id, paymentStatus: order.paymentStatus };
};

export const MedicineService = {
  getMedicinesFromDB,
  getManagedMedicinesFromDB,
  createMedicineIntoDB,
  updateMedicineIntoDB,
  deactivateMedicineIntoDB,
  updateStockIntoDB,
  getShopOverviewFromDB,
  createMedicineOrderIntoDB,
  getMyMedicineOrdersFromDB,
  getManagedOrdersFromDB,
  getPrescriptionUrlForOrder,
  updateMedicineOrderStatusIntoDB,
  initiateMedicinePayment,
  markMedicineOrderSessionAsPaid,
  verifyMedicinePaymentForPatient,
};
