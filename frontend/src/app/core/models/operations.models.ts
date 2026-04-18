export interface InventoryTransaction {
  id: number;
  transactionNumber: string;
  transactionType: string;
  transactionDate: string;
  sourceLocationId?: number | null;
  targetLocationId?: number | null;
  supplierId?: number | null;
  status: string;
  createdBy?: number | null;
  referenceText?: string | null;
  reason?: string | null;
}

export interface InventoryTransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  unitId: number;
  quantity: number;
  quantityBase?: number | null;
  unitCost?: number | null;
  unitCostBase?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  notes?: string | null;
}

export interface CreateTransactionItemPayload {
  productId: number;
  unitId: number;
  quantity: number;
  unitCost?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  notes?: string | null;
}

export interface CreateTransactionPayload {
  transactionNumber: string;
  transactionType: string;
  transactionDate: string;
  sourceLocationId?: number | null;
  targetLocationId?: number | null;
  supplierId?: number | null;
  referenceText?: string | null;
  reason?: string | null;
  status?: string | null;
  createdBy?: number | null;
  items: CreateTransactionItemPayload[];
}

export interface StockBalance {
  id: number;
  productId: number;
  locationId: number;
  lotNumber?: string | null;
  expirationDate?: string | null;
  quantityBase: number;
  avgUnitCostBase: number;
  lastMovementAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PhysicalCount {
  id: number;
  countNumber: string;
  locationId: number;
  countDate: string;
  status: string;
  notes?: string | null;
  createdBy?: number | null;
  approvedBy?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PhysicalCountItem {
  id: number;
  physicalCountId: number;
  productId: number;
  theoreticalQtyBase: number;
  actualQtyBase: number;
  differenceQtyBase?: number | null;
  notes?: string | null;
}

export interface CreatePhysicalCountItemPayload {
  productId: number;
  theoreticalQtyBase: number;
  actualQtyBase: number;
  notes?: string | null;
}

export interface CreatePhysicalCountPayload {
  countNumber: string;
  locationId: number;
  countDate: string;
  notes?: string | null;
  createdBy?: number | null;
  items: CreatePhysicalCountItemPayload[];
}

export interface Sale {
  id: number;
  saleNumber: string;
  saleDatetime: string;
  locationId: number;
  cashierUserId: number;
  shiftId?: number | null;
  totalAmount: number;
  status: string;
  inventoryProcessed: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  cashierUsername?: string | null;
  cashierFullName?: string | null;
  locationName?: string | null;
  createdBy?: number | null;
  createdByUsername?: string | null;
  createdByFullName?: string | null;
}

export interface SaleItem {
  id: number;
  saleId: number;
  menuItemId?: number | null;
  productId?: number | null;
  unitId?: number | null;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleItemPayload {
  menuItemId?: number | null;
  productId?: number | null;
  unitId?: number | null;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalePayload {
  saleNumber?: string | null;
  saleDatetime?: string | null;
  locationId: number;
  cashierUserId?: number | null;
  shiftId?: number | null;
  totalAmount: number;
  status?: string | null;
  processInventory: boolean;
  items: CreateSaleItemPayload[];
}

export interface ShiftDto {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  locationId: number;
  locationName: string;
  roleName: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateShiftPayload {
  userId: number;
  locationId: number;
  roleName: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string | null;
}
