import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNoteStore } from '../../store/noteStore';
import { Search, ZoomIn, ZoomOut, Maximize2, RefreshCw, FileText, Hash, ArrowUpRight, ArrowDownLeft, Clock, Folder, Layout } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GraphNode {
    id: string;
    title: string;
    type: 'note' | 'kanban' | 'folder' | 'column' | 'task';
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: number;
    neighbors: Set<string>;
    outgoing: Set<string>;
    incoming: Set<string>;
    isFixed?: boolean;
}

interface GraphEdge {
    source: string;
    target: string;
    type: 'link' | 'containment';
}

const GraphView: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { notes, folders, setActiveNote, activeNote } = useNoteStore();

    // State for transformation
    const [transform, setTransformState] = useState({ x: 0, y: 0, k: 0.8 });
    const transformRef = useRef(transform);

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    const animFrameRef = useRef<number>(0);
    const nodesRef = useRef<GraphNode[]>([]);
    const edgesRef = useRef<GraphEdge[]>([]);
    const draggingRef = useRef<{ node: GraphNode, offset: { x: number, y: number } } | null>(null);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const pulseOffsetRef = useRef(0);

    // Synchronize ref with state for use in the animation loop
    useEffect(() => {
        transformRef.current = transform;
    }, [transform]);

    // Build the graph structure whenever notes/folders change
    useEffect(() => {
        const existingNodes = new Map(nodesRef.current.map(n => [n.id, n]));

        // 1. Create Folder Nodes
        const folderNodes: GraphNode[] = folders.map((f, i) => {
            const existing = existingNodes.get(f.id);
            if (existing) {
                return {
                    ...existing,
                    title: f.name,
                    connections: 0,
                    neighbors: new Set<string>(),
                    outgoing: new Set<string>(),
                    incoming: new Set<string>(),
                    isFixed: existing.isFixed
                };
            }
            const angle = (i / (folders.length + notes.length || 1)) * Math.PI * 2;
            const dist = 100 + Math.random() * 50;
            return {
                id: f.id,
                title: f.name,
                type: 'folder',
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: 0, vy: 0,
                connections: 0,
                neighbors: new Set<string>(),
                outgoing: new Set<string>(),
                incoming: new Set<string>(),
            };
        });

        // 2. Create Note Nodes
        const noteNodes: GraphNode[] = notes.map((note, i) => {
            const existing = existingNodes.get(note.id);
            if (existing) {
                return {
                    ...existing,
                    title: note.title,
                    type: note.type || 'note',
                    connections: 0,
                    neighbors: new Set<string>(),
                    outgoing: new Set<string>(),
                    incoming: new Set<string>(),
                    isFixed: existing.isFixed
                };
            }
            const angle = ((i + folders.length) / (folders.length + notes.length || 1)) * Math.PI * 2;
            const dist = 250 + Math.random() * 50;
            return {
                id: note.id,
                title: note.title,
                type: note.type || 'note',
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: 0, vy: 0,
                connections: 0,
                neighbors: new Set<string>(),
                outgoing: new Set<string>(),
                incoming: new Set<string>(),
            };
        });

        // 3. Create Kanban Detail Nodes (Columns and Tasks)
        const kanbanDetailNodes: GraphNode[] = [];
        const kanbanEdges: GraphEdge[] = [];

        // Calculate a fallback center point for new nodes if their parent isn't found
        const currentTransform = transformRef.current;
        const fallbackCenterX = -currentTransform.x / currentTransform.k;
        const fallbackCenterY = -currentTransform.y / currentTransform.k;

        notes.forEach(project => {
            // Check if this is a kanban project or has columns data
            if (!project.columns || project.columns.length === 0) return;

            project.columns.forEach((col) => {
                const existingCol = existingNodes.get(col.id);
                const projectNodeInArr = noteNodes.find(n => n.id === project.id);

                const colNode: GraphNode = existingCol ? {
                    ...existingCol,
                    title: col.title,
                    type: 'column',
                    connections: 0,
                    neighbors: new Set<string>(),
                    outgoing: new Set<string>(),
                    incoming: new Set<string>(),
                    isFixed: existingCol.isFixed
                } : {
                    id: col.id,
                    title: col.title,
                    type: 'column',
                    x: (projectNodeInArr?.x ?? fallbackCenterX) + Math.cos(Math.random() * Math.PI * 2) * 80,
                    y: (projectNodeInArr?.y ?? fallbackCenterY) + Math.sin(Math.random() * Math.PI * 2) * 80,
                    vx: 0, vy: 0,
                    connections: 0,
                    neighbors: new Set<string>(),
                    outgoing: new Set<string>(),
                    incoming: new Set<string>(),
                };

                kanbanDetailNodes.push(colNode);
                kanbanEdges.push({ source: project.id, target: col.id, type: 'containment' });

                col.tasks?.forEach((task) => {
                    const existingTask = existingNodes.get(task.id);

                    const taskNode: GraphNode = existingTask ? {
                        ...existingTask,
                        title: task.content,
                        type: 'task',
                        connections: 0,
                        neighbors: new Set<string>(),
                        outgoing: new Set<string>(),
                        incoming: new Set<string>(),
                        isFixed: existingTask.isFixed
                    } : {
                        id: task.id,
                        title: task.content,
                        type: 'task',
                        x: colNode.x + Math.cos(Math.random() * Math.PI * 2) * 50,
                        y: colNode.y + Math.sin(Math.random() * Math.PI * 2) * 50,
                        vx: 0, vy: 0,
                        connections: 0,
                        neighbors: new Set<string>(),
                        outgoing: new Set<string>(),
                        incoming: new Set<string>(),
                    };

                    kanbanDetailNodes.push(taskNode);
                    kanbanEdges.push({ source: col.id, target: task.id, type: 'containment' });
                });
            });
        });

        const allNodes = [...folderNodes, ...noteNodes, ...kanbanDetailNodes];
        const allEdges = [...kanbanEdges];

        // 4. WikiLinks (WikiLinks)
        notes.forEach((note) => {
            const matches = note.content?.matchAll(/\[\[([^\]]+)\]\]/g) || [];
            for (const match of matches) {
                const targetNote = notes.find((n) => n.title === match[1]);
                if (targetNote && targetNote.id !== note.id) {
                    allEdges.push({ source: note.id, target: targetNote.id, type: 'link' });
                }
            }

            // 5. Containment (Containment)
            if (note.folder_id) {
                allEdges.push({ source: note.folder_id, target: note.id, type: 'containment' });
            }
        });

        // 6. Folder Nesting
        folders.forEach(f => {
            if (f.parent_id) {
                allEdges.push({ source: f.parent_id, target: f.id, type: 'containment' });
            }
        });

        // 7. Final connection accounting
        allEdges.forEach(edge => {
            const src = allNodes.find(n => n.id === edge.source);
            const tgt = allNodes.find(n => n.id === edge.target);
            if (src && tgt) {
                src.connections++; tgt.connections++;
                src.neighbors.add(tgt.id); tgt.neighbors.add(src.id);
                src.outgoing.add(tgt.id); tgt.incoming.add(src.id);
            }
        });

        nodesRef.current = allNodes;
        edgesRef.current = allEdges;
    }, [notes, folders]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false })!;

        const updateCanvasSize = () => {
            if (!canvas.parentElement) return;
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        const draw = () => {
            const dpr = window.devicePixelRatio;
            const width = canvas.width / dpr, height = canvas.height / dpr;
            const { x: tx, y: ty, k } = transformRef.current;

            pulseOffsetRef.current = (pulseOffsetRef.current + 0.005) % 1;

            ctx.fillStyle = '#0d0f12';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.translate(width / 2 + tx, height / 2 + ty);
            ctx.scale(k, k);

            // --- Nucleus Background Effect ---
            const gridStep = 400;
            const gridFade = Math.min(0.05, 0.02 * k);
            ctx.strokeStyle = `rgba(99, 102, 241, ${gridFade})`;
            ctx.lineWidth = 1;
            for (let x = -4000; x <= 4000; x += gridStep) {
                ctx.beginPath(); ctx.moveTo(x, -4000); ctx.lineTo(x, 4000); ctx.stroke();
            }
            for (let y = -4000; y <= 4000; y += gridStep) {
                ctx.beginPath(); ctx.moveTo(-4000, y); ctx.lineTo(4000, y); ctx.stroke();
            }

            const nodeArr = nodesRef.current;
            const edgeArr = edgesRef.current;

            // Simple Force Simulation
            for (let i = 0; i < nodeArr.length; i++) {
                for (let j = i + 1; j < nodeArr.length; j++) {
                    const dx = nodeArr[j].x - nodeArr[i].x;
                    const dy = nodeArr[j].y - nodeArr[i].y;
                    const distSq = dx * dx + dy * dy || 1;
                    const dist = Math.sqrt(distSq);
                    const force = Math.min(10, 4500 / distSq);
                    nodeArr[i].vx -= (dx / dist) * force;
                    nodeArr[i].vy -= (dy / dist) * force;
                    nodeArr[j].vx += (dx / dist) * force;
                    nodeArr[j].vy += (dy / dist) * force;
                }
            }

            edgeArr.forEach((edge) => {
                const src = nodeArr.find((n) => n.id === edge.source);
                const tgt = nodeArr.find((n) => n.id === edge.target);
                if (!src || !tgt) return;
                const dx = tgt.x - src.x, dy = tgt.y - src.y;
                const distOffset = Math.sqrt(dx * dx + dy * dy) - (edge.type === 'containment' ? 70 : 130);
                const force = distOffset * 0.05;
                src.vx += (dx / Math.max(1, distOffset)) * force;
                src.vy += (dy / Math.max(1, distOffset)) * force;
                tgt.vx -= (dx / Math.max(1, distOffset)) * force;
                tgt.vy -= (dy / Math.max(1, distOffset)) * force;
            });

            nodeArr.forEach((n) => {
                if (draggingRef.current?.node.id === n.id || n.isFixed) {
                    n.vx = 0; n.vy = 0; return;
                }
                // Center gravity
                const distToCenter = Math.sqrt(n.x * n.x + n.y * n.y);
                const gravityStrength = 0.008 + (distToCenter * 0.000005);
                n.vx += (0 - n.x) * gravityStrength;
                n.vy += (0 - n.y) * gravityStrength;

                // Friction/Damping
                n.vx *= 0.75; n.vy *= 0.75;
                n.x += n.vx; n.y += n.vy;
            });

            // 1. Draw Edges
            edgeArr.forEach((edge) => {
                const src = nodeArr.find((n) => n.id === edge.source);
                const tgt = nodeArr.find((n) => n.id === edge.target);
                if (!src || !tgt) return;

                const isHoveredEdge = hoveredNode === src.id || hoveredNode === tgt.id;
                const isActiveEdgeSource = activeNote?.id === src.id;
                const isActiveEdgeTarget = activeNote?.id === tgt.id;
                const isActiveEdge = isActiveEdgeSource || isActiveEdgeTarget;

                ctx.beginPath();
                ctx.moveTo(src.x, src.y);
                ctx.lineTo(tgt.x, tgt.y);

                if (isActiveEdge) {
                    ctx.strokeStyle = edge.type === 'containment' ? 'rgba(99, 102, 241, 0.4)' : (isActiveEdgeSource ? 'rgba(62, 207, 142, 0.8)' : 'rgba(96, 165, 250, 0.8)');
                    ctx.lineWidth = 2.5;
                } else if (isHoveredEdge) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1.5;
                } else {
                    ctx.strokeStyle = edge.type === 'containment' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.04)';
                    ctx.lineWidth = edge.type === 'containment' ? 1.5 : 1;
                }
                ctx.stroke();

                if (isActiveEdgeSource && edge.type === 'link') {
                    const pulsePos = (pulseOffsetRef.current * 1.5) % 1;
                    const px = src.x + (tgt.x - src.x) * pulsePos;
                    const py = src.y + (tgt.y - src.y) * pulsePos;
                    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#3ECF8E';
                    ctx.shadowBlur = 10; ctx.shadowColor = '#3ECF8E';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            // 2. Draw Nodes
            nodeArr.forEach((node) => {
                const isHovered = hoveredNode === node.id;
                const isActive = activeNote?.id === node.id;
                const isConnectedToActive = activeNote && node.neighbors.has(activeNote.id);
                const isSearching = searchQuery && node.title.toLowerCase().includes(searchQuery.toLowerCase());

                const radius = node.type === 'folder' ? 10 :
                    node.type === 'column' ? 12 :
                        node.type === 'task' ? 6 :
                            node.type === 'kanban' ? 12 :
                                6 + Math.min(node.connections * 1.5, 15);

                // --- Draw Aura/Glow ---
                const glowSize = radius * (1.5 + Math.sin(Date.now() / 1000 + node.x) * 0.1);
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize * 3);

                let baseColor = '#3ECF8E';
                if (node.type === 'folder') baseColor = '#6366f1';
                else if (node.type === 'kanban') baseColor = '#fbbf24';
                else if (node.type === 'column') baseColor = '#818cf8';
                else if (node.type === 'task') baseColor = '#94a3b8';
                else if (node.connections === 0) baseColor = '#475569';

                gradient.addColorStop(0, `${baseColor}22`);
                gradient.addColorStop(0.5, `${baseColor}08`);
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath(); ctx.arc(node.x, node.y, glowSize * 3, 0, Math.PI * 2); ctx.fill();

                if (isActive || isHovered || isSearching) {
                    ctx.beginPath(); ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
                    ctx.fillStyle = isActive ? `${baseColor}33` : 'rgba(255, 255, 255, 0.1)';
                    ctx.fill();
                }

                // Draw Pinned Indicator
                if (node.isFixed) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.setLineDash([3, 3]);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.beginPath(); ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

                if (node.type === 'folder') {
                    ctx.fillStyle = isActive || isHovered ? '#818cf8' : '#4f46e5';
                } else if (node.type === 'kanban') {
                    ctx.fillStyle = isActive || isHovered ? '#fbbf24' : '#b45309';
                } else if (node.type === 'column') {
                    ctx.fillStyle = isActive || isHovered ? '#a5b4fc' : '#6366f1';
                } else if (node.type === 'task') {
                    ctx.fillStyle = isActive || isHovered ? '#cbd5e1' : '#64748b';
                } else {
                    ctx.fillStyle = node.connections > 0
                        ? (isActive || isHovered ? '#3ECF8E' : '#2a9d68')
                        : (isActive || isHovered ? '#94a3b8' : '#334155');
                }

                ctx.fill();
                ctx.strokeStyle = (isActive || isHovered || isSearching) ? '#fff' : 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = (isActive || isHovered) ? 3 : 1.5;
                ctx.stroke();

                const showLabel = isActive || isHovered || isConnectedToActive || isSearching || k > 1.2 || (node.connections > 2 && k > 0.6);

                if (showLabel) {
                    const fontSize = Math.max(10, 12 / Math.sqrt(k));
                    ctx.fillStyle = (isActive || isHovered || isSearching) ? '#fff' : (isConnectedToActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(221, 225, 232, 0.6)');
                    ctx.font = `${(isActive || isHovered) ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(node.title, node.x, node.y + radius + (fontSize + 6));
                }
            });

            ctx.restore();
            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);

        const getMousePos = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio;
            const width = canvas.width / dpr, height = canvas.height / dpr;
            const { x: tx, y: ty, k } = transformRef.current;
            const mx = (e.clientX - rect.left - width / 2 - tx) / k;
            const my = (e.clientY - rect.top - height / 2 - ty) / k;
            return { x: mx, y: my };
        };

        const handleMouseDown = (e: MouseEvent) => {
            const pos = getMousePos(e);
            const clicked = nodesRef.current.find((n) => {
                const dx = n.x - pos.x, dy = n.y - pos.y;
                const radius = n.type === 'folder' ? 12 :
                    n.type === 'column' ? 14 :
                        n.type === 'task' ? 10 :
                            6 + Math.min(n.connections * 1.5, 15);
                return Math.sqrt(dx * dx + dy * dy) < radius + 10;
            });
            if (clicked) draggingRef.current = { node: clicked, offset: { x: clicked.x - pos.x, y: clicked.y - pos.y } };
            else { isPanningRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const pos = getMousePos(e);
            if (draggingRef.current) {
                draggingRef.current.node.x = pos.x + draggingRef.current.offset.x;
                draggingRef.current.node.y = pos.y + draggingRef.current.offset.y;
                draggingRef.current.node.vx = 0; draggingRef.current.node.vy = 0;
            } else if (isPanningRef.current) {
                const dx = e.clientX - lastMouseRef.current.x, dy = e.clientY - lastMouseRef.current.y;
                setTransformState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
            } else {
                const overNode = nodesRef.current.find((n) => {
                    const dx = n.x - pos.x, dy = n.y - pos.y;
                    const radius = n.type === 'folder' ? 12 :
                        n.type === 'column' ? 14 :
                            n.type === 'task' ? 10 :
                                6 + Math.min(n.connections * 1.5, 15);
                    return Math.sqrt(dx * dx + dy * dy) < radius + 15;
                });
                setHoveredNode(overNode?.id || null);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!isPanningRef.current && !draggingRef.current) {
                const pos = getMousePos(e);
                const clicked = nodesRef.current.find((n) => {
                    const dx = n.x - pos.x, dy = n.y - pos.y;
                    const radius = n.type === 'folder' ? 15 :
                        n.type === 'column' ? 16 :
                            n.type === 'task' ? 12 :
                                6 + Math.min(n.connections * 1.5, 15);
                    return Math.sqrt(dx * dx + dy * dy) < radius + 15;
                });
                if (clicked) {
                    if (draggingRef.current) {
                        clicked.isFixed = true;
                    }
                    if (clicked.type === 'folder') {
                        setActiveNote({ id: clicked.id, title: clicked.title, type: 'note', updated_at: new Date().toISOString() } as any);
                    } else if (clicked.type === 'column' || clicked.type === 'task') {
                        // Find parent kanban project
                        const project = notes.find(n => n.type === 'kanban' && n.columns?.some(c => c.id === clicked.id || c.tasks?.some(t => t.id === clicked.id)));
                        if (project) {
                            setActiveNote(project);
                        }
                    } else {
                        const note = notes.find((n) => n.id === clicked.id);
                        if (note) setActiveNote(note);
                    }
                    setShowInfoPanel(true);
                }
            }
            draggingRef.current = null; isPanningRef.current = false;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = Math.pow(1.1, -e.deltaY / 100);
            setTransformState(prev => ({ ...prev, k: Math.max(0.1, Math.min(5, prev.k * factor)) }));
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', updateCanvasSize);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [notes, folders, activeNote, searchQuery, hoveredNode]);

    const activeNodeData = useMemo(() => {
        if (!activeNote) return null;
        return nodesRef.current.find(n => n.id === activeNote.id);
    }, [activeNote, folders, notes]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 32, left: 32, display: 'flex', flexDirection: 'column', pointerEvents: 'none', zIndex: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Knowledge Graph</h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{notes.length} notes across {folders.length} folders</p>
            </div>

            <div style={{ position: 'absolute', top: 32, right: 32, display: 'flex', gap: 12, zIndex: 10 }}>
                <div style={{ padding: '6px 14px', background: 'rgba(26, 29, 36, 0.8)', backdropFilter: 'blur(16px)', borderRadius: 12, border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input placeholder="Search knowledge..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: 140 }} />
                    </div>
                </div>
            </div>

            {activeNote && showInfoPanel && activeNodeData && (
                <div className={`graph-info-panel open`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: activeNodeData.type === 'folder' ? '#6366f11a' : (activeNote.type === 'kanban' ? '#fbbf241a' : '#3ecf8e1a'),
                            color: activeNodeData.type === 'folder' ? '#818cf8' : (activeNote.type === 'kanban' ? '#fbbf24' : '#3ecf8e')
                        }}>
                            {activeNodeData.type}
                        </div>
                        <button onClick={() => setShowInfoPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ZoomOut size={16} /></button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        {activeNodeData.type === 'folder' ? <Folder size={20} color="#818cf8" /> : (activeNote.type === 'kanban' ? <Layout size={20} color="#fbbf24" /> : <FileText size={20} color="#3ecf8e" />)}
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>{activeNodeData.title}</h2>
                    </div>

                    {activeNodeData.type !== 'folder' && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 24, fontSize: 12, color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatDistanceToNow(new Date(activeNote.updated_at))} ago</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> {activeNote.word_count || 0} words</div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                        <div className="conn-stat-card">
                            <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>{activeNodeData.outgoing.size}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ArrowUpRight size={10} /> {activeNodeData.type === 'folder' ? 'Items' : 'Outgoing'}
                            </div>
                        </div>
                        <div className="conn-stat-card">
                            <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 16 }}>{activeNodeData.incoming.size}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ArrowDownLeft size={10} /> Incoming
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Connected Items</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {Array.from(activeNodeData.neighbors).slice(0, 20).map(id => {
                                const neighbor = nodesRef.current.find(n => n.id === id);
                                if (!neighbor) return null;
                                return (
                                    <div key={id} onClick={() => {
                                        if (neighbor.type === 'folder') setActiveNote({ id: neighbor.id, title: neighbor.title, type: 'note', updated_at: new Date().toISOString() } as any);
                                        else {
                                            const n = notes.find(x => x.id === id);
                                            if (n) setActiveNote(n);
                                        }
                                    }} className="neighbor-item">
                                        {neighbor.type === 'folder' ? <Folder size={12} color="#818cf8" /> : (neighbor.type === 'kanban' ? <Layout size={12} color="#fbbf24" /> : <Hash size={12} color="var(--text-muted)" />)}
                                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{neighbor.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ position: 'absolute', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 10 }}>
                <button title="Reset View" onClick={() => setTransformState({ x: 0, y: 0, k: 0.8 })} className="graph-control-btn"><RefreshCw size={18} /></button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-strong)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
                    <button title="Zoom In" onClick={() => setTransformState(p => ({ ...p, k: Math.min(5, p.k * 1.2) }))} className="graph-control-btn compact"><ZoomIn size={18} /></button>
                    <button title="Zoom Out" onClick={() => setTransformState(p => ({ ...p, k: Math.max(0.1, p.k * 0.8) }))} className="graph-control-btn compact"><ZoomOut size={18} /></button>
                </div>
                <button title="Focus" onClick={() => setShowInfoPanel(!showInfoPanel)} className={`graph-control-btn ${showInfoPanel ? 'active' : ''}`}><Maximize2 size={18} /></button>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#0d0f12' }}>
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .graph-info-panel {
                    position: absolute; top: 32px; left: 32px; bottom: 32px; width: 320px;
                    background: rgba(18, 20, 25, 0.8); backdrop-filter: blur(28px);
                    border: 1px solid var(--border-strong); border-radius: 24px;
                    padding: 24px; z-index: 20; display: flex; flex-direction: column;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
                    transform: translateX(-400px); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .graph-info-panel.open { transform: translateX(0); }
                .conn-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; }
                .neighbor-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
                .neighbor-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); transform: translateX(4px); }
                .graph-control-btn { width: 44px; height: 44px; background: rgba(26, 29, 36, 0.8); border: 1px solid var(--border-strong); border-radius: 12px; color: var(--text-muted); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .graph-control-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent); transform: translateY(-2px); }
                .graph-control-btn.active { color: var(--accent); background: var(--accent-muted); border-color: var(--accent); }
                .graph-control-btn.compact { border-radius: 0; border: none; }
            `}} />
        </div>
    );
};

export default GraphView;
