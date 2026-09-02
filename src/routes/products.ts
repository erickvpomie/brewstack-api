import type { FastifyInstance } from 'fastify';
import {
  productBodySchema,
  productIdSchema,
  productPatchSchema,
  productQuerySchema,
} from '../schemas/product.js';
import * as products from '../services/products.js';

export async function productRoutes(app: FastifyInstance) {
  app.get('/api/products', async (request) =>
    products.listProducts(productQuerySchema.parse(request.query).search),
  );
  app.get('/api/products/:id', async (request, reply) => {
    const product = await products.getProduct(productIdSchema.parse(request.params).id);
    if (!product)
      return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    return product;
  });
  app.post('/api/products', async (request, reply) =>
    reply.code(201).send(await products.createProduct(productBodySchema.parse(request.body))),
  );
  app.patch('/api/products/:id', async (request, reply) => {
    const product = await products.updateProduct(
      productIdSchema.parse(request.params).id,
      productPatchSchema.parse(request.body),
    );
    if (!product)
      return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    return product;
  });
}
