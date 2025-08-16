'use client';

import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';

import TopAppBar from './TopAppBar';
import StatsBar from './StatsBar';
import MissionsTable from './MissionsTable';
import { connectSSE } from '../../lib/useSSE';

type Mission = {
  id: string;
  robotId?: string | null;
  status: 'pending' | 'assigned' | 'en_route' | 'delivering' | 'completed' | 'failed' | 'canceled';
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  history?: { status: string; at: string; note?: string }[];
};

type Stats = { completed: number; failed: number; active: number };

export default function Dashboard(props: { initialMissions: Mission[]; initialStats: Stats }) {
  const [missions, setMissions] = React.useState<Mission[]>(props.initialMissions);
  const [stats, setStats] = React.useState<Stats>(props.initialStats);

  // split active vs history
  const active = missions.filter(m => ['pending','assigned','en_route','delivering'].includes(m.status));
  const history = missions.filter(m => ['completed','failed','canceled'].includes(m.status));

  React.useEffect(() => {
    const off = connectSSE((type, payload: any) => {
      if (type === 'mission.created') {
        setMissions(prev => {
          const exists = prev.find(x => x.id === payload.id);
          return exists ? prev : [payload, ...prev];
        });
      } else if (type === 'mission.updated') {
        setMissions(prev => prev.map(m => (m.id === payload.id ? payload : m)));
      } else if (type === 'stats.updated') {
        setStats(payload as Stats);
      }
    });
    return off;
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopAppBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <StatsBar stats={stats} />
          <MissionsTable active={active} history={history} />
        </Stack>
      </Container>
    </Box>
  );
}
