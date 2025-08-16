// builtin
import { createServer } from 'node:http';
import http from 'http';
import { randomUUID } from 'crypto';

// external
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { WebSocketServer } from 'ws';
import 'dotenv/config';
import { z } from 'zod';

// internal
import { createEventBus } from '@fleetops/event-bus';
import { createRobotRegistry } from '@fleetops/robot-registry';
import { MissionOrchestrator } from '@fleetops/mission-orchestrator';
import type { Robot, Mission, Stats, CancelReason } from '@fleetops/types';

// config
const PORT = Number(process.env.PORT || 4330);
const SIM_CREATE = String(process.env.SIM_CREATE || 'true') === 'true';
const requireKey: import('express').RequestHandler = (req, res, next) => {
  const key = process.env.API_KEY;
  if (!key) return next(); // auth disabled in dev unless API_KEY is set
  const provided = req.get('x-api-key');
  if (provided && provided === key) return next();
  return res.status(401).json({ success: false, message: 'unauthorized' });
};

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// shared bus + services
type Bus = {
  'robot.updated': Robot;
  'mission.created': Mission;
  'mission.updated': Mission;
  'stats.updated': Stats;
};
const bus = createEventBus<Bus>();
const registry = createRobotRegistry(bus);
const orchestrator = new MissionOrchestrator(bus, bus, {
  autoAssign: true,
  tickMs: 1000,
  blockedPathRate: 0.02,
  legSeconds: { enRoute: 4, delivering: 3 },
});
orchestrator.start();

// seed a couple robots
function seedRobot(id: string, batteryPct = 100) {
  registry.upsert({
    id,
    status: 'idle',
    batteryPct,
    currentMissionId: null,
    reassignable: true,
    lastError: null,
    updatedAt: new Date().toISOString(),
  });
}
seedRobot('11111111-1111-1111-1111-111111111111', 100);
seedRobot('22222222-2222-2222-2222-222222222222', 76);

// optional: create demo missions periodically
if (SIM_CREATE) {
  setInterval(() => {
    orchestrator.createMission();
  }, 5000);
}

// validation helpers
const IdParamZ = z.object({ id: z.string().uuid() }).strict();
const CancelBodyZ = z.object({ reason: z.enum(['user', 'battery', 'hardware', 'blocked_path', 'system']).optional() }).strict();

// health
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// robots
app.get('/robots', requireKey, (req, res) => {
  const status = req.query.status as Robot['status'] | undefined;
  const reassignable = req.query.reassignable as string | undefined;

  const list = registry.list({
    status,
    reassignable: reassignable != null ? reassignable === 'true' : undefined,
  });

  res.json({ success: true, data: list });
});

app.get('/robots/:id', requireKey, (req, res) => {
  const parse = IdParamZ.safeParse(req.params);
  if (!parse.success) return res.status(400).json({ success: false, message: 'invalid id' });

  const r = registry.get(parse.data.id);
  if (!r) return res.status(404).json({ success: false, message: 'robot not found' });
  res.json({ success: true, data: r });
});

app.post('/robots/:id/cancel', requireKey, (req, res) => {
  const p = IdParamZ.safeParse(req.params);
  const b = CancelBodyZ.safeParse(req.body ?? {});
  if (!p.success || !b.success) return res.status(400).json({ success: false, message: 'invalid input' });

  try {
    const next = registry.cancel(p.data.id, (b.data.reason as CancelReason) ?? 'user');
    return res.status(202).json({ success: true, data: { accepted: true, robotId: next.id } });
  } catch (e) {
    if ((e as Error).message.includes('not found')) return res.status(404).json({ success: false, message: 'robot not found' });
    return res.status(409).json({ success: false, message: (e as Error).message });
  }
});

// missions
app.get('/missions', requireKey, (req, res) => {
  const status = req.query.status as Mission['status'] | undefined;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

  let list = orchestrator.listMissions(status ? { status } : undefined);
  const total = list.length;
  const start = (page - 1) * limit;
  list = list.slice(start, start + limit);

  res.json({
    success: true,
    data: list,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

app.get('/missions/:id', requireKey, (req, res) => {
  const parse = IdParamZ.safeParse(req.params);
  if (!parse.success) return res.status(400).json({ success: false, message: 'invalid id' });

  const m = orchestrator.getMission(parse.data.id);
  if (!m) return res.status(404).json({ success: false, message: 'mission not found' });
  res.json({ success: true, data: m });
});

// stats
app.get('/stats', requireKey, (_req, res) => {
  res.json({ success: true, data: orchestrator.getStats() });
});

// SSE mirrors robot/mission/stats events
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const off = bus.addWildcard(
    ['robot.updated', 'mission.created', 'mission.updated', 'stats.updated'],
    (type, payload) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  );

  req.on('close', () => off());
});

// error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'server error';
  res.status(500).json({ success: false, message });
});

// WS broadcast (optional)
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  const off = bus.addWildcard(['mission.created', 'mission.updated', 'robot.updated', 'stats.updated'], (type, payload) => {
    ws.send(JSON.stringify({ type, payload }));
  });
  ws.on('close', () => off());
});

// boot
server.listen(PORT, () => {
  console.log(`[api] listening on http://127.0.0.1:${PORT}`);
});
