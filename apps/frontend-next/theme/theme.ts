import { createTheme } from '@mui/material/styles';

/**
 * Material 3 inspired theme using MUI v5
 * Colorful, modern, responsive
 */
const theme = createTheme({
  cssVariables: true,
  colorSchemes: { light: true } as any,
  palette: {
    mode: 'light',
    primary: { main: '#6750A4' },
    secondary: { main: '#386A20' },
    error: { main: '#B3261E' },
    success: { main: '#146C2E' },
    warning: { main: '#7D5260' },
    background: { default: '#FDF7FF' }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [ 
      'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'
    ].join(','),
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 }
  },
  components: {
    MuiAppBar: {
      defaultProps: { color: 'primary' },
      styleOverrides: {
        root: { borderRadius: 12, marginTop: 12 }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 }
      }
    }
  }
});

export default theme;
