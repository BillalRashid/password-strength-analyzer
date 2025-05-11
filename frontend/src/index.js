import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Get environment variables with debug logging
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const apiUrl = process.env.REACT_APP_API_URL;

// Debug logging
console.log('Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_GOOGLE_CLIENT_ID: clientId ? 'configured' : 'missing',
  REACT_APP_API_URL: apiUrl ? 'configured' : 'missing',
  origin: window.location.origin
});

// Validate required environment variables
if (!clientId) {
  console.error('Google Client ID is not configured! Authentication will not work.');
}

if (!apiUrl) {
  console.error('API URL is not configured! Backend communication will fail.');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
