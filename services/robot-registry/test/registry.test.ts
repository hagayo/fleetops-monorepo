import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '@fleetops/event-bus';
import type { Robot } from '@fleetops/types';
import { createRobotRegistry, BATTERY_LOW_THRESHOLD, CHARGE_RESUME_THRESHOLD } from '../src/index';

type E = { 'robot.updated': Robot };

test('cancel semantics - user vs battery', async (t) => {
  const bus = createEventBus<E>();
  const reg = createRobotRegistry(bus);

  const id = '11111111-1111-1111-1111-111111111111' as const;
  reg.upsert({ id, status: 'en_route', batteryPct: 50, currentMissionId: 'abcd-1', reassignable: true, lastError: null, updatedAt: new Date().toISOString() });

  await t.test('user cancel -> RTB and reassignable=true', () => {
    const r = reg.cancel(id, 'user');
    assert.equal(r.status, 'returning_to_base');
    assert.equal(r.reassignable, true);
    assert.equal(r.currentMissionId, null);
  });

  await t.test('battery cancel -> RTB and reassignable=false', () => {
    reg.upsert({ id, status: 'en_route', batteryPct: 9.5, currentMissionId: 'abcd-2', reassignable: true, lastError: null, updatedAt: new Date().toISOString() });
    const r = reg.cancel(id, 'battery');
    assert.equal(r.status, 'returning_to_base');
    assert.equal(r.reassignable, false);
  });
});

test('auto low-battery cancel and charging recovery', async (t) => {
  const bus = createEventBus<E>();
  const reg = createRobotRegistry(bus, { moveDrainPerSec: 5, chargePerSec: 50 }); // accelerate test

  const id = '22222222-2222-2222-2222-222222222222' as const;
  reg.upsert({ id, status: 'en_route', batteryPct: BATTERY_LOW_THRESHOLD + 0.1, currentMissionId: 'm-1', reassignable: true, lastError: null, updatedAt: new Date().toISOString() });

  await t.test('tick below threshold -> auto battery cancel to RTB', () => {
    const r = reg.tick(id, { dtSec: 1, movement: true });
    assert.equal(r.status, 'returning_to_base');
    assert.equal(r.reassignable, false);
  });

  await t.test('RTB with low battery -> charging, then idle at threshold', () => {
    // force many seconds of charging in two ticks
    let r = reg.tick(id, { dtSec: 1, movement: false });
    assert.equal(r.status, 'charging');

    // finish charge
    const need = CHARGE_RESUME_THRESHOLD - (r.batteryPct ?? 0);
    r = reg.tick(id, { dtSec: Math.ceil(need / 50), movement: false });
    assert.equal(r.status, 'idle');
    assert.equal(r.reassignable, true);
  });
});
