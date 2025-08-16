import test from 'node:test';
import assert from 'node:assert/strict';

import { createEventBus } from '@fleetops/event-bus';
import type { Robot, Mission, Stats } from '@fleetops/types';
import { MissionOrchestrator } from '../src/orchestrator';

// simple stub registry bus that we can emit robot updates into
type RBus = ReturnType<typeof createEventBus<{ 'robot.updated': Robot }>>;
type EBus = ReturnType<typeof createEventBus<{ 'mission.created': Mission; 'mission.updated': Mission; 'stats.updated': Stats }>>;

function seedRobot(id: string): Robot {
  return {
    id,
    status: 'idle',
    batteryPct: 100,
    currentMissionId: null,
    reassignable: true,
    lastError: null,
    updatedAt: new Date().toISOString()
  };
}

test('create -> assign -> complete increments stats', async (t) => {
  const rbus: RBus = createEventBus();
  const ebus: EBus = createEventBus();
  const orch = new MissionOrchestrator(ebus, rbus, { autoAssign: true, tickMs: 10, blockedPathRate: 0 });

  // listen to stats
  let latestStats: Stats | null = null;
  ebus.on('stats.updated', e => latestStats = e.detail);

  // seed one robot and mission
  const robot: Robot = seedRobot('11111111-1111-1111-1111-111111111111');
  rbus.emit('robot.updated', robot);

  // create a mission
  const m = orch.createMission();

  // assign it - orchestrator will mark assigned, we pretend robot picks it up
  orch.tryAssign();

  // bind mission id to robot and simulate progress
  const assigned = orch.listMissions({ status: 'assigned' })[0];
  assert.ok(assigned);
  const mId = assigned.id;

  // en_route
  ebus.on('mission.updated', e => {
    if (e.detail.status === 'en_route') {
      rbus.emit('robot.updated', { ...robot, status: 'en_route', currentMissionId: mId, batteryPct: 100 });
    }
    if (e.detail.status === 'delivering') {
      rbus.emit('robot.updated', { ...robot, status: 'delivering', currentMissionId: mId, batteryPct: 100 });
    }
    if (e.detail.status === 'completed') {
      rbus.emit('robot.updated', { ...robot, status: 'returning_to_base', currentMissionId: mId, batteryPct: 75 });
    }
  });

  orch.start();
  await new Promise(r => setTimeout(r, 120)); // a few ticks at 10ms
  orch.stop();

  const done = orch.listMissions({ status: 'completed' })[0];
  assert.ok(done, 'mission should complete');
  assert.ok(latestStats && latestStats.completed >= 1, 'stats should increment completed');
});

test('blocked path failure', async () => {
  const rbus: RBus = createEventBus();
  const ebus: EBus = createEventBus();
  const orch = new MissionOrchestrator(ebus, rbus, { autoAssign: true, tickMs: 5, blockedPathRate: 1 });

  const robot: Robot = seedRobot('22222222-2222-2222-2222-222222222222');
  rbus.emit('robot.updated', robot);
  
  const m = orch.createMission();
  orch.tryAssign();

  // bind mission id to robot via events
  const assigned = orch.listMissions({ status: 'assigned' })[0];
  const mId = assigned.id;

  ebus.on('mission.updated', e => {
    if (e.detail.status === 'en_route') {
      rbus.emit('robot.updated', { ...robot, status: 'en_route', currentMissionId: mId, batteryPct: 100 });
    }
  });

  orch.start();
  await new Promise(r => setTimeout(r, 50));
  orch.stop();

  const failed = orch.listMissions({ status: 'failed' })[0];
  assert.ok(failed, 'mission should fail due to blocked_path');
});
