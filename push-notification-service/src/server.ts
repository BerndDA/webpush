// src/server.ts
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as OpenApiValidator from 'express-openapi-validator';
import path from 'path';
import { createNotificationRouter, createInternalNotificationRouter } from './routes/notification.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pushnotifications';

// Middleware
app.use(express.json());

// Health check endpoint (before OpenAPI validator since it doesn't need validation)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(express.static('public'));

// OpenAPI Validator Middleware
app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, '../openapi.yaml'),
    validateRequests: {
      removeAdditional: 'all', // Remove properties not defined in the spec
      coerceTypes: false,       // Convert types (e.g., "5" to 5)
    },
    validateResponses: false,  // Set to true if you want to validate responses too
    ignorePaths: /^\/health/,  // Ignore health check endpoint
  })
);

// API routes (will be validated by OpenAPI middleware)
app.use('/api/v1', createNotificationRouter());
app.use('/internalapi/v1', createInternalNotificationRouter());


// Error handler for OpenAPI validation errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle OpenAPI validation errors
  if (err.status === 400 && err.errors) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e: any) => ({
        path: e.path,
        message: e.message,
        errorCode: e.errorCode,
      })),
    });
    return;
  }

  // Handle other errors
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with OpenAPI validation`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });