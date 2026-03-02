import React, { useState } from 'react';
import {
    Bold, Italic, Heading1, Heading2, List, ListOrdered,
    CheckSquare, Quote, Code, Table, Link
} from 'lucide-react';
import { EditorView } from '@codemirror/view';
import TableModal from '../common/TableModal';

interface EditorToolbarProps {
    view: EditorView | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ view }) => {
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    if (!view) return null;

    const generateTable = (cols: number) => {
        const { from, to } = view.state.selection.main;
        const header = `| ${Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(' | ')} |`;
        const divider = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;
        const row = `| ${Array.from({ length: cols }, () => 'Content').join(' | ')} |`;
        const replacement = `\n${header}\n${divider}\n${row}\n`;

        view.dispatch({
            changes: { from, to, insert: replacement },
            selection: { anchor: from + 3, head: from + 3 } // Position inside the first cell
        });
        view.focus();
        setIsTableModalOpen(false);
    };

    const applyFormat = (type: string) => {
        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);
        let replacement = '';
        let cursorOffset = 0;
        let selectionLength = selectedText.length;

        switch (type) {
            case 'bold':
                replacement = `**${selectedText}**`;
                cursorOffset = 2;
                break;
            case 'italic':
                replacement = `*${selectedText}*`;
                cursorOffset = 1;
                break;
            case 'h1':
                replacement = `# ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'h2':
                replacement = `## ${selectedText}`;
                cursorOffset = 3;
                break;
            case 'list':
                replacement = `- ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'ordered-list':
                replacement = `1. ${selectedText}`;
                cursorOffset = 3;
                break;
            case 'checklist':
                replacement = `- [ ] ${selectedText}`;
                cursorOffset = 6;
                break;
            case 'quote':
                replacement = `> ${selectedText}`;
                cursorOffset = 2;
                break;
            case 'code':
                replacement = `\`${selectedText}\``;
                cursorOffset = 1;
                break;
            case 'link':
                replacement = `[${selectedText}](url)`;
                cursorOffset = selectedText ? selectedText.length + 3 : 1;
                selectionLength = selectedText ? 3 : 3; // Highlight 'url'
                break;
            case 'table':
                setIsTableModalOpen(true);
                return;
            default:
                return;
        }

        view.dispatch({
            changes: { from, to, insert: replacement },
            selection: { anchor: from + cursorOffset, head: from + cursorOffset + selectionLength }
        });
        view.focus();
    };

    const buttons = [
        { icon: <Bold size={16} />, title: 'Bold', action: 'bold' },
        { icon: <Italic size={16} />, title: 'Italic', action: 'italic' },
        { icon: <Heading1 size={16} />, title: 'H1', action: 'h1' },
        { icon: <Heading2 size={16} />, title: 'H2', action: 'h2' },
        { icon: <List size={16} />, title: 'Bullet List', action: 'list' },
        { icon: <ListOrdered size={16} />, title: 'Ordered List', action: 'ordered-list' },
        { icon: <CheckSquare size={16} />, title: 'Checklist', action: 'checklist' },
        { icon: <Quote size={16} />, title: 'Quote', action: 'quote' },
        { icon: <Code size={16} />, title: 'Inline Code', action: 'code' },
        { icon: <Link size={16} />, title: 'Link', action: 'link' },
        { icon: <Table size={16} />, title: 'Table', action: 'table' },
    ];

    return (
        <>
            <div className="formatting-toolbar">
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        className="toolbar-btn"
                        title={btn.title}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent losing focus
                            applyFormat(btn.action);
                        }}
                    >
                        {btn.icon}
                    </button>
                ))}
            </div>

            <TableModal
                isOpen={isTableModalOpen}
                onConfirm={generateTable}
                onCancel={() => setIsTableModalOpen(false)}
            />
        </>
    );
};

export default EditorToolbar;
