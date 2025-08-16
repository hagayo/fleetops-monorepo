'use client';

import * as React from 'react';
import { Paper, Stack, Chip, Typography } from '@mui/material';

export default function StatsBar(props: { stats: { completed: number; failed: number; active: number } }) {
  const { completed, failed, active } = props.stats;
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ mr: 2 }}>Overview</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip color="primary" label={`Active ${active}`} />
        <Chip color="success" label={`Completed ${completed}`} />
        <Chip color="error" label={`Failed ${failed}`} />
      </Stack>
    </Paper>
  );
}
