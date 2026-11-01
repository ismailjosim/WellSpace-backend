import { prisma } from '@/config/prisma.config';
import type { JwtPayload } from 'jsonwebtoken';
import { logAuditEvent } from '@/shared/auditService';

export interface DefaultSettingItem {
  key: string;
  value: string;
  category: 'APPOINTMENT' | 'PAYMENT' | 'GENERAL' | 'SECURITY';
  description: string;
}

const DEFAULT_SETTINGS: DefaultSettingItem[] = [
  {
    key: 'cancellation_hours_limit',
    value: '24',
    category: 'APPOINTMENT',
    description: 'Minimum hours before an appointment that a patient can cancel free of penalty.',
  },
  {
    key: 'min_booking_buffer_minutes',
    value: '60',
    category: 'APPOINTMENT',
    description: 'Minimum minutes in advance a slot must be booked before the start time.',
  },
  {
    key: 'platform_commission_percent',
    value: '10',
    category: 'PAYMENT',
    description: 'Percentage fee deducted from doctor consultation payments by the platform.',
  },
  {
    key: 'currency_symbol',
    value: 'USD',
    category: 'PAYMENT',
    description: 'Default currency code for billing and invoices.',
  },
  {
    key: 'support_email',
    value: 'support@wellspace.health',
    category: 'GENERAL',
    description: 'Primary customer and clinical support inbox.',
  },
  {
    key: 'support_phone',
    value: '+1 (800) 555-WELL',
    category: 'GENERAL',
    description: 'Toll-free 24/7 patient helpline contact number.',
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    category: 'SECURITY',
    description:
      'When enabled, displays maintenance banner to public visitors and restricts updates.',
  },
  {
    key: 'emergency_notice',
    value:
      'For medical emergencies, please immediately visit your nearest emergency room or dial 911.',
    category: 'SECURITY',
    description: 'Mandatory clinical disclaimer displayed across the healthcare application.',
  },
];

const ensureDefaultSettings = async () => {
  for (const item of DEFAULT_SETTINGS) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: item.key },
    });
    if (!existing) {
      await prisma.systemSetting.create({
        data: item,
      });
    }
  }
};

const getPublicSettingsFromDB = async () => {
  await ensureDefaultSettings();

  const publicKeys = [
    'maintenance_mode',
    'emergency_notice',
    'support_email',
    'support_phone',
    'cancellation_hours_limit',
  ];

  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: publicKeys },
    },
  });

  const formatted: Record<string, string> = {};
  settings.forEach((s) => {
    formatted[s.key] = s.value;
  });

  return formatted;
};

const getAllSettingsFromDB = async () => {
  await ensureDefaultSettings();

  const settings = await prisma.systemSetting.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const categorized: Record<string, typeof settings> = {};
  settings.forEach((item) => {
    if (!categorized[item.category]) {
      categorized[item.category] = [];
    }
    categorized[item.category].push(item);
  });

  return {
    raw: settings,
    byCategory: categorized,
  };
};

const updateSettingsInDB = async (user: JwtPayload, payload: Record<string, string>) => {
  const updatedRecords: { key: string; oldValue: string; newValue: string }[] = [];

  for (const [key, value] of Object.entries(payload)) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (existing) {
      const updated = await prisma.systemSetting.update({
        where: { key },
        data: {
          value: String(value),
          updatedBy: user.userId,
        },
      });
      updatedRecords.push({
        key,
        oldValue: existing.value,
        newValue: updated.value,
      });
    }
  }

  await logAuditEvent({
    userId: user.userId,
    userEmail: user.email,
    userRole: user.role,
    action: 'SYSTEM_SETTINGS_UPDATED',
    resourceType: 'SystemSetting',
    resourceId: 'BATCH',
    oldData: updatedRecords.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.oldValue }), {}),
    newData: updatedRecords.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.newValue }), {}),
  });

  return updatedRecords;
};

const getSettingValue = async (key: string, defaultValue: string = ''): Promise<string> => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export const SettingsService = {
  getPublicSettingsFromDB,
  getAllSettingsFromDB,
  updateSettingsInDB,
  getSettingValue,
};
