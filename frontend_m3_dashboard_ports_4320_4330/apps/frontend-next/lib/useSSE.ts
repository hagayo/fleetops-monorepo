'use client';

export type SSEHandler = (type: string, payload: unknown) => void;

export function connectSSE(onEvent: SSEHandler) {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:4330';
  const es = new EventSource(`${base}/events`);

  es.onmessage = (e) => onEvent('message', JSON.parse(e.data));
  es.addEventListener('mission.created', (e) => onEvent('mission.created', JSON.parse((e as MessageEvent).data)));
  es.addEventListener('mission.updated', (e) => onEvent('mission.updated', JSON.parse((e as MessageEvent).data)));
  es.addEventListener('stats.updated', (e) => onEvent('stats.updated', JSON.parse((e as MessageEvent).data)));
  es.addEventListener('robot.updated', (e) => onEvent('robot.updated', JSON.parse((e as MessageEvent).data)));

  return () => es.close();
}
