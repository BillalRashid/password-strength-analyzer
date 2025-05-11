import React, { useState } from 'react';
import axios from 'axios';
import './PasswordAnalyzer.css';

const PasswordAnalyzer = ({ token }) => {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzePassword = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!token) {
        setError('Please log in again to analyze passwords.');
        return;
      }

      const API_URL = 'https://password-strength-analyzer-backend-production.up.railway.app';
      const response = await axios.post(
        `${API_URL}/analyze-password`,
        { password },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        }
      );

      if (response.data) {
        setResult(response.data);
        setError(null);
      }
    } catch (error) {
      console.error('Password analysis failed:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('Session expired. Please log in again.');
          // Trigger re-login
          window.location.reload();
        } else {
          setError(`Analysis failed: ${error.response.data.error || 'Please try again.'}`);
        }
      } else if (error.request) {
        setError('Server not responding. Please try again later.');
      } else {
        setError('Failed to analyze password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (score) => {
    if (!score) return 'text-dark';
    if (score < 2) return 'text-danger';
    if (score < 3) return 'text-warning';
    if (score < 4) return 'text-info';
    return 'text-success';
  };

  return (
    <div className="password-analyzer mt-4">
      <div className="form-group">
        <label htmlFor="password">Enter Password to Analyze:</label>
        <div className="input-group">
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a password"
          />
          <div className="input-group-append">
            <button
              className="btn btn-primary"
              onClick={analyzePassword}
              disabled={!password || isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-3">
          {error}
        </div>
      )}

      {result && (
        <div className="results mt-4">
          <h4>Analysis Results:</h4>
          <div className={`strength-score ${getStrengthColor(result.score)}`}>
            <strong>Strength Score: {result.score}/4</strong>
          </div>
          
          {result.feedback && (
            <div className="mt-3">
              <h5>Feedback:</h5>
              {result.feedback.warning && (
                <div className="text-danger">
                  Warning: {result.feedback.warning}
                </div>
              )}
              {result.feedback.suggestions && result.feedback.suggestions.length > 0 && (
                <div className="mt-2">
                  <strong>Suggestions:</strong>
                  <ul className="list-unstyled">
                    {result.feedback.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordAnalyzer;
