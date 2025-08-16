'use client';

import * as React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export default function TopAppBar() {
  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          FleetOps Dashboard
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
