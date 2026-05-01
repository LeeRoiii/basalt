import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    circle?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width, height, circle, className = '', style }) => {
    const combinedStyle: React.CSSProperties = {
        width,
        height,
        ...style
    };

    return (
        <div
            className={`skeleton ${circle ? 'skeleton-circle' : 'skeleton-rect'} ${className}`}
            style={combinedStyle}
        />
    );
};

export default Skeleton;
