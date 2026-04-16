export interface DataColumn<T> {
  key: Extract<keyof T, string> | string;
  label: string;
  type?: 'text' | 'badge' | 'boolean' | 'date' | 'currency';
}

export interface RouteMenuItem {
  label: string;
  icon: string;
  path: string;
  roles?: string[];
}
