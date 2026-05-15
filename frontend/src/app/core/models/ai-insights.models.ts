export type AiAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AiAlertType =
  | 'LOW_STOCK'
  | 'EXPIRATION_RISK'
  | 'WASTE_ANOMALY'
  | 'COUNT_DIFFERENCE'
  | 'PENDING_INVENTORY_POSTING';

export interface AiAlertDto {
  type: AiAlertType | string;
  severity: AiAlertSeverity | string;
  title: string;
  message: string;
  recommendedAction: string;
  productId?: number | null;
  productName?: string | null;
  locationId?: number | null;
  locationName?: string | null;
  baseUnit?: string | null;
  quantity?: number | null;
  threshold?: number | null;
  referenceValue?: number | null;
  dueDate?: string | null;
  priorityScore?: number | null;
}

export interface AiReplenishmentSuggestionDto {
  productId: number;
  productName: string;
  locationId: number;
  locationName: string;
  baseUnit: string;
  currentStock: number;
  minStockBaseQty: number;
  averageDailyConsumption: number;
  daysCoverage?: number | null;
  recommendedQty: number;
  estimatedCost: number;
  priority: AiAlertSeverity | string;
  priorityScore: number;
  reason: string;
}

export interface AiInsightsMetricsDto {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  lowStockAlerts: number;
  expirationAlerts: number;
  wasteAlerts: number;
  countDifferenceAlerts: number;
  replenishmentSuggestions: number;
  estimatedReplenishmentCost: number;
  topPriority: string;
}

export interface AiInsightsResponseDto {
  fromDate: string;
  toDate: string;
  locationId?: number | null;
  locationName?: string | null;
  generatedAt: string;
  executiveSummary: string;
  metrics: AiInsightsMetricsDto;
  alerts: AiAlertDto[];
  replenishmentSuggestions: AiReplenishmentSuggestionDto[];
}

export interface AiChatRequestDto {
  message: string;
  from?: string;
  to?: string;
  locationId?: number;
  /** Si es true, el backend consulta SearxNG (si esta configurado) y anade extractos al prompt. */
  useWebSearch?: boolean;
}

export interface AiChatResponseDto {
  answer: string;
  model: string;
  generatedAt: string;
  contextSummary: string;
  webSearchUsed?: boolean;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  generatedAt?: string;
  model?: string;
  webSearchUsed?: boolean;
}
