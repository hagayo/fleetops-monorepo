import type { RegistryBus } from './types';
import type { BatteryModel } from './types';
import { RobotRegistry } from './registry';

export * from './types';
export * from './state';
export * from './registry';

export function createRobotRegistry(bus: RegistryBus, battery?: Partial<BatteryModel>) {
  return new RobotRegistry(bus, battery);
}
