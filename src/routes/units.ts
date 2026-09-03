import type { FastifyInstance } from 'fastify';
import { listUnits } from '../services/units.js';

export async function unitRoutes(app: FastifyInstance) {
  app.get('/api/units', async () => listUnits());
}
