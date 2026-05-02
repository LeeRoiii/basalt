import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import notesRouter from './routes/notes';
import foldersRouter from './routes/folders';
import tagsRouter from './routes/tags';
import searchRouter from './routes/search';
import uploadRouter from './routes/upload';
import kanbanRouter from './routes/kanban';

// Search for .env in root or parent
const envPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '..', '.env');

dotenv.config({ path: envPath });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: parentEnvPath });
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet()); // Basic security headers
app.use(compression()); // Compress responses

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiter to all api routes
app.use('/api', limiter);

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

import { authenticate } from './middleware/auth';

// Middleware for all API routes
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    return authenticate(req as any, res, next);
});

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/kanban', kanbanRouter);

// Serve static files from the client build
app.use(express.static(path.join(process.cwd(), 'client/dist')));

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        supabaseUrl: !!process.env.SUPABASE_URL,
    });
});

// For any request that doesn't match an API route, serve the frontend
app.use((req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/dist/index.html'));
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message || 'Internal Server Error';
    
    res.status(status).json({ error: message });
});

app.listen(PORT, () => {
    // Silent start or minimal log
});

export default app;
