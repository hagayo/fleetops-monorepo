import type { Robot, Mission, Stats } from '@fleetops/types';
import type { TypedEventBus } from '@fleetops/event-bus';

export type OrchestratorEvents = {
  'mission.created': Mission;
  'mission.updated': Mission;
  'stats.updated': Stats;
};

export type OrchestratorBus = TypedEventBus<OrchestratorEvents>;

export interface OrchestratorOptions {
  autoAssign?: boolean;
  tickMs?: number;              // how often to progress missions
  blockedPathRate?: number;     // 0..1 probability per in-flight mission per tick
  legSeconds?: {                // durations for each leg in seconds
    enRoute?: number;
    delivering?: number;
  };
}

export interface InternalMissionMeta {
  // simple lifecyle timers
  enRouteLeft?: number;
  deliveringLeft?: number;
}
