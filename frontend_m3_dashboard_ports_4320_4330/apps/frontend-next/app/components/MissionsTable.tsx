'use client';

import * as React from 'react';
import {
  Paper, Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box
} from '@mui/material';

type Mission = {
  id: string;
  robotId?: string | null;
  status: 'pending' | 'assigned' | 'en_route' | 'delivering' | 'completed' | 'failed' | 'canceled';
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

function StatusChip({ status }: { status: Mission['status'] }) {
  const color =
    status === 'completed' ? 'success' :
    status === 'failed' ? 'error' :
    status === 'canceled' ? 'default' :
    'warning';
  return <Chip size="small" color={color as any} label={status.replace(/_/g, ' ')} />;
}

export default function MissionsTable(props: { active: Mission[]; history: Mission[] }) {
  const [tab, setTab] = React.useState(0);
  const rows = tab === 0 ? props.active : props.history;

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="missions tabs" sx={{ mb: 2 }}>
        <Tab label={`Active (${props.active.length})`} />
        <Tab label={`History (${props.history.length})`} />
      </Tabs>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label="missions table">
          <TableHead>
            <TableRow>
              <TableCell>Id</TableCell>
              <TableCell>Robot</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Cancel reason</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell title={m.id}>{m.id.slice(0, 8)}...</TableCell>
                <TableCell>{m.robotId ?? '-'}</TableCell>
                <TableCell><StatusChip status={m.status} /></TableCell>
                <TableCell>{m.cancelReason ?? '-'}</TableCell>
                <TableCell>{new Date(m.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell>{new Date(m.updatedAt).toLocaleTimeString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
