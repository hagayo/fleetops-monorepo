# @fleetops/event-bus

Typed in-memory event bus for Node 22 using EventTarget. Zero deps, generic by design.

## Install
In your workspace:
```bash
pnpm -F @fleetops/event-bus build
```

## Usage
import { createEventBus } from '@fleetops/event-bus';
type Events = { 'ping': { ts: string } };
const bus = createEventBus<Events>();

const off = bus.on('ping', (e) => console.log(e.detail.ts));
bus.emit('ping', { ts: new Date().toISOString() });
off();

**With FleetOps domain:**
import type { Robot, Mission, Stats } from '@fleetops/types';
type FleetEvents = {
  'robot.updated': Robot;
  'mission.created': Mission;
  'mission.updated': Mission;
  'stats.updated': Stats;
};
export const fleetBus = createEventBus<FleetEvents>();