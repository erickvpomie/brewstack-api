import { supabase } from '../lib/supabase.js';
import type { Product, ProductInput } from '../types.js';

type ProductRow = Record<string, unknown>;
const productSelect =
  '*, product_suppliers(supplier:suppliers(id, name)), inventory(warehouse:warehouses(id, name), quantity)';
const toProduct = (row: ProductRow): Product => ({
  id: row.id as string,
  name: row.name as string,
  description: row.description as string,
  category: row.category as string,
  unit: row.unit as string,
  cost: Number(row.cost),
  minimumStock: Number(row.minimum_stock),
  active: row.active as boolean,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  suppliers: ((row.product_suppliers as ProductRow[] | undefined) ?? [])
    .map((item) => item.supplier as ProductRow | undefined)
    .filter((supplier): supplier is ProductRow => Boolean(supplier))
    .map((supplier) => ({ id: supplier.id as string, name: supplier.name as string })),
  warehouses: ((row.inventory as ProductRow[] | undefined) ?? [])
    .map((item) => {
      const warehouse = item.warehouse as ProductRow | undefined;
      return warehouse
        ? {
            id: warehouse.id as string,
            name: warehouse.name as string,
            quantity: Number(item.quantity ?? 0),
          }
        : null;
    })
    .filter((warehouse): warehouse is { id: string; name: string; quantity: number } =>
      Boolean(warehouse),
    ),
});
const toRow = (input: Partial<ProductInput>) => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.description === undefined ? {} : { description: input.description }),
  ...(input.category === undefined ? {} : { category: input.category }),
  ...(input.unit === undefined ? {} : { unit: input.unit }),
  ...(input.cost === undefined ? {} : { cost: input.cost }),
  ...(input.minimumStock === undefined ? {} : { minimum_stock: input.minimumStock }),
  ...(input.active === undefined ? {} : { active: input.active }),
});
async function syncSuppliers(productId: string, supplierIds: string[]) {
  const { error: deleteError } = await supabase
    .from('product_suppliers')
    .delete()
    .eq('product_id', productId);
  if (deleteError) throw deleteError;
  if (!supplierIds.length) return;
  const { error } = await supabase
    .from('product_suppliers')
    .insert(supplierIds.map((supplierId) => ({ product_id: productId, supplier_id: supplierId })));
  if (error) throw error;
}
async function syncWarehouses(productId: string, warehouseIds: string[]) {
  const { data: current, error: currentError } = await supabase
    .from('inventory')
    .select('warehouse_id')
    .eq('product_id', productId);
  if (currentError) throw currentError;
  const selected = new Set(warehouseIds);
  const removed = (current ?? [])
    .map((row) => row.warehouse_id as string)
    .filter((id) => !selected.has(id));
  if (removed.length) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('product_id', productId)
      .in('warehouse_id', removed);
    if (error) throw error;
  }
  const existing = new Set((current ?? []).map((row) => row.warehouse_id as string));
  const additions = warehouseIds
    .filter((id) => !existing.has(id))
    .map((warehouse_id) => ({ product_id: productId, warehouse_id, quantity: 0 }));
  if (additions.length) {
    const { error } = await supabase.from('inventory').insert(additions);
    if (error) throw error;
  }
}

export async function listProducts(search?: string): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(productSelect)
    .order('created_at', { ascending: false });
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data as ProductRow[]).map(toProduct);
}
export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : null;
}
export async function createProduct(input: ProductInput): Promise<Product> {
  const { supplierIds = [], warehouseIds = [], ...productInput } = input;
  const { data, error } = await supabase
    .from('products')
    .insert(toRow(productInput))
    .select(productSelect)
    .single();
  if (error) throw error;
  await syncSuppliers((data as ProductRow).id as string, supplierIds);
  await syncWarehouses((data as ProductRow).id as string, warehouseIds);
  const product = await getProduct((data as ProductRow).id as string);
  if (!product) throw new Error('Product could not be loaded');
  return product;
}
export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<Product | null> {
  const { supplierIds, warehouseIds, ...productInput } = input;
  const { data, error } = await supabase
    .from('products')
    .update(toRow(productInput))
    .eq('id', id)
    .select(productSelect)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (supplierIds !== undefined) await syncSuppliers(id, supplierIds);
  if (warehouseIds !== undefined) await syncWarehouses(id, warehouseIds);
  return getProduct(id);
}
