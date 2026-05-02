import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
    chart: string;
}

// Initialize mermaid
mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif'
});

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current || !chart) return;

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        const renderChart = async () => {
            try {
                const { svg } = await mermaid.render(id, chart);
                if (ref.current) {
                    ref.current.innerHTML = svg;
                }
            } catch {
                if (ref.current) {
                    ref.current.innerHTML = `<pre style="color: var(--danger); font-size: 12px;">Mermaid Error: Click to edit and fix syntax</pre>`;
                }
            }
        };

        renderChart();
    }, [chart]);

    return <div key={chart} ref={ref} className="mermaid-container" />;
};

export default Mermaid;
