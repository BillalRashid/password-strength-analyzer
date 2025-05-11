import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import PasswordAnalyzer from './components/PasswordAnalyzer';

// API URL configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://password-strength-analyzer-backend-production.up.railway.app';

console.log('Frontend Environment Check:', {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  API_URL
});

function App() {
  // User and authentication state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        console.log('Google login success:', codeResponse);
        setIsLoading(true);
        
        // Get user info from Google
        const userInfo = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${codeResponse.access_token}` },
          }
        );
        
        console.log('Google user info:', userInfo.data);

        // Send token to our backend
        const backendResponse = await axios.post(`${API_URL}/auth/google/token`, {
          access_token: codeResponse.access_token,
          user_info: userInfo.data
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        });

        console.log('Backend response:', backendResponse.data);

        if (backendResponse.data && backendResponse.data.token) {
          // Store token and user data
          sessionStorage.setItem('auth_token', backendResponse.data.token);
          setToken(backendResponse.data.token);
          setUser(backendResponse.data.user);
          setAuthError(null);

          // Verify token immediately
          try {
            const verifyResponse = await axios.get(`${API_URL}/auth/verify`, {
              headers: { 
                'Authorization': `Bearer ${backendResponse.data.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              withCredentials: true
            });

            if (!verifyResponse.data) {
              throw new Error('Token verification failed');
            }
          } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            sessionStorage.removeItem('auth_token');
            setToken(null);
            setUser(null);
            throw new Error('Token verification failed');
          }
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Login error:', error);
        sessionStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setAuthError(error.message || 'Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setAuthError('Google login failed. Please try again.');
      setIsLoading(false);
    }
  });

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const storedToken = sessionStorage.getItem('auth_token');
      if (storedToken) {
        try {
          console.log('Checking stored token...');
          const response = await axios.get(`${API_URL}/auth/verify`, {
            headers: { 
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            withCredentials: true
          });

          console.log('Verify response:', response);
          
          if (response.data) {
            console.log('Stored token is valid');
            setToken(storedToken);
            setUser(response.data);
            setAuthError(null);
          }
        } catch (err) {
          console.error('Stored token invalid:', err);
          sessionStorage.removeItem('auth_token');
          setAuthError('Session expired. Please log in again.');
        }
      }
    };

    checkSession();
  }, []);

  const handleLogin = () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      login();
    } catch (error) {
      console.error('Login initiation failed:', error);
      setAuthError('Failed to start login process. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      googleLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h2 className="text-center">Password Strength Analyzer</h2>
            </div>
            <div className="card-body">
              {!user ? (
                <div className="text-center">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Login with Google'}
                  </button>
                  {authError && (
                    <div className="alert alert-danger mt-3">
                      {authError}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>Welcome, {user.name || 'User'}!</h4>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                  <PasswordAnalyzer token={token} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
