
import React, { useState } from 'react';
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
  onConfirmMove: () => void;
  gamePhase: string;
  onDiscardCards: (indices: number[]) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  player, 
  onSelectMove, 
  selectedMove, 
  needsTarget, 
  onSpectatorNext,
  onAutoPlay,
  onQuit,
  isAutoPlaying,
  onConfirmMove,
  gamePhase,
  onDiscardCards
}) => {
  
  // State for tracking selected cards for discard
  const [discardIndices, setDiscardIndices] = useState<number[]>([]);

  // Fixed Move (Charge is always available)
  const fixedMove = MOVES['CHARGE'];

  // Helper for icons (Defined at top to avoid ReferenceError)
  const getIcon = (type: string) => {
     if (type === 'ATTACK') return '⚔️';
     if (type === 'DEFEND') return '🛡️';
     if (type === 'HEAL') return '➕';
     if (type === 'BUFF') return '💎';
     if (type === 'CHARGE' || type === 'SACRIFICE') return '⚡';
     return '🃏';
  };

  // HAND MANAGEMENT PHASE
  if (gamePhase === 'HAND_MANAGEMENT') {
      const toggleDiscard = (index: number) => {
          if (discardIndices.includes(index)) {
              setDiscardIndices(prev => prev.filter(i => i !== index));
          } else {
              setDiscardIndices(prev => [...prev, index]);
          }
      };

      return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-800/95 rounded-2xl border border-indigo-500 shadow-2xl w-full max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-indigo-400 mb-1">回合结束：调整手牌</h3>
              <p className="text-slate-400 text-sm">点击不需要的卡牌以<span className="text-rose-400 font-bold">丢弃</span>，随后将补满手牌。</p>
          </div>

          <div className="flex gap-2 justify-center mb-6 w-full overflow-x-auto pb-2">
              {player.hand.map((move, index) => {
                  const isMarked = discardIndices.includes(index);
                  return (
                      <button
                        key={`${move.uuid}-${index}`}
                        onClick={() => toggleDiscard(index)}
                        className={`
                            relative w-20 h-28 sm:w-24 sm:h-32 rounded-lg border-2 transition-all duration-200
                            flex flex-col items-center justify-center gap-1 shrink-0
                            ${isMarked 
                                ? 'bg-rose-900/30 border-rose-500 opacity-60 scale-95' 
                                : 'bg-slate-700 border-slate-500 hover:border-indigo-400 hover:-translate-y-1'}
                        `}
                      >
                          {isMarked && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <span className="text-rose-500 font-black text-3xl">🗑️</span>
                              </div>
                          )}
                          <div className="text-2xl">{getIcon(move.type)}</div>
                          <div className="text-[10px] font-bold text-center px-1 truncate w-full">{move.label}</div>
                      </button>
                  )
              })}
              {/* Placeholders for empty slots */}
              {Array.from({ length: Math.max(0, 4 - player.hand.length) }).map((_, i) => (
                   <div key={`empty-${i}`} className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center shrink-0">
                       <span className="text-slate-600 text-xs">空</span>
                   </div>
              ))}
          </div>

          <button 
             onClick={() => {
                 onDiscardCards(discardIndices);
                 setDiscardIndices([]);
             }}
             className="w-full sm:w-auto px-12 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold border border-indigo-400 shadow-lg"
          >
             确认并抽牌 ({Math.min(4, discardIndices.length + (4 - player.hand.length))}张)
          </button>
        </div>
      );
  }

  // SPECTATOR MODE
  if (!player.isAlive) {
      return (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm shadow-xl">
              {!isAutoPlaying && (
                <button 
                    onClick={onSpectatorNext}
                    className="w-full sm:w-auto px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-bold border border-slate-500 transition-all hover:scale-105"
                >
                    👀 下一回合
                </button>
              )}
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
              <button 
                onClick={onQuit}
                className="w-full sm:w-auto px-4 py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded-lg font-bold border border-rose-800 transition-all hover:scale-105"
              >
                🚪 退出游戏
              </button>
          </div>
      );
  }

  // CONFIRMATION / TARGETING MODE
  if (selectedMove) {
    const isHeal = selectedMove.type === 'HEAL';
    
    if (needsTarget) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-800/95 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200">
          <h3 className={`text-lg font-bold mb-1 ${isHeal ? 'text-green-400' : 'text-rose-400'} animate-pulse`}>
              {isHeal ? '⛑️ 选择治疗目标' : '🎯 选择攻击目标'}
          </h3>
          <p className="text-slate-300 text-sm mb-4">
              {isHeal ? '请点击 自己 或 队友 的头像' : '请点击 敌人 的头像'}
          </p>
          <button 
             onClick={() => onSelectMove(null)}
             className="px-8 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm text-white border border-slate-500 font-bold"
          >
            取消 / 重选
          </button>
        </div>
      );
    } 
    
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-800/95 rounded-2xl border border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)] w-full max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-300">
          <div className="text-center mb-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">准备释放</div>
              <div className="text-xl font-black text-white">{selectedMove.label}</div>
              <div className="text-xs text-cyan-400 font-mono mt-1">消耗: {selectedMove.cost} EP</div>
              <div className="text-xs text-slate-500 mt-2">{selectedMove.description}</div>
          </div>

          <div className="flex gap-4 w-full">
            <button 
                onClick={() => onSelectMove(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 font-bold border border-slate-600"
            >
                取消
            </button>
            <button 
                onClick={onConfirmMove}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold border border-cyan-400 shadow-lg transform active:scale-95 transition-all"
            >
                确认行动
            </button>
          </div>
      </div>
    );
  }

  // Helper to get dynamic cost
  const getCost = (move: GameMove) => {
    if (player.classType === 'STRIKER' && move.variant === 'ADVANCED' && move.type === 'ATTACK') {
      return Math.max(0, move.cost - 1); 
    }
    return move.cost;
  };

  // Helper for colors
  const getCardStyle = (move: GameMove, canAfford: boolean) => {
    let glowColor = 'slate-500';
    let bgGradient = 'from-slate-800 to-slate-900';

    if (move.type === 'ATTACK') { glowColor = 'rose-500'; bgGradient = 'from-rose-900/40 to-slate-900'; }
    if (move.type === 'DEFEND') { glowColor = 'emerald-500'; bgGradient = 'from-emerald-900/40 to-slate-900'; }
    if (move.type === 'HEAL') { glowColor = 'green-500'; bgGradient = 'from-green-900/40 to-slate-900'; }
    if (move.type === 'BUFF') { glowColor = 'amber-500'; bgGradient = 'from-amber-900/40 to-slate-900'; }
    if (move.type === 'CHARGE' || move.type === 'SACRIFICE') { glowColor = 'cyan-500'; bgGradient = 'from-cyan-900/40 to-slate-900'; }

    return `
        bg-gradient-to-b ${bgGradient}
        ${canAfford ? 'hover:scale-105 hover:-translate-y-2 cursor-pointer shadow-lg' : 'opacity-40 grayscale cursor-not-allowed'}
        ${canAfford ? `hover:border-${glowColor} hover:shadow-${glowColor}/40` : ''}
    `;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-1 flex flex-col md:flex-row gap-4 items-end md:items-stretch">
        
        {/* Fixed Skill Area (Charge) */}
        <div className="flex-shrink-0 flex justify-center md:items-end w-full md:w-auto pb-4 md:pb-0">
             <button
                onClick={() => onSelectMove(fixedMove)}
                className="w-full md:w-28 h-12 md:h-44 rounded-xl border border-cyan-500/50 bg-slate-800 hover:bg-slate-700 flex md:flex-col items-center justify-center gap-2 md:gap-4 transition-all shadow-lg group relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-2xl md:text-4xl">⚡</div>
                <div className="flex flex-col items-start md:items-center">
                    <div className="font-bold text-cyan-400 text-sm md:text-base">积攒能量</div>
                    <div className="text-[10px] text-slate-400 md:hidden">固定技能</div>
                </div>
                <div className="ml-auto md:ml-0 md:mt-2 text-[10px] font-mono text-slate-500 border border-slate-600 px-1 rounded">0 EP</div>
             </button>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-700 mx-2 h-full"></div>

        {/* Scrollable Hand Container */}
        <div className="flex-1 flex overflow-x-auto pb-4 gap-2 md:gap-3 px-1 snap-x snap-mandatory hide-scrollbar justify-start items-end min-h-[160px]">
            {player.hand.length === 0 && (
                <div className="w-full h-32 flex items-center justify-center text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded-xl">
                    空手牌
                </div>
            )}
            
            {player.hand.map((move, index) => {
                 const cost = getCost(move);
                 let canAfford = player.energy >= cost;
                 // Special check for Sacrifice
                 if (move.type === 'SACRIFICE' && player.hp <= 1) canAfford = false;

                 return (
                    <button
                        key={`${move.uuid}-${index}`}
                        onClick={() => canAfford && onSelectMove(move)}
                        disabled={!canAfford}
                        className={`
                           relative group flex-shrink-0 w-24 sm:w-28 md:w-32 h-36 md:h-44 rounded-xl border border-slate-700 transition-all duration-300 snap-center
                           ${getCardStyle(move, canAfford)}
                        `}
                    >
                        {/* Cost Badge */}
                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border bg-slate-900 ${canAfford ? 'text-cyan-400 border-cyan-500' : 'text-slate-500 border-slate-600'}`}>
                            {cost}
                        </div>

                        {/* Icon */}
                        <div className="mt-6 md:mt-8 text-3xl md:text-4xl text-center mb-2 drop-shadow-md">
                            {getIcon(move.type)}
                        </div>

                        {/* Title */}
                        <div className={`text-center font-bold text-xs md:text-sm px-1 mb-1 ${canAfford ? 'text-white' : 'text-slate-400'}`}>
                            {move.label}
                        </div>

                        {/* Type Label */}
                        <div className="text-center">
                             <span className={`text-[8px] md:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 ${canAfford ? 'text-slate-300' : 'text-slate-600'}`}>
                                 {move.type}
                             </span>
                        </div>

                        {/* Description Tooltip (Desktop) */}
                        <div className="hidden md:block absolute inset-0 bg-slate-900/95 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-center text-center border border-slate-500 pointer-events-none z-10">
                             <p className="text-[10px] text-slate-300 leading-relaxed">{move.description}</p>
                             {move.damage && <div className="mt-2 text-rose-400 font-bold text-xs">{move.damage} DMG</div>}
                        </div>
                    </button>
                 );
            })}
        </div>
    </div>
  );
};

export default Controls;
