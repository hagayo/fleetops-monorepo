import type { Robot } from '@fleetops/types';
import type { TypedEventBus } from '@fleetops/event-bus';

export type RegistryEvents = {
  'robot.updated': Robot;
};

export type RegistryBus = TypedEventBus<RegistryEvents>;

// simple vector for movement if you want it later
export interface Vec2 { x: number; y: number; }

export interface TickOptions {
  dtSec: number;             // delta time in seconds
  movement?: boolean;        // whether to drain battery for motion
}

export interface BatteryModel {
  moveDrainPerSec: number;   // % per second while moving
  idleDrainPerSec: number;   // % per second while idle
  chargePerSec: number;      // % per second while charging
}
