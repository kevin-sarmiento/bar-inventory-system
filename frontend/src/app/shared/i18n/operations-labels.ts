const TXN_TYPES: Record<string, string> = {
  OPENING_STOCK: 'Stock inicial',
  PURCHASE: 'Compra',
  SALE: 'Venta',
  CONSUMPTION: 'Consumo',
  WASTE: 'Merma',
  ADJUSTMENT_IN: 'Ajuste de entrada',
  ADJUSTMENT_OUT: 'Ajuste de salida',
  TRANSFER: 'Transferencia',
  RETURN_TO_SUPPLIER: 'Devolución a proveedor',
  RETURN_FROM_CUSTOMER: 'Devolución de cliente'
};

const TXN_STATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  POSTED: 'Publicado',
  CANCELLED: 'Cancelado'
};

const SALE_STATUS: Record<string, string> = {
  OPEN: 'Abierta',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada'
};

const SHIFT_STATUS: Record<string, string> = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  MISSED: 'No asistió',
  CANCELLED: 'Cancelado'
};

const COUNT_STATUS: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado'
};

export function inventoryTransactionTypeEs(code: string | null | undefined): string {
  if (!code) return '';
  return TXN_TYPES[code] ?? code;
}

export function inventoryTransactionStatusEs(code: string | null | undefined): string {
  if (!code) return '';
  return TXN_STATUS[code] ?? code;
}

export function saleStatusEs(code: string | null | undefined): string {
  if (!code) return '';
  return SALE_STATUS[code] ?? code;
}

export function shiftStatusEs(code: string | null | undefined): string {
  if (!code) return '';
  return SHIFT_STATUS[code] ?? code;
}

export function physicalCountStatusEs(code: string | null | undefined): string {
  if (!code) return '';
  return COUNT_STATUS[code] ?? code;
}

export function roleNameEs(code: string | null | undefined): string {
  if (!code) return '';
  const map: Record<string, string> = {
    ADMINISTRADOR: 'Administrador',
    GERENTE: 'Gerente',
    INVENTARIO: 'Inventario',
    CAJERO: 'Cajero',
    BARTENDER: 'Bartender'
  };
  return map[code] ?? code;
}
