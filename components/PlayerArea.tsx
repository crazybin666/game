import React from 'react';
import { Player } from '../types';
import { CLASSES } from '../constants';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  showMove: boolean;
  isTarget?: boolean;
  onClick?: () => void;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, showMove, isTarget, onClick }) => {
  const isDead = !player.isAlive;
  const playerClass = CLASSES[player.classType];
  
  // Calculate Widths for Bars
  const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
  const energyPercent = Math.min(100, (player.energy / 5) * 100); 

  // Team Colors
  let borderColor = 'border-slate-700';
  if (player.team === 'A') {
      borderColor = 'border-blue-600/50';
      if (isCurrentPlayer) borderColor = 'border-blue-500';
  } else if (player.team === 'B') {
      borderColor = 'border-rose-800/80';
  }

  // VFX Logic: Determine what overlay effects to show based on state
  let vfxElement = null;
  
  if (showMove && player.lastMove) {
      // 1. Action User Effects (e.g., Aura for charging)
      if (player.lastMove.type === 'CHARGE' || player.lastMove.type === 'SACRIFICE') {
          vfxElement = (
              <div className="absolute inset-0 -m-4 rounded-full border-4 border-cyan-400 opacity-0 animate-aura pointer-events-none z-0"></div>
          );
      }
      if (player.lastMove.label === '光盾') {
          vfxElement = (
              <div className="absolute inset-0 rounded-xl border-4 border-amber-400 opacity-0 animate-shield pointer-events-none z-10"></div>
          );
      }
  }

  // 2. Reaction/Impact Effects (When taking damage or healing)
  let damageEffect = null;
  if (player.damageTakenThisRound > 0) {
      damageEffect = (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="w-full h-full absolute bg-rose-500/30 animate-explosion rounded-xl"></div>
              <div className="absolute w-[120%] h-1 bg-white rotate-45 animate-slash"></div>
              <div className="absolute w-[120%] h-1 bg-white -rotate-45 animate-slash" style={{animationDelay: '0.1s'}}></div>
          </div>
      );
  }

  let healEffect = null;
  if (player.hpRecoveredThisRound && player.hpRecoveredThisRound > 0) {
      healEffect = (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
              <div className="text-green-400 text-4xl animate-heal">✚</div>
              <div className="absolute inset-0 bg-green-400/20 rounded-xl animate-pulse"></div>
          </div>
      );
  }

  // Move Badge Rendering
  let moveDisplay = null;
  if (isDead) {
    moveDisplay = <span className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">DEAD</span>;
  } else if (showMove && player.lastMove) {
    const m = player.lastMove;
    
    // Move Badge
    let badgeColor = 'bg-slate-700';
    if (m.type === 'ATTACK') badgeColor = m.variant === 'ADVANCED' ? 'bg-rose-600' : 'bg-rose-800';
    if (m.type === 'DEFEND') badgeColor = m.variant === 'ADVANCED' ? 'bg-emerald-500' : 'bg-emerald-700';
    if (m.type === 'CHARGE') badgeColor = 'bg-cyan-600';
    if (m.type === 'HEAL') badgeColor = 'bg-green-500';
    if (m.type === 'SACRIFICE') badgeColor = 'bg-purple-600';
    if (m.type === 'BUFF') badgeColor = 'bg-amber-500';
    
    moveDisplay = (
      <div className={`px-2 py-0.5 rounded text-white font-bold text-[10px] shadow-xl ${badgeColor} animate-bounce z-40 flex items-center gap-1 whitespace-nowrap border border-white/20`}>
        {m.label}
        {(m.type === 'ATTACK' || m.type === 'HEAL') && player.lastTargetId && (
           <span className="opacity-75 text-[8px] bg-black/20 px-1 rounded ml-0.5">➤{player.lastTargetId}</span>
        )}
      </div>
    );
  } else if (!showMove && player.status === 'READY') {
    moveDisplay = <span className="text-cyan-400 text-[9px] font-mono font-bold animate-pulse tracking-widest">READY</span>;
  } else if (!showMove && player.status === 'ACTING') {
    moveDisplay = <div className="flex gap-1"><div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"/></div>;
  }

  return (
    <div 
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-1.5 md:p-2 rounded-xl border-2 transition-all duration-300 select-none 
        min-w-[4.5rem] w-20 sm:w-24 md:w-32 lg:w-36 flex-shrink
        ${isDead ? 'bg-slate-900/40 opacity-50 grayscale scale-95' : 'bg-slate-800/90'}
        ${borderColor}
        ${isTarget ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 scale-105 cursor-pointer z-30 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : ''}
        ${player.damageTakenThisRound > 0 ? 'animate-shake' : ''}
      `}
    >
      {/* Visual Effects Layer */}
      {vfxElement}
      {damageEffect}
      {healEffect}

      {/* Target Crosshair Overlay */}
      {isTarget && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center opacity-80">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-yellow-400 animate-spin-slow">
                  <path fill="currentColor" d="M45,0 L55,0 L55,20 L45,20 L45,0 Z M45,80 L55,80 L55,100 L45,100 L45,80 Z M0,45 L20,45 L20,55 L0,55 L0,45 Z M80,45 L100,45 L100,55 L80,55 L80,45 Z" />
                  <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
          </div>
      )}

      {/* Floating Status Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 h-6 flex items-end">
        {moveDisplay}
      </div>

      {/* Avatar */}
      <div className="relative mb-1 mt-1">
         <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-lg sm:text-xl md:text-2xl shadow-inner overflow-hidden">
            {player.classType === 'GUARDIAN' && '🛡️'}
            {player.classType === 'STRIKER' && '⚔️'}
            {player.classType === 'CHANNELER' && '🔮'}
         </div>
         {/* Team Indicator Badge */}
         <div className={`absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[7px] sm:text-[9px] font-bold text-white border border-slate-900 ${player.team === 'A' ? 'bg-blue-500' : (player.team === 'B' ? 'bg-rose-600' : 'hidden')}`}>
             {player.team === 'A' ? 'A' : 'B'}
         </div>
         
         {/* Combat Floaters */}
         {player.damageTakenThisRound > 0 && (
          <div className="absolute top-0 right-0 -translate-y-full text-rose-500 font-black text-lg md:text-xl animate-[bounce_0.5s_infinite] drop-shadow-md z-50">
            -{player.damageTakenThisRound}
          </div>
        )}
        {player.hpRecoveredThisRound && player.hpRecoveredThisRound > 0 && (
          <div className="absolute top-0 right-0 -translate-y-full text-green-400 font-black text-lg md:text-xl animate-[bounce_0.5s_infinite] drop-shadow-md z-50">
            +{player.hpRecoveredThisRound}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="font-bold text-[9px] sm:text-[10px] md:text-xs text-slate-300 mb-1 truncate max-w-full">
        {isCurrentPlayer ? 'YOU' : player.name}
      </div>

      {/* Bars Container */}
      <div className="w-full space-y-1 bg-slate-950/50 p-1 rounded-lg border border-slate-800">
         
         {/* HP */}
         <div className="w-full">
            <div className="h-1.5 sm:h-2 w-full bg-slate-900 rounded-sm overflow-hidden relative">
               <div 
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-500"
                  style={{ width: `${hpPercent}%` }}
               />
               <div className="absolute inset-0 flex">
                  {Array(player.maxHp - 1).fill(0).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-slate-900/50"></div>
                  ))}
               </div>
            </div>
         </div>

         {/* Shield (If active) */}
         {player.shield > 0 && (
             <div className="flex items-center gap-0.5 justify-center bg-slate-700/50 rounded px-1 py-0.5 mt-0.5">
                 <span className="text-[7px]">🛡️</span>
                 <div className="flex gap-0.5">
                    {Array(player.shield).fill(0).map((_,i) => (
                        <div key={i} className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    ))}
                 </div>
             </div>
         )}

         {/* Energy */}
         <div className="w-full mt-1">
            <div className="h-1 sm:h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden">
               <div 
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300"
                  style={{ width: `${energyPercent}%` }}
               />
            </div>
            <div className="text-[7px] sm:text-[8px] text-cyan-500 text-center leading-none mt-0.5">{player.energy} EP</div>
         </div>

      </div>
    </div>
  );
};

export default PlayerArea;