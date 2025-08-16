// apps/frontend-next/lib/api.ts
import type { paths } from '@fleetops/types/src/generated';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:4330';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

type Missions200 = paths['/missions']['get']['responses']['200']['content']['application/json'];
type Stats200 = paths['/stats']['get']['responses']['200']['content']['application/json'];

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(init?.headers as any) };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

export async function listMissions() {
  return http<Missions200>('/missions');
}

export async function getStats() {
  return http<Stats200>('/stats');
}
