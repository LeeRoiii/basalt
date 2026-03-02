import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET all tags
router.get('/', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    let query = supabase.from('tags').select('*').order('name');
    if (user_id) query = query.eq('user_id', user_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// POST create tag
router.post('/', async (req: Request, res: Response) => {
    const { name, color, user_id } = req.body;
    const { data, error } = await supabase
        .from('tags')
        .insert({ name, color: color || '#6366f1', user_id })
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
});

// DELETE tag
router.delete('/:id', async (req: Request, res: Response) => {
    const { error } = await supabase.from('tags').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Tag deleted' });
});

export default router;
