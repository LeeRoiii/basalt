import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import notesRouter from './routes/notes';
import foldersRouter from './routes/folders';
import tagsRouter from './routes/tags';
import searchRouter from './routes/search';
import uploadRouter from './routes/upload';

// Search for .env in root or parent
const envPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '..', '.env');

dotenv.config({ path: envPath });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: parentEnvPath });
}

console.log(`📡 Loading env from: ${process.env.SUPABASE_URL ? 'FOUND' : 'NOT FOUND'}`);
console.log(`📂 Current Dir: ${process.cwd()}`);
console.log(`📄 Env Path Attempted: ${envPath}`);

const app = express();
const PORT = process.env.PORT || 5000;

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/upload', uploadRouter);

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        supabaseUrl: !!process.env.SUPABASE_URL,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
});

app.listen(PORT, () => {
    console.log(`\n🪨 Basalt server running on http://localhost:${PORT}`);
    console.log(`🔑 Supabase URL: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🔑 Service Key: ${(process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0) > 50 ? '✅ Configured' : '⚠️ Invalid or missing'}\n`);
});

export default app;
