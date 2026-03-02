import React from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

const DrawView: React.FC = () => {
    return (
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <Tldraw persistenceKey="basalt-tldraw-whiteboard" />
        </div>
    );
};

export default DrawView;
