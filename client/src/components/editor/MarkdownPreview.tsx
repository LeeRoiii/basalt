import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useNoteStore } from '../../store/noteStore';

interface PreviewProps {
    content: string;
}

const MarkdownPreview: React.FC<PreviewProps> = ({ content }) => {
    const { notes, setActiveNote } = useNoteStore();

    // Process wiki links [[Note Title]] -> clickable spans
    const processWikiLinks = (text: string) => {
        return text.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
            return `<span class="wiki-link" data-note-title="${title}">[[${title}]]</span>`;
        });
    };

    const handleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const noteTitle = target.dataset.noteTitle;
        if (noteTitle) {
            const note = notes.find((n) => n.title === noteTitle);
            if (note) setActiveNote(note);
        }
    };

    const processedContent = processWikiLinks(content);

    return (
        <div className="preview-pane" onClick={handleClick}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Override paragraphs to support dangerouslySetInnerHTML for wiki links
                    p: ({ children, ...props }) => <p {...props}>{children}</p>,
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownPreview;
