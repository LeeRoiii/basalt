import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// --- Columns ---

// Create column
router.post('/columns', async (req: Request, res: Response) => {
    console.log('📥 POST /kanban/columns', req.body);
    const { note_id, title, color, order } = req.body;
    const { data, error } = await supabase
        .from('kanban_columns')
        .insert({ note_id, title, color, order: order || 0 })
        .select()
        .single();

    if (error) {
        console.error('❌ Supabase Column Insert Error:', error);
        return res.status(400).json({ error: error.message });
    }
    console.log('✅ Column created:', data.id);
    return res.status(201).json(data);
});

// Update column (rename/reorder)
router.put('/columns/:id', async (req: Request, res: Response) => {
    const { title, color, order } = req.body;
    const updatePayload: Record<string, any> = {};
    if (title !== undefined) updatePayload.title = title;
    if (color !== undefined) updatePayload.color = color;
    if (order !== undefined) updatePayload.order = order;
    const { data, error } = await supabase
        .from('kanban_columns')
        .update(updatePayload)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
});

// Delete column
router.delete('/columns/:id', async (req: Request, res: Response) => {
    const { error } = await supabase.from('kanban_columns').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Column deleted' });
});

// --- Tasks ---

// Create task
router.post('/tasks', async (req: Request, res: Response) => {
    const { column_id, content, order, description, due_date, priority, tags } = req.body;
    const { data, error } = await supabase
        .from('kanban_tasks')
        .insert({
            column_id,
            content,
            order: order || 0,
            description,
            due_date,
            priority,
            tags
        })
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
});

// Update task (content, column move, reorder, and advanced fields)
router.put('/tasks/:id', async (req: Request, res: Response) => {
    const { content, column_id, order, description, due_date, priority, tags } = req.body;
    const updatePayload: Record<string, any> = {};
    if (content !== undefined) updatePayload.content = content;
    if (column_id !== undefined) updatePayload.column_id = column_id;
    if (order !== undefined) updatePayload.order = order;
    if (description !== undefined) updatePayload.description = description;
    if (due_date !== undefined) updatePayload.due_date = due_date;
    if (priority !== undefined) updatePayload.priority = priority;
    if (tags !== undefined) updatePayload.tags = tags;
    const { data, error } = await supabase
        .from('kanban_tasks')
        .update(updatePayload)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
});

// Delete task
router.delete('/tasks/:id', async (req: Request, res: Response) => {
    const { error } = await supabase.from('kanban_tasks').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Task deleted' });
});

export default router;
