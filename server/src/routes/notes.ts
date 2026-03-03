import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET all notes (optionally by folder)
router.get('/', async (req: Request, res: Response) => {
    const { folder_id, user_id } = req.query;
    let query = supabase.from('notes').select('*, tags(*)').order('updated_at', { ascending: false }).is('deleted_at', null);

    if (user_id) query = query.eq('user_id', user_id as string);
    if (folder_id) query = query.eq('folder_id', folder_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// GET trashed notes
router.get('/trash', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    let query = supabase.from('notes').select('*, tags(*)').order('deleted_at', { ascending: false }).not('deleted_at', 'is', null);

    if (user_id) query = query.eq('user_id', user_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

// Helper function to extract Supabase storage filenames from markdown content
const extractImageFilenames = (content: string): string[] => {
    const filenames: string[] = [];
    // Matches Supabase public upload URLs in markdown: ![...](.../uploads/filename.png)
    const regex = /\/storage\/v1\/object\/public\/uploads\/([^)\s]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match[1]) filenames.push(match[1]);
    }
    return filenames;
};

// DELETE empty trash
router.delete('/trash', async (req: Request, res: Response) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });

    // Pre-fetch notes to delete associated images
    const { data: trashedNotes } = await supabase
        .from('notes')
        .select('content')
        .not('deleted_at', 'is', null)
        .eq('user_id', user_id as string);

    if (trashedNotes && trashedNotes.length > 0) {
        const filesToDelete = trashedNotes.flatMap(note => extractImageFilenames(note.content || ''));
        if (filesToDelete.length > 0) {
            await supabase.storage.from('uploads').remove(filesToDelete);
        }
    }

    const { error } = await supabase.from('notes').delete().not('deleted_at', 'is', null).eq('user_id', user_id as string);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Trash emptied' });
});

// GET single note
router.get('/:id', async (req: Request, res: Response) => {
    const { data, error } = await supabase
        .from('notes')
        .select('*, tags(*), folders(name), columns:kanban_columns(*, tasks:kanban_tasks(*))')
        .eq('id', req.params.id)
        .single();

    if (error) return res.status(404).json({ error: 'Note not found' });

    // Sort columns and tasks by order
    if (data.type === 'kanban' && data.columns) {
        data.columns.sort((a: any, b: any) => a.order - b.order);
        data.columns.forEach((col: any) => {
            if (col.tasks) {
                col.tasks.sort((a: any, b: any) => a.order - b.order);
            }
        });
    }

    return res.json(data);
});

// POST create note
router.post('/', async (req: Request, res: Response) => {
    console.log('📥 POST /notes', req.body);
    const { title, content, folder_id, user_id, tag_ids, type } = req.body;
    const { data, error } = await supabase
        .from('notes')
        .insert({ title: title || 'Untitled', content: content || '', folder_id, user_id, type: type || 'note' })
        .select()
        .single();

    if (error) {
        console.error('❌ Supabase Note Insert Error:', error);
        return res.status(400).json({ error: error.message });
    }

    console.log('✅ Note created:', data.id);

    // Link tags if provided
    if (tag_ids && tag_ids.length > 0 && data) {
        console.log('🔗 Linking tags...', tag_ids);
        const noteTagInserts = tag_ids.map((tag_id: string) => ({ note_id: data.id, tag_id }));
        await supabase.from('note_tags').insert(noteTagInserts);
    }

    return res.status(201).json(data);
});

// PUT update note
router.put('/:id', async (req: Request, res: Response) => {
    const { title, content, folder_id, tag_ids, type } = req.body;
    const { data, error } = await supabase
        .from('notes')
        .update({ title, content, folder_id, type, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });

    // Update tags
    if (tag_ids !== undefined) {
        await supabase.from('note_tags').delete().eq('note_id', req.params.id);
        if (tag_ids.length > 0) {
            const noteTagInserts = tag_ids.map((tag_id: string) => ({ note_id: req.params.id, tag_id }));
            await supabase.from('note_tags').insert(noteTagInserts);
        }
    }

    return res.json(data);
});

// DELETE note (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
    const { error } = await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Note moved to trash' });
});

// PUT restore note
router.put('/:id/restore', async (req: Request, res: Response) => {
    const { error } = await supabase.from('notes').update({ deleted_at: null }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Note restored' });
});

// DELETE note permanently
router.delete('/:id/permanent', async (req: Request, res: Response) => {
    // Pre-fetch note to delete associated images
    const { data: note } = await supabase
        .from('notes')
        .select('content')
        .eq('id', req.params.id)
        .single();

    if (note) {
        const filesToDelete = extractImageFilenames(note.content || '');
        if (filesToDelete.length > 0) {
            await supabase.storage.from('uploads').remove(filesToDelete);
        }
    }

    const { error } = await supabase.from('notes').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Note deleted permanently' });
});

// GET backlinks for a note
router.get('/:id/backlinks', async (req: Request, res: Response) => {
    const { data: note } = await supabase.from('notes').select('title').eq('id', req.params.id).single();
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const { data, error } = await supabase
        .from('notes')
        .select('id, title, updated_at')
        .ilike('content', `%[[${note.title}]]%`)
        .is('deleted_at', null);

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
});

export default router;
