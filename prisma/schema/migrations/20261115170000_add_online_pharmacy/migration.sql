ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SHOP_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SHOP_ASSISTANT';

CREATE TYPE "MedicinePaymentMethod" AS ENUM ('STRIPE', 'CASH_ON_DELIVERY');
CREATE TYPE "MedicineOrderStatus" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'REJECTED',
    'CANCELLED'
);

CREATE TABLE "shop_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicine_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "MedicineOrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "paymentMethod" "MedicinePaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "prescriptionUrl" TEXT,
    "prescriptionFormat" TEXT,
    "rejectionReason" TEXT,
    "trackingNumber" TEXT,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medicine_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "medicine_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_staff_email_key" ON "shop_staff"("email");
CREATE INDEX "medicines_isActive_category_idx" ON "medicines"("isActive", "category");
CREATE INDEX "medicines_name_genericName_brand_idx" ON "medicines"("name", "genericName", "brand");
CREATE UNIQUE INDEX "medicine_orders_stripeSessionId_key" ON "medicine_orders"("stripeSessionId");
CREATE INDEX "medicine_orders_patientId_createdAt_idx" ON "medicine_orders"("patientId", "createdAt");
CREATE INDEX "medicine_orders_status_createdAt_idx" ON "medicine_orders"("status", "createdAt");
CREATE INDEX "medicine_order_items_medicineId_idx" ON "medicine_order_items"("medicineId");

ALTER TABLE "shop_staff" ADD CONSTRAINT "shop_staff_email_fkey"
    FOREIGN KEY ("email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medicine_orders" ADD CONSTRAINT "medicine_orders_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medicine_order_items" ADD CONSTRAINT "medicine_order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "medicine_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medicine_order_items" ADD CONSTRAINT "medicine_order_items_medicineId_fkey"
    FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
