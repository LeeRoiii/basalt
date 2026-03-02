import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Full-text search across notes
router.get('/', async (req: Request, res: Response) => {
    const { q, user_id } = req.query;
    if (!q) return res.json([]);

    const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at, folder_id')
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .eq('user_id', user_id as string)
        .order('updated_at', { ascending: false })
        .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    // Return results with excerpt
    const results = (data || []).map((note) => {
        const contentLower = (note.content || '').toLowerCase();
        const queryLower = (q as string).toLowerCase();
        const idx = contentLower.indexOf(queryLower);
        const excerpt = idx !== -1
            ? '...' + note.content.substring(Math.max(0, idx - 60), idx + 100) + '...'
            : note.content.substring(0, 150) + '...';

        return { ...note, excerpt };
    });

    return res.json(results);
});

export default router;
