export function connectSSE(onEvent: (type: string, payload: unknown) => void) {
  const url = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4330') + '/events';
  const es = new EventSource(url);
  es.onmessage = (e) => onEvent('message', JSON.parse(e.data));
  es.addEventListener('robot.updated', (e) => onEvent('robot.updated', JSON.parse((e as MessageEvent).data)));
  es.addEventListener('mission.updated', (e) => onEvent('mission.updated', JSON.parse((e as MessageEvent).data)));
  es.addEventListener('stats.updated', (e) => onEvent('stats.updated', JSON.parse((e as MessageEvent).data)));
  return () => es.close();
}
