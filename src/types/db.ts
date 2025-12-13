import { Medicine } from "./medicine";

export interface FamilyMember {
  id: number;
  name: string;
  role?: string | null;
  birthDate?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  allergies?: string | null;
  photoUri?: string | null;
  weight?: number | null;
  height?: number | null;
  chronicDiseases?: string | null; // stored as JSON string
  medicalConditions?: string | null; // stored as JSON string
  organConditions?: string | null; // stored as JSON string
  createdAt?: string;
}

export interface Reminder {
  id: number;
  medicineId?: number | null;
  medicineName?: string | null;
  title: string;
  body?: string | null;
  hour: number;
  minute: number;
  daysOfWeek?: string | null; // JSON array
  isActive?: number;
  notificationId?: string | null;
  userId?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface RefillNotification {
  id: number;
  medicineName: string;
  dose?: string | null;
  reason: string;
  reasonType: string;
  medicineId?: number | null;
  userId?: number | null;
  isResolved?: number;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface MedicationLogRow {
  id: number;
  medicineId?: number | null;
  medicineName: string;
  reminderId?: number | null;
  userId?: number | null;
  takenAt: string;
  scheduledTime?: string | null;
  dose?: string | null;
  notes?: string | null;
  pillsTaken?: number;
}

export interface DeletedMedicineRow {
  id: number;
  serverId: number;
  userId: number;
  deletedAt: string;
}

export interface MedicineRow extends Medicine {
  serverId?: number | null;
  syncedAt?: string | null;
  quantity?: number | null;
  totalPills?: number | null;
  usedPills?: number | null;
  pillsPerDose?: number | null;
  lowStockThreshold?: number | null;
  familyMemberId?: number | null;
  userDosage?: string | null;
  incompatibleMedicines?: string | null; // JSON string
  compatibleMedicines?: string | null; // JSON string
  forbiddenFoods?: string | null;
  recommendedFoods?: string | null;
  alcoholInteraction?: string | null;
  caffeineInteraction?: string | null;
  storageConditions?: string | null;
  specialInstructions?: string | null;
  sideEffects?: string | null;
  contraindications?: string | null;
  internationalName?: string | null;
  manufacturer?: string | null;
  packageVolume?: string | null;
  category?: string | null;
  activeIngredients?: string | null;
  indications?: string | null;
  contraindicationsDetailed?: string | null;
  warnings?: string | null;
  foodCompatibility?: string | null;
  drugCompatibility?: string | null;
  dosageDetailed?: string | null;
  childrenRestrictions?: string | null;
  sideEffectsDetailed?: string | null;
  storageConditionsDetailed?: string | null;
  additionalRecommendations?: string | null;
  specialGroupsInfo?: string | null;
  analogs?: string | null;
  takeWithFood?: string | null;
  takeWithLiquid?: string | null;
}

export default {};
