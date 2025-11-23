import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

const GameLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-32 md:h-48 w-full max-w-2xl bg-slate-900/80 border border-slate-700 rounded-xl p-4 overflow-y-auto font-mono text-sm relative">
       <div className="sticky top-0 bg-slate-900/90 w-full text-xs text-slate-500 border-b border-slate-800 pb-1 mb-2 font-bold uppercase tracking-wider">
         作战记录
       </div>
       <div className="flex flex-col gap-1.5">
         {logs.length === 0 && <span className="text-slate-600 italic text-center mt-4">等待对决开始...</span>}
         {logs.map((log) => (
           <div key={log.id} className="flex gap-2">
             <span className="text-slate-500 shrink-0">[{log.round}]</span>
             <span className={`
               ${log.type === 'combat' ? 'text-slate-200' : ''}
               ${log.type === 'death' ? 'text-rose-500 font-bold' : ''}
               ${log.type === 'win' ? 'text-amber-400 font-bold' : ''}
               ${log.type === 'info' ? 'text-cyan-400' : ''}
             `}>
               {log.text}
             </span>
           </div>
         ))}
         <div ref={bottomRef} />
       </div>
    </div>
  );
};

export default GameLog;
