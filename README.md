# Password Strength Analyzer

A web application to analyze password strength, generate secure passwords, and compare password security levels.

## Project Structure

- `/frontend` - React frontend application
- `/backend` - Node.js/Express backend API

## Deployment Setup

### Prerequisites

1. MongoDB Atlas account and database
2. Vercel account
3. Domain name (passwordstrengthanalyser.com)
4. Google OAuth credentials

### Environment Variables

#### Backend (.env)
```
PORT=5004
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://passwordstrengthanalyser.com
ENCRYPTION_KEY=your_32_byte_encryption_key
```

#### Frontend (.env)
```
REACT_APP_API_URL=https://api.passwordstrengthanalyser.com
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

### Deployment Steps

1. Deploy Backend:
   - Push code to GitHub
   - Import project in Vercel
   - Set environment variables
   - Deploy to api.passwordstrengthanalyser.com

2. Deploy Frontend:
   - Push code to GitHub
   - Import project in Vercel
   - Set environment variables
   - Deploy to passwordstrengthanalyser.com

3. Configure Domain:
   - Add domain in Vercel
   - Configure DNS settings
   - Set up SSL certificates

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```
3. Create .env files in both frontend and backend directories
4. Start the development servers:
   ```bash
   # Start backend (from backend directory)
   npm start

   # Start frontend (from frontend directory)
   npm start
   ```

## Features

- Password strength analysis
- Secure password generation
- Password comparison
- Google OAuth authentication
- Password history tracking
- Encrypted password storage
