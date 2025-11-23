import React from 'react';
import { Player, GameMove } from '../types';
import { MOVES } from '../constants';

interface ControlsProps {
  player: Player;
  onSelectMove: (move: GameMove | null) => void;
  selectedMove: GameMove | null;
  needsTarget: boolean;
  onSpectatorNext?: () => void;
  onAutoPlay?: () => void;
  onQuit?: () => void;
  isAutoPlaying?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  player, 
  onSelectMove, 
  selectedMove, 
  needsTarget, 
  onSpectatorNext,
  onAutoPlay,
  onQuit,
  isAutoPlaying 
}) => {
  
  // SPECTATOR MODE
  if (!player.isAlive) {
      return (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm shadow-xl">
              {/* Manual Next Turn */}
              {!isAutoPlaying && (
                <button 
                    onClick={onSpectatorNext}
                    className="w-full sm:w-auto px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold border border-slate-500 transition-all hover:scale-105"
                >
                    👀 下一回合
                </button>
              )}

              {/* Auto Play Toggle */}
              <button 
                onClick={onAutoPlay}
                className={`
                    w-full sm:w-auto px-6 py-2 rounded-lg font-bold border transition-all hover:scale-105 flex items-center justify-center gap-2
                    ${isAutoPlaying 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'}
                `}
              >
                {isAutoPlaying ? '⏸️ 暂停快进' : '⏩ 快速结至终局'}
              </button>

              {/* Exit Button */}
              <button 
                onClick={onQuit}
                className="w-full sm:w-auto px-4 py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded-lg font-bold border border-rose-800 transition-all hover:scale-105"
              >
                🚪 退出游戏
              </button>
          </div>
      );
  }

  // TARGETING MODE
  if (needsTarget && selectedMove) {
    const isHeal = selectedMove.type === 'HEAL';
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-800/95 rounded-2xl border border-slate-600 shadow-2xl animate-in slide-in-from-bottom-10 w-full max-w-lg mx-auto">
        <h3 className={`text-lg font-bold mb-1 ${isHeal ? 'text-green-400' : 'text-rose-400'} animate-pulse`}>
            {isHeal ? '⛑️ 选择治疗目标' : '🎯 选择攻击目标'}
        </h3>
        <p className="text-slate-300 text-sm mb-4">
            {isHeal ? '请在上方点击 自己 或 队友 的头像' : '请在上方点击 敌人 的头像'}
        </p>
        <button 
           onClick={() => onSelectMove(null)}
           className="px-8 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm text-white border border-slate-500 font-bold"
        >
          返回重选
        </button>
      </div>
    );
  }

  // Helper to get dynamic cost
  const getCost = (move: GameMove) => {
    if (player.classType === 'STRIKER' && move.variant === 'ADVANCED' && move.type === 'ATTACK') {
      return 2; 
    }
    return move.cost;
  };

  const renderCard = (title: string, moves: GameMove[], colorClass: string, icon: string) => {
    return (
      // Added hover:z-40 to ensure tooltip appears above neighboring cards. 
      // Removed overflow-hidden to allow tooltip to extend beyond bounds.
      <div className={`group/card flex flex-col bg-slate-800 border border-slate-600 rounded-lg shadow-lg flex-1 min-w-[70px] max-w-[100px] hover:z-40 relative`}>
        {/* Header - added rounded-t manually since parent overflow is visible */}
        <div className={`py-0.5 text-center ${colorClass} text-slate-900 font-bold text-[10px] tracking-wide rounded-t-[calc(0.5rem-1px)]`}>
           {icon} {title}
        </div>
        
        {/* Buttons - added rounded-b manually */}
        <div className="p-1 flex flex-col gap-1 h-full bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-[calc(0.5rem-1px)]">
          {moves.map(move => {
            const cost = getCost(move);
            // Special check for Sacrifice (needs HP)
            let canAfford = player.energy >= cost;
            if (move.type === 'SACRIFICE' && player.hp <= 1) canAfford = false;

            const isSelected = selectedMove === move;
            
            return (
              <button
                key={move.label}
                onClick={() => canAfford && onSelectMove(move)}
                disabled={!canAfford}
                className={`
                  relative group flex flex-col items-center justify-center py-1.5 px-0.5 rounded border transition-all duration-200
                  ${isSelected 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105 z-10' 
                    : 'bg-slate-700/50 border-slate-600/50'}
                  ${!canAfford 
                    ? 'opacity-40 cursor-not-allowed bg-slate-800' 
                    : 'hover:bg-slate-600 hover:border-slate-500'}
                `}
              >
                <div className="flex flex-col items-center leading-none">
                  <div className="flex items-center gap-0.5">
                     <span className="text-[10px] sm:text-xs font-bold">{move.label}</span>
                     {player.classType === 'STRIKER' && move.type === 'ATTACK' && move.variant === 'ADVANCED' && (
                        <span className="text-[6px] bg-amber-500 text-black px-0.5 rounded font-bold">UP</span>
                     )}
                  </div>
                  
                  <div className="mt-0.5">
                    {move.type === 'SACRIFICE' ? (
                         <span className="text-[8px] text-rose-400 font-mono">-1HP</span>
                    ) : (
                        <span className={`text-[8px] font-mono ${canAfford ? 'text-cyan-300' : 'text-slate-500'}`}>
                        {cost === 0 ? '0' : `-${cost}`}EP
                        </span>
                    )}
                  </div>
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-40 sm:w-48 z-[100] pointer-events-none">
                   <div className="bg-slate-950/95 backdrop-blur text-slate-200 text-[10px] p-2.5 rounded-xl border border-slate-500 shadow-2xl relative text-left">
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-500"></div>
                        
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-1.5">
                            <span className="font-bold text-white text-xs">{move.label}</span>
                            <div className="font-mono text-[9px] opacity-90 flex gap-2">
                                <span className={cost > 0 ? "text-cyan-400" : "text-slate-400"}>{cost} EP</span>
                                {move.damage && <span className="text-rose-400">{move.damage} DMG</span>}
                            </div>
                        </div>
                        <p className="leading-relaxed text-slate-300">{move.description}</p>
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
        <div className="flex gap-1.5 p-1 justify-center items-stretch">
            {renderCard('资源', [MOVES.CHARGE, MOVES.SACRIFICE], 'bg-cyan-400', '⚡')}
            {renderCard('攻击', [MOVES.ATTACK_LOW, MOVES.ATTACK_HIGH], 'bg-rose-500', '⚔️')}
            {renderCard('辅助', [MOVES.LIGHT_SHIELD, MOVES.HEAL], 'bg-amber-400', '➕')}
            {renderCard('防御', [MOVES.DEFEND_LOW, MOVES.DEFEND_HIGH], 'bg-emerald-400', '🛡️')}
        </div>
    </div>
  );
};

export default Controls;