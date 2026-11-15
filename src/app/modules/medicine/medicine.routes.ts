import { Router } from 'express';
import { UserRole } from '@prisma/client';
import checkAuth from '@/middlewares/checkAuth';
import { fileUploader } from '@/config/multer.config';
import { MedicineController } from './medicine.controller';

const router = Router();

const shopStaffRoles = [UserRole.SHOP_MANAGER, UserRole.SHOP_ASSISTANT];
const shopManagerRole = [UserRole.SHOP_MANAGER];

router.get('/', MedicineController.getMedicines);
router.get(
  '/admin-overview',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  MedicineController.getOverview
);
router.get('/management/overview', checkAuth(...shopStaffRoles), MedicineController.getOverview);
router.get('/management', checkAuth(...shopStaffRoles), MedicineController.getManagedMedicines);
router.get('/orders/my', checkAuth(UserRole.PATIENT), MedicineController.getMyOrders);
router.get('/orders/payment-status', checkAuth(UserRole.PATIENT), MedicineController.verifyPayment);
router.get(
  '/orders/:id/prescription',
  checkAuth(UserRole.PATIENT, ...shopStaffRoles),
  MedicineController.getPrescriptionUrl
);
router.post(
  '/orders',
  checkAuth(UserRole.PATIENT),
  fileUploader.prescriptionUpload.single('prescription'),
  MedicineController.createOrder
);
router.post('/orders/:id/pay', checkAuth(UserRole.PATIENT), MedicineController.initiatePayment);
router.get('/orders', checkAuth(...shopStaffRoles), MedicineController.getManagedOrders);
router.patch(
  '/orders/:id/status',
  checkAuth(...shopStaffRoles),
  MedicineController.updateOrderStatus
);
router.patch('/:id/stock', checkAuth(...shopStaffRoles), MedicineController.updateStock);
router.post(
  '/',
  checkAuth(...shopManagerRole),
  fileUploader.multerUpload.single('file'),
  MedicineController.createMedicine
);
router.patch(
  '/:id',
  checkAuth(...shopManagerRole),
  fileUploader.multerUpload.single('file'),
  MedicineController.updateMedicine
);
router.delete('/:id', checkAuth(...shopManagerRole), MedicineController.deactivateMedicine);

export const MedicineRoutes = router;
