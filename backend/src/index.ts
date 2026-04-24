import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors';
import authRouter from './routes/auth';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`StartHack API running on port ${PORT}`);
});
