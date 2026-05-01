import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useNoteStore } from '../../store/noteStore';
import Mermaid from './Mermaid';

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
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Handle syntax highlighting and Mermaid
                    code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match ? match[1] : '';
                        const inline = !match;

                        if (lang === 'mermaid') {
                            return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                        }

                        if (!inline && match) {
                            return (
                                <SyntaxHighlighter
                                    style={vscDarkPlus as any}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            );
                        }

                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Override paragraphs to support dangerouslySetInnerHTML for wiki links
                    p: ({ children, ...props }) => {
                        if (typeof children === 'string' && children.includes('<span class="wiki-link"')) {
                            return <p {...props} dangerouslySetInnerHTML={{ __html: children }} />;
                        }
                        return <p {...props}>{children}</p>;
                    },
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownPreview;
