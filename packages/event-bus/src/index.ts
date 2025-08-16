import { ensureCustomEvent } from './polyfills';
ensureCustomEvent();

// Typed EventBus built on top of EventTarget.
// TMap is a record of event-name -> payload type.
export type EventMap = Record<string, unknown>;
type KeyOf<T> = Extract<keyof T, string>;

export type Listener<T> = (event: CustomEvent<T>) => void;

export interface EmitOptions {
  // If true, emit will not throw if no listeners
  silent?: boolean;
}

export class TypedEventBus<TMap extends EventMap> {
  private target = new EventTarget();

  on<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>, options?: AddEventListenerOptions): () => void {
    // We bind the listener through a wrapper so off() can remove it with the same ref if desired.
    this.target.addEventListener(type, listener as EventListener, options);
    return () => this.off(type, listener);
  }

  once<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>): void {
    this.target.addEventListener(type, listener as EventListener, { once: true });
  }

  off<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>): void {
    this.target.removeEventListener(type, listener as EventListener);
  }

  emit<K extends KeyOf<TMap>>(type: K, payload: TMap[K], opts?: EmitOptions): void {
    const evt = new CustomEvent<TMap[K]>(type, { detail: payload });
    const dispatched = this.target.dispatchEvent(evt);
    if (!dispatched && !opts?.silent) {
      // No listeners or one listener called preventDefault.
      // We do nothing by default to keep emission cheap.
    }
  }

  // Subscribe to any event name
  onAny(listener: (type: KeyOf<TMap>, payload: TMap[KeyOf<TMap>]) => void): () => void {
    const handler = ((e: Event) => {
      const ce = e as CustomEvent;
      listener(e.type as KeyOf<TMap>, ce.detail as TMap[KeyOf<TMap>]);
    }) as EventListener;

    // We cannot wildcard EventTarget. Instead, proxy addEventListener for each call site.
    // Provide a minimal facade: user calls addWildcard for specific names they care about.
    // For convenience we return a no-op here and expose addWildcard.
    return () => void handler;
  }

  // Utility to subscribe to a set of event names at once
  addWildcard<K extends KeyOf<TMap>>(types: K[], fn: (type: K, payload: TMap[K]) => void): () => void {
    const listeners = types.map((t) => {
      const l = ((e: CustomEvent) => fn(t, e.detail as TMap[K])) as EventListener;
      this.target.addEventListener(t, l);
      return { t, l };
    });
    return () => listeners.forEach(({ t, l }) => this.target.removeEventListener(t, l));
  }
}

// Namespace helper for event name scoping
export function withPrefix<TMap extends EventMap, P extends string>(bus: TypedEventBus<TMap>, prefix: P) {
  return {
    on<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>) {
      return bus.on<K>(`${prefix}.${type}` as K, listener);
    },
    once<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>) {
      return bus.once<K>(`${prefix}.${type}` as K, listener);
    },
    off<K extends KeyOf<TMap>>(type: K, listener: Listener<TMap[K]>) {
      return bus.off<K>(`${prefix}.${type}` as K, listener);
    },
    emit<K extends KeyOf<TMap>>(type: K, payload: TMap[K], opts?: EmitOptions) {
      return bus.emit<K>(`${prefix}.${type}` as K, payload, opts);
    }
  };
}

// Factory
export function createEventBus<TMap extends EventMap>() {
  return new TypedEventBus<TMap>();
}

// Example domain hook-up for FleetOps
// Consumers can define their own map, or reuse @fleetops/types to derive one.
/*
import type { Robot, Mission, Stats } from '@fleetops/types';

type FleetEvents = {
  'robot.updated': Robot;
  'mission.created': Mission;
  'mission.updated': Mission;
  'stats.updated': Stats;
};

export const fleetBus = createEventBus<FleetEvents>();
*/
