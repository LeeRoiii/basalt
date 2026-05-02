import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Configure storage using memory so we can pipe the buffer straight to Supabase
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Endpoint to upload a single image
router.post('/image', upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const supabase = getSupabaseClient(req.user?.token);
        const ext = path.extname(req.file.originalname);
        const filename = `${uuidv4()}${ext}`;

        // Upload buffer to Supabase storage
        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            throw uploadError;
        }

        // Get the public URL for the newly uploaded file
        const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(filename);

        return res.status(200).json({
            url: publicUrl,
            filename: filename,
            originalname: req.file.originalname,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Endpoint to delete a single image
router.delete('/image', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'No image URL provided' });
        }

        const supabase = getSupabaseClient(req.user?.token);

        // Extract filename from URL (e.g., https://.../uploads/filename.png)
        const parts = url.split('/');
        const filename = parts[parts.length - 1];

        if (!filename) {
            return res.status(400).json({ error: 'Invalid image URL' });
        }

        // Delete from Supabase storage
        const { error: deleteError } = await supabase.storage
            .from('uploads')
            .remove([filename]);

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            // If it's a 403 or 404, it might be an ownership issue if RLS is on
            return res.status(400).json({ error: 'Failed to delete image. You may not have permission.' });
        }

        return res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Image delete error:', error);
        return res.status(500).json({ error: 'Failed to delete image' });
    }
});

export default router;
