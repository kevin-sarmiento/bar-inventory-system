export interface StockViewDto {
  stockBalanceId: number;
  productId: number;
  productName: string;
  categoryName: string;
  locationId: number;
  locationName: string;
  baseUnit: string;
  lotNumber?: string | null;
  expirationDate?: string | null;
  quantityBase: number;
  minStockBaseQty: number;
  belowMinStock: boolean;
  avgUnitCostBase: number;
  totalValue: number;
}

export interface DashboardTopProductDto {
  menuItemId: number;
  menuItemName: string;
  quantitySold: number;
  totalSold: number;
}

export interface DashboardTopUserDto {
  userId: number;
  username: string;
  fullName: string;
  salesCount: number;
  totalSold: number;
}

export interface DashboardHourlySalesDto {
  hourOfDay: number;
  salesCount: number;
  totalSold: number;
}

export interface DashboardSummaryDto {
  reportDate: string;
  locationId?: number | null;
  locationName?: string | null;
  salesCount: number;
  salesTotal: number;
  averageTicket: number;
  activeShifts: number;
  scheduledShifts: number;
  completedShifts: number;
  lowStockItems: number;
  inventoryValue: number;
  wasteMovementsCount: number;
  wasteQuantity: number;
  consumptionMovementsCount: number;
  consumptionQuantity: number;
  topProducts: DashboardTopProductDto[];
  topUsers: DashboardTopUserDto[];
  hourlySales: DashboardHourlySalesDto[];
}

export interface MovementReportDto {
  transactionId: number;
  transactionNumber: string;
  transactionType: string;
  transactionDate: string;
  sourceLocation?: string | null;
  targetLocation?: string | null;
  productId: number;
  productName: string;
  unitId: number;
  unitCode: string;
  quantity: number;
  quantityBase: number;
  unitCost?: number | null;
  unitCostBase?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  referenceText?: string | null;
  reason?: string | null;
  status: string;
  createdBy?: string | null;
}

export interface CountDifferenceDto {
  physicalCountId: number;
  countNumber: string;
  countDate: string;
  locationName: string;
  productId: number;
  productName: string;
  theoreticalQtyBase: number;
  actualQtyBase: number;
  differenceQtyBase: number;
  baseUnit: string;
  createdBy?: string | null;
  approvedBy?: string | null;
}

export interface InventoryValuationDto {
  productId: number;
  productName: string;
  categoryName: string;
  locationId: number;
  locationName: string;
  baseUnit: string;
  totalQtyBase: number;
  avgCostBase: number;
  totalInventoryValue: number;
}

export interface AuditHistoryDto {
  auditId: number;
  tableName: string;
  recordPk: string;
  actionType: string;
  changedAt: string;
  changedBy?: string | null;
  oldData?: string | null;
  newData?: string | null;
}

export interface ShiftReportDto {
  shiftId: number;
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
  linkedSalesCount: number;
  linkedSalesTotal: number;
}

export interface ShiftSalesByUserDto {
  userId: number;
  username: string;
  fullName: string;
  shiftsCount: number;
  linkedSalesCount: number;
  linkedSalesTotal: number;
}

export interface ShiftSalesByLocationDto {
  locationId: number;
  locationName: string;
  shiftsCount: number;
  linkedSalesCount: number;
  linkedSalesTotal: number;
}
