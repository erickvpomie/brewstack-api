import type { FastifyInstance } from 'fastify';
import {
  orderBodySchema,
  orderIdSchema,
  orderPatchSchema,
  orderQuerySchema,
} from '../schemas/order.js';
import * as orders from '../services/orders.js';

export async function orderRoutes(app: FastifyInstance) {
  app.get('/api/orders', async (request) =>
    orders.listOrders(orderQuerySchema.parse(request.query).status),
  );
  app.get('/api/orders/:id', async (request, reply) => {
    const order = await orders.getOrder(orderIdSchema.parse(request.params).id);
    if (!order)
      return reply.code(404).send({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return order;
  });
  app.post('/api/orders', async (request, reply) =>
    reply.code(201).send(await orders.createOrder(orderBodySchema.parse(request.body))),
  );
  app.patch('/api/orders/:id', async (request, reply) => {
    const order = await orders.updateOrder(
      orderIdSchema.parse(request.params).id,
      orderPatchSchema.parse(request.body),
    );
    if (!order)
      return reply.code(404).send({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return order;
  });
  app.delete('/api/orders/:id', async (request, reply) => {
    const deleted = await orders.deleteOrder(orderIdSchema.parse(request.params).id);
    if (!deleted)
      return reply.code(404).send({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return reply.code(204).send();
  });
}
