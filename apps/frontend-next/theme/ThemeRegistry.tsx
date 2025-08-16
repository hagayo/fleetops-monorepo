'use client';

import * as React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';

export default function ThemeRegistry(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {props.children}
    </ThemeProvider>
  );
}
