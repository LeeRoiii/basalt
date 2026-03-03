-- Structured Kanban Backend Schema

-- 0. Update notes table to support types
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'note' NOT NULL;

-- 1. Create columns table
CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS public.kanban_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID NOT NULL REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]'::jsonb,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage columns for their own notes" ON public.kanban_columns;
    CREATE POLICY "Users can manage columns for their own notes" ON public.kanban_columns
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.notes
                WHERE notes.id = kanban_columns.note_id
                AND notes.user_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Users can manage tasks for their own notes" ON public.kanban_tasks;
    CREATE POLICY "Users can manage tasks for their own notes" ON public.kanban_tasks
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.kanban_columns
                JOIN public.notes ON notes.id = kanban_columns.note_id
                WHERE kanban_columns.id = kanban_tasks.column_id
                AND notes.user_id = auth.uid()
            )
        );
END $$;

-- 5. Add triggers for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_kanban_columns_updated_at ON public.kanban_columns;
CREATE TRIGGER update_kanban_columns_updated_at BEFORE UPDATE ON public.kanban_columns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_tasks_updated_at ON public.kanban_tasks;
CREATE TRIGGER update_kanban_tasks_updated_at BEFORE UPDATE ON public.kanban_tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
