const express = require('express');
const cors = require('cors');
const { connectDB, closeConnection } = require('./utils/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS before any route definitions
app.use(cors({
  origin: 'https://purdue-health.vercel.app/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-User-Email'
  ]
}));

app.use(express.json());

// Set headers to allow cross-origin communication
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Add this before your routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Import all routes
const surveyRoutes = require('./routes/survey');
const workoutPlanRoutes = require('./routes/workoutPlan');
const authenticationRoutes = require('./routes/authentication');
const dietaryRoutes = require('./routes/dietary');
const menuRoutes = require('./routes/menu'); 
const motivationRoutes = require('./routes/motivation');
const socialRoutes = require('./routes/social');
const favoritesRoutes = require('./routes/favorites');
const recommendationsRoutes = require('./routes/recommendations');
const congestionRouter = require('./routes/congestion');

// Register routes
app.use('/api/survey', surveyRoutes); // Make sure this is registered
app.use('/api/workout-plan', workoutPlanRoutes);
app.use('/api/auth', authenticationRoutes);
app.use('/api/dietary', dietaryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/motivation', motivationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/congestion', congestionRouter);

// Add this after your routes but before error handler
app.use((err, req, res, next) => {
  console.error('API Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Error handling for Auth0
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize MongoDB connection before starting server
const startServer = async () => {
  try {
    await connectDB(); // Establish initial connection
    console.log('MongoDB connection initialized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  try {
    await closeConnection();
    console.log('Gracefully shutting down');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;