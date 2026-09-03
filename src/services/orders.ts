import { supabase } from '../lib/supabase.js';
import type { Order, OrderItem, Product } from '../types.js';
import type { OrderBody, OrderPatch } from '../schemas/order.js';

type Row = Record<string, unknown>;
const orderSelect =
  'id, status, notes, total, created_at, updated_at, order_items(id, product_id, quantity, unit_cost, line_total, product:products(*, product_suppliers(supplier:suppliers(id, name))))';
const toProduct = (row: Row): Product => ({
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
  suppliers: ((row.product_suppliers as Row[] | undefined) ?? [])
    .map((item) => item.supplier as Row | undefined)
    .filter((supplier): supplier is Row => Boolean(supplier))
    .map((supplier) => ({ id: supplier.id as string, name: supplier.name as string })),
  warehouses: [],
});
const toOrder = (row: Row): Order => ({
  id: row.id as string,
  status: row.status as Order['status'],
  notes: row.notes as string,
  total: Number(row.total),
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  items: ((row.order_items as Row[] | undefined) ?? []).map((item): OrderItem => ({
    id: item.id as string,
    productId: item.product_id as string,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost),
    lineTotal: Number(item.line_total),
    product: toProduct(item.product as Row),
  })),
});
async function load(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toOrder(data as Row) : null;
}
export async function listOrders(status?: Order['status']) {
  let query = supabase.from('orders').select(orderSelect).order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Row[]).map(toOrder);
}
export const getOrder = load;
export async function createOrder(input: OrderBody) {
  const ids = input.items.map((item) => item.productId);
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .in('id', ids);
  if (productError) throw productError;
  const productMap = new Map((products as Row[]).map((product) => [product.id as string, product]));
  if (productMap.size !== new Set(ids).size)
    throw Object.assign(new Error('One or more products were not found'), {
      code: 'PRODUCT_NOT_FOUND',
    });
  const items = input.items.map((item) => {
    const product = productMap.get(item.productId) as Row;
    const unitCost = Number(product.cost);
    return {
      product_id: item.productId,
      quantity: item.quantity,
      unit_cost: unitCost,
      line_total: Math.round(unitCost * item.quantity * 100) / 100,
    };
  });
  const total = Math.round(items.reduce((sum, item) => sum + item.line_total, 0) * 100) / 100;
  const { data: order, error } = await supabase
    .from('orders')
    .insert({ status: input.status, notes: input.notes, total })
    .select('id')
    .single();
  if (error) throw error;
  const { error: itemError } = await supabase
    .from('order_items')
    .insert(items.map((item) => ({ ...item, order_id: order.id })));
  if (itemError) throw itemError;
  const result = await load(order.id);
  if (!result) throw new Error('Order could not be loaded');
  return result;
}
export async function updateOrder(id: string, input: OrderPatch) {
  if (input.items) {
    const ids = input.items.map((item) => item.productId);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);
    if (productError) throw productError;
    const productMap = new Map((products as Row[]).map((product) => [product.id as string, product]));
    if (productMap.size !== new Set(ids).size)
      throw Object.assign(new Error('One or more products were not found'), {
        code: 'PRODUCT_NOT_FOUND',
      });
    const items = input.items.map((item) => {
      const product = productMap.get(item.productId) as Row;
      const unitCost = Number(product.cost);
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_cost: unitCost,
        line_total: Math.round(unitCost * item.quantity * 100) / 100,
      };
    });
    const total = Math.round(items.reduce((sum, item) => sum + item.line_total, 0) * 100) / 100;
    const { error: removeItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);
    if (removeItemsError) throw removeItemsError;
    const { error: itemError } = await supabase
      .from('order_items')
      .insert(items.map((item) => ({ ...item, order_id: id })));
    if (itemError) throw itemError;
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        total,
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data ? load(id) : null;
  }

  const { items: _items, ...orderFields } = input;
  const { data, error } = await supabase
    .from('orders')
    .update(orderFields)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data ? load(id) : null;
}

export async function deleteOrder(id: string) {
  const { data: existing, error: lookupError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) return false;

  // Remove the dependent rows explicitly so deletion also works when the
  // production database was created before the cascade constraint existed.
  const { error: itemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id);
  if (itemsError) throw itemsError;

  const { error: deleteError } = await supabase.from('orders').delete().eq('id', id);
  if (deleteError) throw deleteError;
  return true;
}
