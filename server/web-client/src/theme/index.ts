import { createTheme } from '@mui/material/styles';

// Create a custom dark theme with orange accent color
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e5a00d', // Orange accent color
    },
    secondary: {
      main: '#2196f3', // Blue
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.2rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '1.8rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: '0 8px 16px 0 rgba(0,0,0,0.3)',
          },
        },
      },
    },
  },
});

export default theme;
