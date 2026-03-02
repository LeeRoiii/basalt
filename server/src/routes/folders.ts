import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET all folders for a user
router.get('/', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    let query = supabase.from('folders').select('*').order('name').is('deleted_at', null);
    if (user_id) query = query.eq('user_id', user_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// GET trashed folders
router.get('/trash', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    let query = supabase.from('folders').select('*').order('deleted_at', { ascending: false }).not('deleted_at', 'is', null);
    if (user_id) query = query.eq('user_id', user_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// DELETE empty trash
router.delete('/trash', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });

    const { error } = await supabase.from('folders').delete().not('deleted_at', 'is', null).eq('user_id', user_id as string);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Trash emptied' });
});

// POST create folder
router.post('/', async (req: Request, res: Response) => {
    const { name, user_id, parent_id } = req.body;
    const { data, error } = await supabase
        .from('folders')
        .insert({ name, user_id, parent_id: parent_id || null })
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
});

// PUT rename folder
router.put('/:id', async (req: Request, res: Response) => {
    const { name, parent_id } = req.body;
    const { data, error } = await supabase
        .from('folders')
        .update({ name, parent_id })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
});

// DELETE folder (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
    const { error } = await supabase.from('folders').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Folder moved to trash' });
});

// PUT restore folder
router.put('/:id/restore', async (req: Request, res: Response) => {
    const { error } = await supabase.from('folders').update({ deleted_at: null }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Folder restored' });
});

// DELETE folder permanently
router.delete('/:id/permanent', async (req: Request, res: Response) => {
    // Move notes to root before deleting folder or actually delete them based on logic. 
    // Here we will just delete the folder which cascades, but if we want to preserve notes:
    // await supabase.from('notes').update({ folder_id: null }).eq('folder_id', req.params.id);

    // For simplicity, permanent deletion typically deletes children if not explicitly handled. 
    // But since the previous logic was to move them, we will keep that for permanent delete:
    await supabase.from('notes').update({ folder_id: null }).eq('folder_id', req.params.id);

    const { error } = await supabase.from('folders').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Folder deleted permanently' });
});

export default router;
