import type { Robot, CancelReason } from '@fleetops/types';

export const BATTERY_LOW_THRESHOLD = 10;   // < 10% triggers auto-cancel -> RTB
export const CHARGE_RESUME_THRESHOLD = 80; // >= 80% -> idle + reassignable=true

// enforce cancel semantics
export function applyCancelSemantics(r: Robot, reason: CancelReason | 'user'): Robot {
  const isHard = reason === 'battery' || reason === 'hardware';
  return {
    ...r,
    status: 'returning_to_base',
    currentMissionId: null,
    reassignable: !isHard,
    lastError: reason === 'user' ? null : { code: String(reason), message: reason },
    updatedAt: new Date().toISOString()
  };
}

export function toIdle(r: Robot): Robot {
  return {
    ...r,
    status: 'idle',
    reassignable: true,
    updatedAt: new Date().toISOString()
  };
}

export function toCharging(r: Robot): Robot {
  return {
    ...r,
    status: 'charging',
    reassignable: false,
    updatedAt: new Date().toISOString()
  };
}

export function clampBattery(pct: number): number {
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return parseFloat(pct.toFixed(3));
}
