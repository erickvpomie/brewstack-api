import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  categorySchema,
  idSchema,
  inventoryCreateSchema,
  inventoryQuerySchema,
  inventoryUpdateSchema,
  listQuerySchema,
  supplierSchema,
  warehouseSchema,
} from '../schemas/domains.js';
import * as service from '../services/domains.js';

const crud = <T>(
  app: FastifyInstance,
  path: string,
  methods: {
    list: (search?: string) => Promise<unknown>;
    get: (id: string) => Promise<unknown>;
    create: (input: T) => Promise<unknown>;
    update: (id: string, input: Partial<T>) => Promise<unknown>;
  },
  schema: z.ZodObject<z.ZodRawShape>,
  patchSchema: z.ZodObject<z.ZodRawShape>,
) => {
  app.get(`/api/${path}`, async (request) =>
    methods.list(listQuerySchema.parse(request.query).search),
  );
  app.get(`/api/${path}/:id`, async (request, reply) => {
    const value = await methods.get(idSchema.parse(request.params).id);
    if (!value)
      return reply.code(404).send({
        error: `${path.slice(0, -1).toUpperCase()}_NOT_FOUND`,
        message: `${path} not found`,
      });
    return value;
  });
  app.post(`/api/${path}`, async (request, reply) =>
    reply.code(201).send(await methods.create(schema.parse(request.body) as T)),
  );
  app.patch(`/api/${path}/:id`, async (request, reply) => {
    const value = await methods.update(
      idSchema.parse(request.params).id,
      patchSchema.parse(request.body) as Partial<T>,
    );
    if (!value)
      return reply.code(404).send({
        error: `${path.slice(0, -1).toUpperCase()}_NOT_FOUND`,
        message: `${path} not found`,
      });
    return value;
  });
};

export async function domainRoutes(app: FastifyInstance) {
  crud(
    app,
    'categories',
    {
      list: service.listCategories,
      get: service.getCategory,
      create: service.createCategory,
      update: service.updateCategory,
    },
    categorySchema,
    categorySchema.partial(),
  );
  crud(
    app,
    'warehouses',
    {
      list: service.listWarehouses,
      get: service.getWarehouse,
      create: service.createWarehouse,
      update: service.updateWarehouse,
    },
    warehouseSchema,
    warehouseSchema.partial(),
  );
  crud(
    app,
    'suppliers',
    {
      list: service.listSuppliers,
      get: service.getSupplier,
      create: service.createSupplier,
      update: service.updateSupplier,
    },
    supplierSchema,
    supplierSchema.partial(),
  );
  app.get('/api/inventory', async (request) =>
    service.listInventory(inventoryQuerySchema.parse(request.query)),
  );
  app.post('/api/inventory', async (request, reply) =>
    reply.code(201).send(await service.createInventory(inventoryCreateSchema.parse(request.body))),
  );
  app.patch('/api/inventory/:id', async (request) =>
    service.updateInventory(
      idSchema.parse(request.params).id,
      inventoryUpdateSchema.parse(request.body),
    ),
  );
}
