import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { env } from './lib/env.js';
import { productRoutes } from './routes/products.js';
import { domainRoutes } from './routes/domains.js';
import { orderRoutes } from './routes/orders.js';
import { unitRoutes } from './routes/units.js';

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || env.WEB_ORIGIN.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.register(productRoutes);
  app.register(domainRoutes);
  app.register(orderRoutes);
  app.register(unitRoutes);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({ error: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() });
    if ((error as { code?: string }).code === '23505')
      return reply
        .code(409)
        .send({ error: 'DUPLICATE_RESOURCE', message: 'Resource already exists' });
    if ((error as { code?: string }).code === 'PRODUCT_NOT_FOUND')
      return reply
        .code(404)
        .send({ error: 'PRODUCT_NOT_FOUND', message: 'One or more products were not found' });
    if ((error as { code?: string }).code === 'PGRST205')
      return reply
        .code(503)
        .send({ error: 'DATABASE_SCHEMA_NOT_READY', message: 'Database schema is not available' });
    const databaseError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };
    app.log.error(
      {
        code: databaseError.code,
        message: databaseError.message,
        details: databaseError.details,
        hint: databaseError.hint,
      },
      'Unhandled API error',
    );
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : databaseError.message ?? 'Internal server error',
      ...(process.env.NODE_ENV === 'production' || !databaseError.code
        ? {}
        : { code: databaseError.code }),
    });
  });
  return app;
}
