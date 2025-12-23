import React from 'react';

interface MeshBackgroundProps {
    /** Show the glow effects */
    showGlow?: boolean;
    /** Custom class name for additional styling */
    className?: string;
}

const MeshBackground: React.FC<MeshBackgroundProps> = ({
    showGlow = true,
    className = ''
}) => {
    return (
        <>
            {/* Grid Pattern */}
            <div
                className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none ${className}`}
            />

            {/* Animated Glow Effects */}
            {showGlow && (
                <>
                    <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-200/30 dark:bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-200/30 dark:bg-purple-600/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                    <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-emerald-200/20 dark:bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
                </>
            )}
        </>
    );
};

export default MeshBackground;
