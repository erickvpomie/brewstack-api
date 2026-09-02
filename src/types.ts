export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  cost: number;
  minimumStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  suppliers: Array<{ id: string; name: string }>;
  warehouses: Array<{ id: string; name: string; quantity: number }>;
};

export type ProductInput = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'suppliers' | 'warehouses'
> & {
  supplierIds: string[];
  warehouseIds: string[];
};

export type OrderStatus = 'pending' | 'approved' | 'received' | 'cancelled';
export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  product: Product;
};
export type Order = {
  id: string;
  status: OrderStatus;
  notes: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};
