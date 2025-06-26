import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { LoadingButton } from '@mui/lab';
import LoginIcon from '@mui/icons-material/Login';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setLoginError('Username and password are required');
      return;
    }
    
    try {
      setLoginError(null);
      await login(username, password);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      // Error is handled in the auth context, but we can add additional handling here
      console.error('Login form error:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h4" align="center" mb={3}>
            SELO Media Server
          </Typography>
          
          <Typography component="h2" variant="h5" mb={3}>
            Log In
          </Typography>
          
          {(loginError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError || error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username or Email"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={isLoading}
              loadingPosition="start"
              startIcon={<LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </LoadingButton>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
