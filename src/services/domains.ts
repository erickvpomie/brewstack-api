import { supabase } from '../lib/supabase.js';
import type { CategoryInput, SupplierInput, WarehouseInput } from '../schemas/domains.js';

const camelToSnake = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
const list = async (table: string, search?: string) => {
  let query = supabase.from(table).select('*').order('created_at', { ascending: false });
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
const create = async (table: string, input: Record<string, unknown>) => {
  const { data, error } = await supabase.from(table).insert(camelToSnake(input)).select().single();
  if (error) throw error;
  return data;
};
const update = async (table: string, id: string, input: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from(table)
    .update(camelToSnake(input))
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};
const get = async (table: string, id: string) => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
};
export const listCategories = (search?: string) => list('categories', search);
export const listWarehouses = (search?: string) => list('warehouses', search);
export async function listSuppliers(search?: string) {
  let query = supabase
    .from('suppliers')
    .select('*, product_suppliers(product:products(id, name))')
    .order('created_at', { ascending: false });
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export const createCategory = (input: CategoryInput) => create('categories', input);
export const createWarehouse = (input: WarehouseInput) => create('warehouses', input);
export const createSupplier = (input: SupplierInput) => create('suppliers', input);
export const getCategory = (id: string) => get('categories', id);
export const getWarehouse = (id: string) => get('warehouses', id);
export const getSupplier = (id: string) => get('suppliers', id);
export const updateCategory = (id: string, input: Partial<CategoryInput>) =>
  update('categories', id, input);
export const updateWarehouse = (id: string, input: Partial<WarehouseInput>) =>
  update('warehouses', id, input);
export const updateSupplier = (id: string, input: Partial<SupplierInput>) =>
  update('suppliers', id, input);

export async function listInventory(filters: Record<string, string | undefined>) {
  let query = supabase
    .from('inventory')
    .select('*, products(*), warehouses(*)')
    .order('updated_at', { ascending: false });
  for (const [key, value] of Object.entries(filters))
    if (value)
      query = query.eq(
        camelToSnake({ [key]: value })[
          key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        ] as string,
        value,
      );
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toInventoryItem);
}
const toInventoryItem = (row: Record<string, unknown>) => {
  const product = row.products as Record<string, unknown> | null;
  const warehouse = row.warehouses as Record<string, unknown> | null;
  return {
    id: row.id,
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    quantity: Number(row.quantity ?? 0),
    reserved: Number(row.reserved ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: product
      ? {
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          cost: Number(product.cost ?? 0),
          minimumStock: Number(product.minimum_stock ?? 0),
          active: product.active,
        }
      : null,
    warehouse: warehouse ? { id: warehouse.id, name: warehouse.name, code: warehouse.code } : null,
  };
};
export const createInventory = async (input: {
  productId: string;
  warehouseId: string;
  quantity: number;
}) => {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      quantity: input.quantity,
    })
    .select('*, products(*), warehouses(*)')
    .single();
  if (error) throw error;
  return toInventoryItem(data as Record<string, unknown>);
};
export const updateInventory = (id: string, input: { quantity: number }) =>
  update('inventory', id, input);
