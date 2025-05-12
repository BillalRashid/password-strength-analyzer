import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import PasswordAnalyzer from './components/PasswordAnalyzer';

const API_URL = process.env.REACT_APP_API_URL?.trim() || 'API_URL_NOT_SET';
console.log('Frontend Env Check:', {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  API_URL
});

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setIsLoading(true);
        console.log('✅ Google login success:', codeResponse);

        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${codeResponse.access_token}`
          }
        });

        console.log('✅ Google user info:', userInfo.data);

        const backendRes = await axios.post(`${API_URL}/auth/google/token`, {
          access_token: codeResponse.access_token,
          user_info: userInfo.data
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        });

        console.log('✅ Backend response:', backendRes.data);

        if (backendRes.data?.token) {
          sessionStorage.setItem('auth_token', backendRes.data.token);
          setToken(backendRes.data.token);
          setUser(backendRes.data.user);
          setAuthError(null);
        } else {
          throw new Error('No token returned from backend');
        }

      } catch (err) {
        console.error('❌ Login error:', err.response?.data || err.message || err);
        setAuthError('Login failed. Please try again.');
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      console.error('❌ Google login error:', err);
      setAuthError('Google login failed. Please try again.');
    }
  });

  useEffect(() => {
    const verifyStoredToken = async () => {
      const stored = sessionStorage.getItem('auth_token');
      if (!stored) return;

      try {
        const res = await axios.get(`${API_URL}/auth/verify`, {
          headers: {
            Authorization: `Bearer ${stored}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        });

        console.log('✅ Token verified:', res.data);
        setUser(res.data);
        setToken(stored);
        setAuthError(null);
      } catch (err) {
        console.error('❌ Token verification failed:', err.response?.data || err.message);
        sessionStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setAuthError('Session expired. Please log in again.');
      }
    };

    verifyStoredToken();
  }, []);

  const handleLogin = () => {
    setIsLoading(true);
    setAuthError(null);
    login();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    googleLogout();
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
                  <button className="btn btn-primary" onClick={handleLogin} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Login with Google'}
                  </button>
                  {authError && <div className="alert alert-danger mt-3">{authError}</div>}
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4>Welcome, {user.name || 'User'}!</h4>
                    <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
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
