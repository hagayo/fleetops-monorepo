import { z } from 'zod';
import type { Robot, CancelReason } from '@fleetops/types';
import type { BatteryModel, RegistryBus, TickOptions } from './types';
import { BATTERY_LOW_THRESHOLD, CHARGE_RESUME_THRESHOLD, clampBattery, toCharging, toIdle, applyCancelSemantics } from './state';

const RobotIdZ = z.string().uuid();

export class RobotRegistry {
  private robots = new Map<string, Robot>();
  private bus: RegistryBus;
  private battery: BatteryModel;

  constructor(bus: RegistryBus, battery: Partial<BatteryModel> = {}) {
    this.bus = bus;
    this.battery = {
      moveDrainPerSec: battery.moveDrainPerSec ?? 0.08,  // ~8% per 100s of motion
      idleDrainPerSec: battery.idleDrainPerSec ?? 0.0,
      chargePerSec: battery.chargePerSec ?? 0.5,         // ~70s from 45% -> 80%
    };
  }

  upsert(r: Robot): Robot {
    RobotIdZ.parse(r.id);
    const merged: Robot = { ...r, reassignable: r.reassignable ?? true, updatedAt: new Date().toISOString() };
    
    this.robots.set(merged.id, merged);
    this.emit(merged);
    return merged;
  }

  get(id: string): Robot | undefined {
    RobotIdZ.parse(id);
    return this.robots.get(id);
  }

  list(filter?: { status?: Robot['status']; reassignable?: boolean }): Robot[] {
    let arr = Array.from(this.robots.values());
    if (filter?.status) arr = arr.filter(r => r.status === filter.status);
    if (filter?.reassignable != null) arr = arr.filter(r => r.reassignable === filter.reassignable);
    return arr;
  }

  assign(robotId: string, missionId: string): Robot {
    RobotIdZ.parse(robotId);
    const r = this.must(robotId);

    // Eligibility: idle or returning_to_base with reassignable=true
    const eligible = r.status === 'idle' || (r.status === 'returning_to_base' && r.reassignable);
    if (!eligible) throw new Error('robot not eligible for assignment');

    const nxt: Robot = {
      ...r,
      status: 'assigned',
      currentMissionId: missionId,
      updatedAt: new Date().toISOString()
    };
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  startEnRoute(robotId: string): Robot {
    const r = this.must(robotId);
    if (r.status !== 'assigned') throw new Error('robot must be assigned to go en_route');
    const nxt: Robot = { ...r, status: 'en_route', updatedAt: new Date().toISOString() };
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  startDelivering(robotId: string): Robot {
    const r = this.must(robotId);
    if (r.status !== 'en_route') throw new Error('robot must be en_route to start delivering');
    const nxt: Robot = { ...r, status: 'delivering', updatedAt: new Date().toISOString() };
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  completeMission(robotId: string): Robot {
    const r = this.must(robotId);
    if (r.status !== 'delivering') throw new Error('robot must be delivering to complete');
    // normalize - always RTB after completion
    const nxt: Robot = { ...r, status: 'returning_to_base', updatedAt: new Date().toISOString() };
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  cancel(robotId: string, reason: CancelReason | 'user' = 'user'): Robot {
    const r = this.must(robotId);
    const nxt = applyCancelSemantics(r, reason);
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  setHardwareIssue(robotId: string, message = 'hardware'): Robot {
    const r = this.must(robotId);
    const nxt: Robot = {
      ...r,
      status: 'maintenance',
      reassignable: false,
      lastError: { code: 'hardware', message },
      currentMissionId: null,
      updatedAt: new Date().toISOString()
    };
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  clearMaintenance(robotId: string): Robot {
    const r = this.must(robotId);
    const nxt = toIdle({ ...r, lastError: null });
    this.robots.set(nxt.id, nxt);
    this.emit(nxt);
    return nxt;
  }

  // Simulation tick: battery & state progression
  tick(robotId: string, opts: TickOptions): Robot {
    const rStart = this.must(robotId);           // status at tick start
    let r = { ...rStart };

    // Battery drain or charge
    if (r.status === 'charging') {
      r.batteryPct = clampBattery(r.batteryPct + this.battery.chargePerSec * opts.dtSec);
    } else {
      const moving = opts.movement && (r.status === 'en_route' || r.status === 'delivering' || r.status === 'returning_to_base');
      const drain = moving ? this.battery.moveDrainPerSec : this.battery.idleDrainPerSec;
      r.batteryPct = clampBattery(r.batteryPct - drain * opts.dtSec);
    }

    // Auto-cancel on low battery during active legs
    const activeLeg = 
      r.status === 'assigned' || r.status === 'en_route' || r.status === 'delivering' || r.status === 'returning_to_base';
    if (activeLeg && r.batteryPct < BATTERY_LOW_THRESHOLD) {
      // becomes returning_to_base, reassignable false for battery reason
      r = applyCancelSemantics(r, 'battery');
    }

    // IMPORTANT: Only transition RTB -> charging if the robot was already RTB at the start of the tick.
    // This prevents immediate RTB->charging in the same tick that triggered low-battery cancel.
    if (r.status === 'returning_to_base' && rStart.status === 'returning_to_base' && r.batteryPct < CHARGE_RESUME_THRESHOLD) {
      r = toCharging(r);
    }

    // Charging -> idle when threshold reached
    if (r.status === 'charging' && r.batteryPct >= CHARGE_RESUME_THRESHOLD) {
      r = toIdle(r);
    }

    r.updatedAt = new Date().toISOString();
    this.robots.set(r.id, r);
    if (r !== rStart) this.emit(r);
    return r;
  }

  private must(id: string): Robot {
    const r = this.robots.get(id);
    if (!r) throw new Error('robot not found');
    return r;
  }

  private emit(r: Robot) {
    this.bus.emit('robot.updated', r);
  }
}
