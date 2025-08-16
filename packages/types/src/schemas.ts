import { z } from 'zod';

// Zod schemas
export const PositionZ = z.object({ x: z.number(), y: z.number() }).strict();
export const RobotStatusZ = z.enum([
  'idle','assigned','en_route','delivering','returning_to_base','charging','maintenance','failed',
]);
export const MissionStatusZ = z.enum([
  'pending','assigned','en_route','delivering','completed','failed','canceled',
]);
export const CancelReasonZ = z.enum(['user','battery','hardware','blocked_path','system']);

export const RobotZ = z.object({
  id: z.string().uuid(),
  status: RobotStatusZ,
  batteryPct: z.number().min(0).max(100),
  currentMissionId: z.string().uuid().nullable().optional(),
  reassignable: z.boolean(),
  lastError: z.object({ code: z.string(), message: z.string() }).nullable().optional(),
  position: PositionZ.optional(),
  updatedAt: z.string().datetime().optional(),
}).strict();

export const MissionHistoryItemZ = z.object({
  status: MissionStatusZ,
  at: z.string().datetime(),
  note: z.string().optional(),
}).strict();

export const MissionZ = z.object({
  id: z.string().uuid(),
  robotId: z.string().uuid().nullable().optional(),
  status: MissionStatusZ,
  cancelReason: CancelReasonZ.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  history: z.array(MissionHistoryItemZ).optional(),
}).strict();

export const StatsZ = z.object({
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
}).strict();

export const LoginRequestZ = z.object({
  email: z.string().email(),
  password: z.string().min(8),
}).strict();

// Named aliases for clearer imports in apps
export const PositionSchema = PositionZ;
export const RobotSchema = RobotZ;
export const MissionHistoryItemSchema = MissionHistoryItemZ;
export const MissionSchema = MissionZ;
export const StatsSchema = StatsZ;
export const LoginRequestSchema = LoginRequestZ;