import React, { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView, ViewPlugin, WidgetType, Decoration, ViewUpdate } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { useNoteStore } from '../../store/noteStore';
import { api } from '../../lib/api';
import EditorToolbar from './EditorToolbar';

// Inline Image Preview Widget
class ImageWidget extends WidgetType {
    url: string;
    constructor(url: string) {
        super();
        this.url = url;
    }

    eq(other: ImageWidget) {
        return this.url === other.url;
    }

    toDOM() {
        const wrap = document.createElement("div");
        wrap.style.display = "block";
        wrap.style.marginTop = "8px";
        wrap.style.marginBottom = "8px";
        wrap.style.userSelect = "none";

        const img = document.createElement("img");
        img.src = this.url;
        // Handle uploading placeholders
        if (this.url === '') {
            img.style.display = 'none';
        }
        img.style.maxWidth = "100%";
        img.style.maxHeight = "400px";
        img.style.borderRadius = "8px";
        img.style.objectFit = "scale-down";
        img.style.boxShadow = "var(--shadow-md)";
        img.style.border = "1px solid var(--border-subtle)";

        // Hide wrapping div if image fails to load
        img.onerror = () => {
            wrap.style.display = 'none';
        };

        wrap.appendChild(img);
        return wrap;
    }
}



const inlineImagePlugin = ViewPlugin.fromClass(class {
    decorations;
    constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDeco(update.view);
        }
    }
    buildDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (let { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            let match;
            const regex = /!\[.*?\]\((.+?)\)/g;
            while ((match = regex.exec(text)) !== null) {
                const deco = Decoration.replace({
                    widget: new ImageWidget(match[1])
                });
                builder.add(from + match.index, from + match.index + match[0].length, deco);
            }
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});

// Live Preview: Hide markdown markers on lines that don't have the cursor
const livePreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
        this.decorations = this.buildDeco(view);
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = this.buildDeco(update.view);
        }
    }
    buildDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const selectionLines = new Set(view.state.selection.ranges.map(r => view.state.doc.lineAt(r.head).number));

        for (let { from, to } of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from, to,
                enter: (node) => {
                    const line = view.state.doc.lineAt(node.from).number;
                    const isActive = selectionLines.has(line);

                    // If line is NOT active, hide markers
                    if (!isActive) {
                        const markers = [
                            "EmphasisMark", "StrongEmphasisMark", "CodeMark", "StrikethroughMark",
                            "HeaderMark", "ListMark", "QuoteMark"
                        ];
                        if (markers.includes(node.name)) {
                            builder.add(node.from, node.to, Decoration.replace({}));
                        }
                    }

                    // Apply styles to formatted text even on inactive lines
                    if (node.name === "HeaderMark") {
                        const hLevel = view.state.doc.sliceString(node.from, node.to).trim().length;
                        builder.add(node.from, view.state.doc.lineAt(node.from).to, Decoration.line({
                            attributes: { class: `cm-h${hLevel}` }
                        }));
                    }
                }
            });
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});

// Custom dark theme
const basaltTheme = EditorView.theme({
    '&': {
        backgroundColor: '#0d0f12',
        color: '#dde1e8',
        height: '100%',
    },
    '.cm-content': {
        caretColor: '#7c6fef',
        fontFamily: "'Inter', 'Roboto', 'Segoe UI', sans-serif",
        fontSize: '15px',
        padding: '40px 60px',
        maxWidth: '850px',
        margin: '0 auto',
        lineHeight: '1.65',
    },
    '.cm-line': { padding: '0 2px' },
    '.cm-h1': { fontSize: '2.2em', fontWeight: '800', color: 'white', marginTop: '0.5em', display: 'block' },
    '.cm-h2': { fontSize: '1.75em', fontWeight: '700', color: 'white', marginTop: '0.4em', display: 'block' },
    '.cm-h3': { fontSize: '1.4em', fontWeight: '600', color: 'white', marginTop: '0.3em', display: 'block' },
    '.cm-quote': { borderLeft: '3px solid var(--accent)', color: 'var(--text-muted)', paddingLeft: '1rem', fontStyle: 'italic' },
    '.cm-cursor': { borderLeftColor: '#7c6fef', borderLeftWidth: '2px' },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
    '.cm-selectionBackground, ::selection': { backgroundColor: '#2d3444 !important' },
    '.cm-gutters': { display: 'none' },
    '.cm-focused': { outline: 'none' },
    // Markdown syntax highlights
    '.cm-header': { color: '#a5b4fc', fontWeight: '700' },
    '.cm-header-1': { fontSize: '1.5em' },
    '.cm-header-2': { fontSize: '1.3em' },
    '.cm-strong': { color: '#f0abfc', fontWeight: '700' },
    '.cm-em': { color: '#67e8f9', fontStyle: 'italic' },
    '.cm-link': { color: '#7c6fef' },
    '.cm-url': { color: '#818cf8' },
    '.cm-code': { color: '#e879f9', fontFamily: "'JetBrains Mono', monospace" },
    '.cm-list': { color: '#cbd5e1' },
    '.cm-hr': { color: '#334155' },
    // Wiki link highlight
    '.cm-wikilink': { color: '#7c6fef', cursor: 'pointer', borderBottom: '1px dashed rgba(124,111,239,0.4)' },
}, { dark: true });

interface EditorProps {
    noteId: string;
}

const MarkdownEditor: React.FC<EditorProps> = ({ noteId }) => {
    const { activeNote, updateNote } = useNoteStore();
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousContentRef = useRef<string>(activeNote?.content || '');
    const [localContent, setLocalContent] = useState(activeNote?.content || '');
    const editorViewRef = useRef<EditorView | null>(null);
    const [, setTick] = useState(0); // Force re-render once view is available

    useEffect(() => {
        if (activeNote?.id === noteId) {
            setLocalContent(activeNote.content || '');
            previousContentRef.current = activeNote.content || '';
        }
    }, [activeNote?.id]);

    const extractUrls = (text: string) => {
        const urls: string[] = [];
        const regex = /!\[.*?\]\((.+?)\)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            urls.push(match[1]);
        }
        return urls;
    };

    const handleChange = useCallback((value: string) => {
        const oldUrls = extractUrls(previousContentRef.current);
        const newUrls = extractUrls(value);

        oldUrls.forEach(url => {
            if (!newUrls.includes(url) && url.includes('/uploads/')) {
                api.delete('/upload/image', { data: { url } }).catch(e => console.error('Auto-delete image failed', e));
            }
        });

        previousContentRef.current = value;
        setLocalContent(value);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            updateNote(noteId, { content: value });
        }, 800);
    }, [noteId, updateNote]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    const handleImageUpload = async (file: File, view: EditorView) => {
        let altText = file.name || 'image';
        if (altText.toLowerCase().startsWith('image.png') || altText.toLowerCase() === 'image') {
            const currentDocStr = view.state.doc.toString();
            const matches = currentDocStr.match(/image-(\d+)/g) || [];
            let maxCount = -1;
            matches.forEach(m => {
                const num = parseInt(m.replace('image-', ''), 10);
                if (!isNaN(num) && num > maxCount) maxCount = num;
            });
            altText = `image-${maxCount + 1}`;
        }

        const placeholder = `![Uploading ${altText}...]()\n`;
        const cursor = view.state.selection.main.head;

        view.dispatch({
            changes: { from: cursor, insert: placeholder }
        });

        try {
            const formData = new FormData();
            formData.append('image', file);
            const { data } = await api.post('/upload/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newText = `![${altText}](${data.url})\n`;
            const currentDoc = view.state.doc.toString();
            const placeholderIdx = currentDoc.indexOf(placeholder);

            if (placeholderIdx !== -1) {
                view.dispatch({
                    changes: { from: placeholderIdx, to: placeholderIdx + placeholder.length, insert: newText }
                });

                // Trigger an update explicitly just in case state desync happens on background DOM modifications
                handleChange(view.state.doc.toString());
            }
        } catch (err) {
            console.error('Image upload failed', err);
            const currentDoc = view.state.doc.toString();
            const placeholderIdx = currentDoc.indexOf(placeholder);
            if (placeholderIdx !== -1) {
                view.dispatch({
                    changes: { from: placeholderIdx, to: placeholderIdx + placeholder.length, insert: `*Upload failed for ${file.name}*\n` }
                });
            }
        }
    };

    const imageDropAndPasteExt = EditorView.domEventHandlers({
        paste: (event, view) => {
            const file = event.clipboardData?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file, view);
                return true;
            }
            return false;
        },
        drop: (event, view) => {
            const file = event.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                event.preventDefault();
                handleImageUpload(file, view);
                return true;
            }
            return false;
        }
    });

    return (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div className="editor-scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <CodeMirror
                    value={localContent}
                    height="100%"
                    theme={basaltTheme}
                    extensions={[
                        markdown({ base: markdownLanguage, codeLanguages: languages }),
                        EditorView.lineWrapping,
                        imageDropAndPasteExt,
                        inlineImagePlugin,
                        livePreviewPlugin
                    ]}
                    onChange={handleChange}
                    onCreateEditor={(view) => {
                        editorViewRef.current = view;
                        setTick(t => t + 1);
                    }}
                    basicSetup={{
                        lineNumbers: false,
                        foldGutter: false,
                        dropCursor: false,
                        allowMultipleSelections: true,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: false,
                        rectangularSelection: true,
                        crosshairCursor: false,
                        highlightActiveLine: true,
                        highlightSelectionMatches: true,
                        closeBracketsKeymap: true,
                        searchKeymap: false,
                        completionKeymap: false,
                        lintKeymap: false,
                    }}
                    style={{ flex: 1, height: '100%' }}
                />
            </div>
            <EditorToolbar view={editorViewRef.current} />
        </div>
    );
};

export default MarkdownEditor;
