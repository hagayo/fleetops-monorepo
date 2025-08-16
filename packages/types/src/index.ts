// Re-export core TS types and interfaces
export * from './core';

// Re-export Zod schemas with safe names to avoid clashing with TS interfaces
export {
  PositionZ,
  RobotStatusZ,
  MissionStatusZ,
  CancelReasonZ,
  RobotZ,
  MissionHistoryItemZ,
  MissionZ,
  StatsZ,
  LoginRequestZ,
  // Aliases with *Schema suffix for convenience
  PositionSchema,
  RobotSchema,
  MissionHistoryItemSchema,
  MissionSchema,
  StatsSchema,
  LoginRequestSchema,
} from './schemas';