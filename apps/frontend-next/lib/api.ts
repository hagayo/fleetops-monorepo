// apps/frontend-next/lib/api.ts
import type { paths } from '@fleetops/types/src/generated';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:4330';

type Missions200 = paths['/missions']['get']['responses']['200']['content']['application/json'];
type Stats200 = paths['/stats']['get']['responses']['200']['content']['application/json'];

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText} - ${msg}`);
  }
  return res.json() as Promise<T>;
}

export async function listMissions() {
  return http<Missions200>('/missions');
}

export async function getStats() {
  return http<Stats200>('/stats');
}
