import { randomUUID } from 'crypto';
import { z } from 'zod';

import type { Mission, Stats, CancelReason, Robot } from '@fleetops/types';
import type { OrchestratorBus, OrchestratorOptions, InternalMissionMeta } from './types';
import { createRobotRegistry, BATTERY_LOW_THRESHOLD } from '@fleetops/robot-registry';
import type { RegistryBus } from '@fleetops/robot-registry';
import { createEventBus } from '@fleetops/event-bus';

const MissionIdZ = z.string().uuid();

type EffectiveOptions = {
  autoAssign: boolean;
  tickMs: number;
  blockedPathRate: number;
  legSeconds: { enRoute: number; delivering: number };
};

export class MissionOrchestrator {
  private bus: OrchestratorBus;
  private registryBus: RegistryBus;
  private missions = new Map<string, Mission>();
  private meta = new Map<string, InternalMissionMeta>();
  private robots = new Map<string, Robot>();     // add this
  private stats: Stats = { completed: 0, failed: 0, active: 0 };
  private options: EffectiveOptions;
  private timer: NodeJS.Timeout | null = null;

  constructor(bus: OrchestratorBus, registryBus: RegistryBus, options?: OrchestratorOptions) {
    this.bus = bus;
    this.registryBus = registryBus;
    this.registryBus.on('robot.updated', (e) => this.onRobotUpdated(e.detail));

    this.options = {
      autoAssign: options?.autoAssign ?? true,
      tickMs: options?.tickMs ?? 1000,
      blockedPathRate: options?.blockedPathRate ?? 0.02,
      legSeconds: {
        enRoute: options?.legSeconds?.enRoute ?? 4,
        delivering: options?.legSeconds?.delivering ?? 3
      }
    };

    // listen to robots to react to low battery or maintenance
    this.registryBus.on('robot.updated', (e) => this.onRobotUpdated(e.detail));
  }

  private snapshotRobots(): Robot[] {
    return Array.from(this.robots.values());
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.options.tickMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  getStats(): Stats {
    return this.stats;
  }

  listMissions(filter?: { status?: Mission['status'] }): Mission[] {
    let arr = Array.from(this.missions.values());
    if (filter?.status) arr = arr.filter(m => m.status === filter.status);
    return arr;
  }

  getMission(id: string): Mission | undefined {
    MissionIdZ.parse(id);
    return this.missions.get(id);
  }

  createMission(): Mission {
    const id = randomUUID();
    const now = new Date().toISOString();
    const m: Mission = {
      id,
      robotId: null,
      status: 'pending',
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pending', at: now }]
    };
    this.missions.set(id, m);
    this.emit('mission.created', m);
    this.bumpStats();
    if (this.options.autoAssign) this.tryAssign();
    return m;
  }

  cancelMission(id: string, reason: CancelReason | 'user' = 'user'): Mission {
    const m0 = this.must(id);
    if (m0.status === 'completed' || m0.status === 'failed' || m0.status === 'canceled') return m0;

    const now = new Date().toISOString();
    const m: Mission = {
      ...m0,
      status: 'canceled',
      cancelReason: reason,
      updatedAt: now,
      history: [...(m0.history ?? []), { status: 'canceled', at: now, note: String(reason) }]
    };
    this.missions.set(m.id, m);
    // also cancel robot assignment semantics via registry bus consumer
    if (m.robotId) {
      // downstream service should handle the cancel, we just emit a semantics event through robot API in real system.
      // here we only mark mission cancelled.
    }
    this.emit('mission.updated', m);
    this.bumpStats();
    return m;
  }

  // Assign pending missions to first eligible robot
  tryAssign(): void {
    const pending = this.listMissions({ status: 'pending' });
    if (!pending.length) return;

    // naive eligibility: idle or RTB with reassignable=true
    const available = this.snapshotRobots().find(r =>
      r.status === 'idle' || (r.status === 'returning_to_base' && r.reassignable)
    );
    if (!available) return;

    const m0 = pending[0];
    const now = new Date().toISOString();
    const m: Mission = {
      ...m0,
      robotId: available.id,
      status: 'assigned',
      updatedAt: now,
      history: [...(m0.history ?? []), { status: 'assigned', at: now }]
    };
    this.missions.set(m.id, m);
    this.meta.set(m.id, {
      enRouteLeft: this.options.legSeconds.enRoute,
      deliveringLeft: this.options.legSeconds.delivering
    });
    this.emit('mission.updated', m);
    this.bumpStats();
  }

  // tick progresses assigned missions, simulates failures
  private tick(): void {
    // progress assigned -> en_route -> delivering -> completed
    for (const m of this.missions.values()) {
      if (!m.robotId) continue;
      if (m.status === 'completed' || m.status === 'failed' || m.status === 'canceled') continue;

      // random blocked_path failure during en_route
      if (m.status === 'en_route' && Math.random() < this.options.blockedPathRate) {
        this.failMission(m.id, 'blocked_path');
        continue;
      }

      const meta = this.meta.get(m.id) ?? {};
      if (m.status === 'assigned') {
        // enter en_route
        this.update(m.id, { status: 'en_route' });
      } else if (m.status === 'en_route') {
        const currentEnRoute = meta.enRouteLeft ?? this.options.legSeconds.enRoute;
        meta.enRouteLeft = currentEnRoute - 1;
        if (meta.enRouteLeft <= 0) {
          this.update(m.id, { status: 'delivering' });
        }
      } else if (m.status === 'delivering') {
        const currentDelivering = meta.deliveringLeft ?? this.options.legSeconds.delivering;
        meta.deliveringLeft = currentDelivering - 1;
        if (meta.deliveringLeft <= 0) {
          this.update(m.id, { status: 'completed' });
        }
      }
      this.meta.set(m.id, meta);
    }

    // periodically try to assign any remaining pending missions
    if (this.options.autoAssign) this.tryAssign();
  }

  private failMission(id: string, reason: CancelReason): void {
    const m0 = this.must(id);
    const now = new Date().toISOString();
    const m: Mission = {
      ...m0,
      status: 'failed',
      cancelReason: reason,
      updatedAt: now,
      history: [...(m0.history ?? []), { status: 'failed', at: now, note: String(reason) }]
    };
    this.missions.set(id, m);
    this.emit('mission.updated', m);
    this.bumpStats();
  }

  private update(id: string, patch: Partial<Pick<Mission, 'status' | 'robotId'>>): void {
    const m0 = this.must(id);
    const now = new Date().toISOString();
    const m: Mission = {
      ...m0,
      ...patch,
      updatedAt: now,
      history: [...(m0.history ?? []), { status: patch.status ?? m0.status, at: now }]
    };
    this.missions.set(id, m);
    this.emit('mission.updated', m);
    this.bumpStats();
  }

  // react to robot updates: if robot goes to RTB due to battery/hardware while mission active -> mark failed
  private onRobotUpdated(r: Robot) {
    // cache latest robot state
    this.robots.set(r.id, r);

    if (!r.currentMissionId) return;
    const m = this.missions.get(r.currentMissionId);
    if (!m) return;
    if (m.status === 'completed' || m.status === 'failed' || m.status === 'canceled') return;

    // if robot battery dips below threshold during an active leg -> treat as failed(battery)
    if (r.batteryPct < BATTERY_LOW_THRESHOLD && r.status === 'returning_to_base') {
      this.failMission(m.id, 'battery');
    }
    if (r.status === 'maintenance') {
      this.failMission(m.id, 'hardware');
    }
  }

  private bumpStats() {
    const completed = this.count('completed');
    const failed = this.count('failed');
    const active = this.count('assigned') + this.count('en_route') + this.count('delivering') + this.count('pending');
    const next: Stats = { completed, failed, active };
    if (JSON.stringify(next) !== JSON.stringify(this.stats)) {
      this.stats = next;
      this.emit('stats.updated', this.stats);
    }
  }

  private count(status: Mission['status']) {
    let c = 0;
    for (const m of this.missions.values()) if (m.status === status) c++;
    return c;
  }

  private must(id: string): Mission {
    MissionIdZ.parse(id);
    const m = this.missions.get(id);
    if (!m) throw new Error('mission not found');
    return m;
  }

  private emit<T extends keyof OrchestratorEvents>(type: T, payload: OrchestratorEvents[T]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - type mapping is in src/types.ts import side
    this.bus.emit(type, payload);
  }
}

type OrchestratorEvents = {
  'mission.created': Mission;
  'mission.updated': Mission;
  'stats.updated': Stats;
};
