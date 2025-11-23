import React, { useMemo, useEffect, useRef } from 'react';
import { AdventureNode, AdventureState } from '../types';

interface AdventureMapProps {
  mapData: AdventureState;
  onNodeSelect: (node: AdventureNode) => void;
}

const AdventureMap: React.FC<AdventureMapProps> = ({ mapData, onNodeSelect }) => {
  const { map, currentFloor, currentStage } = mapData;
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current floor on mount or floor change
  useEffect(() => {
    if (containerRef.current) {
        // Calculate rough position of current floor
        const scrollHeight = containerRef.current.scrollHeight;
        const clientHeight = containerRef.current.clientHeight;
        const floorPercent = currentFloor / map.length;
        
        // Center the view on the current floor
        const targetScroll = floorPercent * scrollHeight - (clientHeight / 2);
        
        containerRef.current.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }
  }, [currentFloor, map.length, currentStage]); // Added currentStage dependency to reset on new stage

  const mapWithPositions = useMemo(() => {
    return map.map((row, rowIndex) => {
      // Use standard vertical distribution
      const rowHeightPercent = 90 / map.length; 
      const top = 5 + (rowIndex * rowHeightPercent); 
      
      return row.map((node, colIndex) => {
        const totalInRow = row.length;
        const left = ((colIndex + 1) / (totalInRow + 1)) * 100;
        
        return {
          ...node,
          x: left,
          y: top
        };
      });
    });
  }, [map]);

  const renderConnections = () => {
    const lines: React.ReactElement[] = [];

    mapWithPositions.forEach((row, rowIndex) => {
       if (rowIndex === mapWithPositions.length - 1) return; 

       row.forEach(node => {
          if (node.nextNodes && node.nextNodes.length > 0) {
             node.nextNodes.forEach(nextId => {
                const nextRow = mapWithPositions[rowIndex + 1];
                const target = nextRow?.find(n => n.id === nextId);
                
                if (target) {
                   const isPathActive = node.status === 'COMPLETED' && (target.status === 'AVAILABLE' || target.status === 'COMPLETED');
                   const color = isPathActive ? '#22d3ee' : '#334155'; 
                   const width = isPathActive ? 3 : 1;
                   const opacity = isPathActive ? 0.8 : 0.3;

                   lines.push(
                     <line 
                       key={`${node.id}-${target.id}`}
                       x1={`${node.x}%`} 
                       y1={`${node.y}%`} 
                       x2={`${target.x}%`} 
                       y2={`${target.y}%`} 
                       stroke={color} 
                       strokeWidth={width}
                       strokeOpacity={opacity}
                       strokeDasharray={isPathActive ? 'none' : '5,5'}
                     />
                   );
                }
             });
          }
       });
    });
    return lines;
  };

  const handleScroll = (direction: 'up' | 'down') => {
      if (containerRef.current) {
          const amount = 300;
          const top = direction === 'up' ? -amount : amount;
          containerRef.current.scrollBy({ top, behavior: 'smooth' });
      }
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center bg-slate-900 relative overflow-hidden">
      {/* Header Info - Fixed at Top */}
      <div className="z-20 bg-slate-900/90 w-full text-center py-3 border-b border-slate-800 backdrop-blur-sm shadow-md shrink-0 flex justify-center items-center gap-4">
         <h2 className="text-xl font-display font-bold text-white tracking-widest">
            第 {currentStage} 层地牢 - 区域 {currentFloor + 1}
         </h2>
      </div>

      {/* Scroll Controls (Left Side) */}
      <div className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
          <button 
             onClick={() => handleScroll('up')}
             className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 border border-slate-600 hover:border-cyan-400 hover:text-cyan-400 text-slate-300 shadow-lg flex items-center justify-center transition-all active:scale-95"
             aria-label="Scroll Up"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
             </svg>
          </button>
          <button 
             onClick={() => handleScroll('down')}
             className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 border border-slate-600 hover:border-cyan-400 hover:text-cyan-400 text-slate-300 shadow-lg flex items-center justify-center transition-all active:scale-95"
             aria-label="Scroll Down"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
          </button>
      </div>

      {/* Map Container - Flex Grow to Fill Space */}
      <div 
        ref={containerRef}
        className="flex-1 w-full max-w-2xl overflow-y-auto relative bg-slate-950/30 scroll-smooth"
      >
         {/* Inner Scrollable Area - Fixed Large Height for Nodes */}
         <div className="relative w-full h-[1500px] pb-20">
            
            {/* SVG Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               {renderConnections()}
            </svg>

            {/* Nodes Layer */}
            {mapWithPositions.flat().map(node => {
                const isCurrent = node.row === currentFloor;
                
                let statusColor = 'bg-slate-800 border-slate-600 text-slate-500'; 
                let scale = 'scale-90';
                let shadow = '';
                let cursor = 'cursor-default';
                let animate = '';
                let iconSize = 'text-2xl';

                if (node.status === 'COMPLETED') {
                    statusColor = 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 grayscale';
                } else if (node.status === 'AVAILABLE') {
                    statusColor = 'bg-slate-700 border-cyan-400 text-white hover:bg-slate-600 hover:border-cyan-300';
                    scale = 'scale-110';
                    shadow = 'shadow-[0_0_20px_rgba(34,211,238,0.3)]';
                    cursor = 'cursor-pointer';
                    animate = 'animate-pulse';
                } else if (node.status === 'SKIPPED') {
                     statusColor = 'bg-slate-900 border-slate-800 text-slate-800 opacity-20';
                }

                let icon = node.icon;
                if (node.type === 'BOSS') { icon = '👹'; iconSize = 'text-4xl'; }
                if (node.type === 'SHOP') icon = '🛒';
                if (node.type === 'REST') icon = '🔥';
                if (node.type === 'EVENT') icon = '❓';

                return (
                  <div 
                    key={node.id}
                    className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                     <button
                        onClick={() => node.status === 'AVAILABLE' && onNodeSelect(node)}
                        disabled={node.status !== 'AVAILABLE'}
                        className={`
                          w-14 h-14 md:w-16 md:h-16 rounded-full border-2 md:border-4 flex flex-col items-center justify-center transition-all duration-300
                          ${statusColor} ${scale} ${shadow} ${cursor} ${animate}
                        `}
                     >
                        <div className={iconSize}>{icon}</div>
                     </button>
                     
                     {/* Label */}
                     {(isCurrent || node.type === 'BOSS' || node.type === 'SHOP' || node.type === 'EVENT' || node.status === 'AVAILABLE') && (
                        <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 whitespace-nowrap ${node.status === 'AVAILABLE' ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {node.label}
                        </div>
                     )}
                  </div>
                );
            })}

         </div>
      </div>
    </div>
  );
};

export default AdventureMap;