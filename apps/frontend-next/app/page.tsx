// Server component that fetches initial data and renders the client dashboard
import { listMissions, getStats } from '../lib/api';
import Dashboard from './components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [missionsRes, statsRes] = await Promise.all([
    listMissions().catch(() => ({ success: false, data: [] as any[] } as any)),
    getStats().catch(() => ({ success: false, data: { completed: 0, failed: 0, active: 0 } } as any)),
  ]);

  const missions = (missionsRes as any).data ?? [];
  const stats = (statsRes as any).data ?? { completed: 0, failed: 0, active: 0 };

  return <Dashboard initialMissions={missions} initialStats={stats} />;
}
