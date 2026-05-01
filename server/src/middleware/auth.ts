import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Authentication missing or invalid format');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('❌ Supabase Auth Error:', error?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = {
            id: user.id,
            email: user.email
        };

        next();
    } catch (err) {
        console.error('🔥 Unexpected Auth Middleware Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
