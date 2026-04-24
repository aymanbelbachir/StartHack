import cors from 'cors';

export const corsMiddleware = cors({
  origin: ['http://localhost:8081', 'http://localhost:19006', 'exp://localhost:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
