import React, { useEffect, useRef } from 'react';
import { useNoteStore } from '../../store/noteStore';

interface GraphNode {
    id: string;
    title: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: number;
}

interface GraphEdge {
    source: string;
    target: string;
}

const GraphView: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { notes, setActiveNote } = useNoteStore();
    const animFrameRef = useRef<number>(0);
    const nodesRef = useRef<GraphNode[]>([]);
    const edgesRef = useRef<GraphEdge[]>([]);
    const isDraggingRef = useRef<GraphNode | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;

        // Build nodes
        const nodes: GraphNode[] = notes.map((note, i) => ({
            id: note.id,
            title: note.title,
            x: (rect.width / 2) + Math.cos(i * ((2 * Math.PI) / notes.length)) * 150,
            y: (rect.height / 2) + Math.sin(i * ((2 * Math.PI) / notes.length)) * 150,
            vx: 0, vy: 0,
            connections: 0,
        }));

        // Build edges from backlinks [[Note Title]]
        const edges: GraphEdge[] = [];
        notes.forEach((note) => {
            const matches = note.content?.matchAll(/\[\[([^\]]+)\]\]/g) || [];
            for (const match of matches) {
                const targetNote = notes.find((n) => n.title === match[1]);
                if (targetNote) {
                    edges.push({ source: note.id, target: targetNote.id });
                    const srcNode = nodes.find((n) => n.id === note.id);
                    const tgtNode = nodes.find((n) => n.id === targetNote.id);
                    if (srcNode) srcNode.connections++;
                    if (tgtNode) tgtNode.connections++;
                }
            }
        });

        nodesRef.current = nodes;
        edgesRef.current = edges;

        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);

            // Simple force simulation
            const nodeArr = nodesRef.current;
            const edgeArr = edgesRef.current;

            // Repulsion
            for (let i = 0; i < nodeArr.length; i++) {
                for (let j = i + 1; j < nodeArr.length; j++) {
                    const dx = nodeArr[j].x - nodeArr[i].x;
                    const dy = nodeArr[j].y - nodeArr[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = 3000 / (dist * dist);
                    nodeArr[i].vx -= (dx / dist) * force * 0.01;
                    nodeArr[i].vy -= (dy / dist) * force * 0.01;
                    nodeArr[j].vx += (dx / dist) * force * 0.01;
                    nodeArr[j].vy += (dy / dist) * force * 0.01;
                }
            }

            // Attraction along edges
            edgeArr.forEach((edge) => {
                const src = nodeArr.find((n) => n.id === edge.source);
                const tgt = nodeArr.find((n) => n.id === edge.target);
                if (!src || !tgt) return;
                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = dist * 0.002;
                src.vx += (dx / dist) * force;
                src.vy += (dy / dist) * force;
                tgt.vx -= (dx / dist) * force;
                tgt.vy -= (dy / dist) * force;
            });

            // Center gravity
            const cx = rect.width / 2, cy = rect.height / 2;
            nodeArr.forEach((n) => {
                if (isDraggingRef.current?.id === n.id) return;
                n.vx += (cx - n.x) * 0.001;
                n.vy += (cy - n.y) * 0.001;
                n.vx *= 0.85;
                n.vy *= 0.85;
                n.x += n.vx;
                n.y += n.vy;
                n.x = Math.max(40, Math.min(rect.width - 40, n.x));
                n.y = Math.max(40, Math.min(rect.height - 40, n.y));
            });

            // Draw edges
            edgeArr.forEach((edge) => {
                const src = nodeArr.find((n) => n.id === edge.source);
                const tgt = nodeArr.find((n) => n.id === edge.target);
                if (!src || !tgt) return;
                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(tgt.x, tgt.y);
                ctx.strokeStyle = 'rgba(124, 111, 239, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Draw nodes
            nodeArr.forEach((node) => {
                const radius = 5 + Math.min(node.connections * 2, 12);
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = node.connections > 0 ? '#3ECF8E' : '#3a3d4a';
                ctx.fill();
                ctx.strokeStyle = 'rgba(124, 111, 239, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Node label
                ctx.fillStyle = 'rgba(221, 225, 232, 0.75)';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'center';
                const label = node.title.length > 18 ? node.title.substring(0, 18) + '…' : node.title;
                ctx.fillText(label, node.x, node.y + radius + 12);
            });

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            animFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        // Click handler
        const handleClick = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            const clicked = nodesRef.current.find((n) => {
                const dx = n.x - mx, dy = n.y - my;
                return Math.sqrt(dx * dx + dy * dy) < 14;
            });
            if (clicked) {
                const note = notes.find((n) => n.id === clicked.id);
                if (note) setActiveNote(note);
            }
        };

        canvas.addEventListener('click', handleClick);
        return () => {
            cancelAnimationFrame(animFrameRef.current);
            canvas.removeEventListener('click', handleClick);
        };
    }, [notes]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '32px 32px 0 32px', width: '100%', position: 'relative' }}>
            <div style={{ marginBottom: 24, zIndex: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Graph</h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                    Visualize connections between your notes using [[links]].
                </p>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                {notes.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', paddingTop: '64px' }}>
                        Create notes with [[links]] to see connections
                    </div>
                ) : (
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                )}
            </div>
        </div>
    );
};

export default GraphView;
