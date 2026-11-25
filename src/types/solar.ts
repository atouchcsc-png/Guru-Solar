export type AppView = 'dashboard' | 'calculator' | 'customers' | 'bulk-sms' | 'units';

export type CustomerStage =
  | 'Lead'
  | 'Site Survey'
  | 'Quoted'
  | 'Installation'
  | 'Active Service'
  | 'Service Due';

export type SolarSystemType = 'On-Grid' | 'Off-Grid' | 'Hybrid' | 'Solar Pump';

export interface ServiceLog {
  id: string;
  date: string;
  type: 'Installation' | 'Panel Cleaning' | 'Inverter Check' | 'Battery Service' | 'Site Survey' | 'Quote Follow-up';
  technician: string;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  city: string;
  requirement: string;
  consumerNumber: string;
  systemType: SolarSystemType;
  systemKw: number;
  panelSpec: string;
  inverterSpec: string;
  batterySpec: string;
  stage: CustomerStage;
  totalAmount: number;
  paidAmount: number;
  installationDate: string;
  nextServiceDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  serviceLogs: ServiceLog[];
}

export interface SmsCampaign {
  id: string;
  sentAt: string;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  recipientCount: number;
  recipientNames: string[];
  message: string;
}

export interface SavedCalculation {
  id: string;
  createdAt: string;
  label: string;
  systemType: SolarSystemType;
  recommendedKw: number;
  monthlyUnits: number;
  estimatedCost: number;
  panelCount: number;
  panelWattage: number;
  paybackYears: number;
}

export interface BackupPayload {
  app: 'Guru Solar';
  version: string;
  exportedAt: string;
  customLogo: string | null;
  customers: Customer[];
  campaigns: SmsCampaign[];
  calculations: SavedCalculation[];
}

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export interface ApplianceItem {
  id: string;
  name: string;
  watts: number;
  quantity: number;
  hoursPerDay: number;
  isInductive?: boolean;
}
