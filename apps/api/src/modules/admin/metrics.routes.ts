import { FastifyInstance } from 'fastify';
import { buildMetrics } from '../../services/metrics';

export async function metricsRoutes(app: FastifyInstance) {
  // Prometheus scrape endpoint — no auth (internal network only, protected by nginx)
  app.get('/metrics', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (_req, reply) => {
    const body = await buildMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return reply.send(body);
  });
}
