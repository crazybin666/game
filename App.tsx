import React, { useState, useEffect } from 'react';
import { Player, GameMove, LogEntry, GamePhase, ClassType, TeamId } from './types';
import { MOVES, CLASSES } from './constants';
import PlayerArea from './components/PlayerArea';
import Controls from './components/Controls';
import GameLog from './components/GameLog';
import { AnimatePresence, motion } from 'framer-motion';

const App = () => {
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedMove, setSelectedMove] = useState<GameMove | null>(null);
  const [needsTarget, setNeedsTarget] = useState(false);
  const [validTargetIds, setValidTargetIds] = useState<number[]>([]);
  const [winner, setWinner] = useState<{name: string, team: TeamId} | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  
  // Setup State
  const [playerCount, setPlayerCount] = useState(2);
  const [gameMode, setGameMode] = useState<'FFA' | 'TEAM'>('FFA');

  // Helper to add log
  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), round, text, type }]);
  };

  const goToClassSelection = (count: number, mode: 'FFA' | 'TEAM') => {
    setPlayerCount(count);
    setGameMode(mode);
    setPhase('CLASS_SELECTION');
  };

  const startGame = (playerClass: ClassType) => {
    setIsAutoPlaying(false); // Reset auto play
    // Generate Players
    const newPlayers: Player[] = Array(playerCount).fill(0).map((_, i) => {
      const isHuman = i === 0;
      
      // Determine Class
      let pClass: ClassType;
      if (isHuman) {
        pClass = playerClass;
      } else {
        const classKeys = Object.keys(CLASSES) as ClassType[];
        pClass = classKeys[Math.floor(Math.random() * classKeys.length)];
      }
      
      const classData = CLASSES[pClass];
      
      // Determine Team
      let team: TeamId = 'NONE';
      if (gameMode === 'TEAM') {
        const half = playerCount / 2;
        if (i < half) team = 'A';
        else team = 'B';
      }

      return {
        id: i + 1,
        name: isHuman ? '你' : (gameMode === 'TEAM' && team === 'A' ? `队友 ${i}` : `电脑 ${i}`),
        team: team,
        classType: pClass,
        isHuman: isHuman,
        hp: classData.baseHp,
        maxHp: classData.baseHp,
        energy: classData.baseEnergy,
        maxEnergy: 10,
        shield: 0,
        isAlive: true,
        status: isHuman ? 'READY' : 'IDLE',
        damageTakenThisRound: 0,
        energyGainedThisRound: 0,
        hpRecoveredThisRound: 0,
      };
    });

    setPlayers(newPlayers);
    setPhase('PLANNING');
    setRound(1);
    setLogs([]);
    setWinner(null);
    
    if (gameMode === 'TEAM') {
      addLog(`团队模式启动！你属于 🟦 蓝队。击败所有红队成员获胜！`, 'info');
    } else {
      addLog(`大乱斗模式启动！成为最后的幸存者！`, 'info');
    }
  };

  const quitToMenu = () => {
      setPhase('LOBBY');
      setPlayers([]);
      setWinner(null);
      setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
      const newState = !isAutoPlaying;
      setIsAutoPlaying(newState);
      if (newState && phase === 'PLANNING') {
          handleSpectatorNext();
      }
  };

  // Bot Logic
  const calculateBotMove = (bot: Player, allPlayers: Player[]): { move: GameMove, targetId?: number } => {
    const isStriker = bot.classType === 'STRIKER';
    const highAttackCost = isStriker ? 2 : 3;
    const allies = allPlayers.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team === bot.team : p.id === bot.id));
    const enemies = allPlayers.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team !== bot.team : p.id !== bot.id));

    // 1. Determine valid moves
    const validMoves: GameMove[] = [MOVES.CHARGE, MOVES.DEFEND_LOW];
    
    // Sacrifice logic: Only if HP > 2 and Energy low
    if (bot.hp > 2 && bot.energy < 2) {
        validMoves.push(MOVES.SACRIFICE);
    }

    if (bot.energy >= 1) {
      validMoves.push(MOVES.ATTACK_LOW);
      validMoves.push(MOVES.DEFEND_HIGH);
      validMoves.push(MOVES.LIGHT_SHIELD);
    }
    
    if (bot.energy >= 2) {
       // Heal logic: Only if self or ally is hurt
       const hurtAlly = allies.find(a => a.hp < a.maxHp);
       if (hurtAlly) validMoves.push(MOVES.HEAL);
    }
    
    if (bot.energy >= highAttackCost) {
      validMoves.push(MOVES.ATTACK_HIGH);
    }

    // 2. Select move (Weighted Random with Heuristics)
    let move = validMoves[Math.floor(Math.random() * validMoves.length)];
    
    // Logic overrides
    // Low HP? Defend or Heal
    if (bot.hp === 1 && bot.energy >= 2 && validMoves.includes(MOVES.HEAL)) {
        move = MOVES.HEAL; // Self heal or ally heal priority
    } else if (bot.hp === 1 && bot.energy >= 1 && validMoves.includes(MOVES.DEFEND_HIGH)) {
        move = MOVES.DEFEND_HIGH;
    }

    // High Energy? Attack!
    if (bot.energy >= highAttackCost && enemies.length > 0 && Math.random() > 0.3) {
      move = MOVES.ATTACK_HIGH;
    }

    // 3. Select target
    let targetId;
    
    if (move.type === 'ATTACK') {
       if (enemies.length > 0) {
           // Target lowest HP enemy
           const weakEnemy = enemies.sort((a,b) => a.hp - b.hp)[0];
           // Sometimes random to be unpredictable
           targetId = Math.random() > 0.7 ? enemies[Math.floor(Math.random()*enemies.length)].id : weakEnemy.id;
       } else {
           move = MOVES.CHARGE; // No enemies? fallback
       }
    } else if (move.type === 'HEAL') {
        // Heal most hurt ally
        const hurtAlly = allies.sort((a,b) => a.hp - b.hp)[0];
        targetId = hurtAlly ? hurtAlly.id : bot.id;
    }

    return { move, targetId };
  };

  const handleHumanSelectMove = (move: GameMove | null) => {
    // If spectator mode (dead), this shouldn't really be called for moves, but just in case
    if (!move) {
        setSelectedMove(null);
        setNeedsTarget(false);
        setValidTargetIds([]);
        return;
    }

    const human = players[0];
    if (!human.isAlive) return;

    if (move.type === 'ATTACK') {
      // Valid targets: Enemies
      const enemies = players.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team !== human.team : p.id !== human.id));
      if (enemies.length === 0) return; // Should win before this
      
      if (enemies.length === 1) {
          handleConfirmMove(move, enemies[0].id);
      } else {
          setSelectedMove(move);
          setNeedsTarget(true);
          setValidTargetIds(enemies.map(p => p.id));
      }
    } else if (move.type === 'HEAL') {
      // Valid targets: Allies (including self)
      const allies = players.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team === human.team : p.id === human.id));
      
      setSelectedMove(move);
      setNeedsTarget(true);
      setValidTargetIds(allies.map(p => p.id));
    } else {
      // Non-targeted moves
      handleConfirmMove(move);
    }
  };

  // Used when the player is dead but game continues
  const handleSpectatorNext = () => {
      setPhase('REVEALING');
  };

  const handleTargetClick = (targetId: number) => {
    if (!needsTarget || !selectedMove) return;
    if (!validTargetIds.includes(targetId)) return;

    handleConfirmMove(selectedMove, targetId);
    setNeedsTarget(false);
    setValidTargetIds([]);
  };

  const handleConfirmMove = (move: GameMove, targetId?: number) => {
    const updatedPlayers = players.map(p => 
      p.isHuman ? { ...p, lastMove: move, lastTargetId: targetId, status: 'READY' as const } : p
    );
    setPlayers(updatedPlayers);
    setSelectedMove(null);
    setValidTargetIds([]);
    setPhase('REVEALING');
  };

  // Auto Play Logic Loop
  useEffect(() => {
    if (isAutoPlaying && phase === 'PLANNING' && !winner) {
        // If human is dead and we are auto-playing, trigger next turn automatically
        const timer = setTimeout(() => {
            handleSpectatorNext();
        }, 300); // Short delay for fast forward
        return () => clearTimeout(timer);
    }
  }, [phase, isAutoPlaying, winner]);

  useEffect(() => {
    if (phase === 'REVEALING') {
      // Speed up reveal if auto-playing
      const delay = isAutoPlaying ? 300 : 1500;
      const timer = setTimeout(() => {
        resolveTurn();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [phase, isAutoPlaying]);

  const resolveTurn = () => {
    let currentPlayers = [...players];
    const logsToAdd: string[] = [];

    // 1. Bot Decisions
    currentPlayers = currentPlayers.map(p => {
      if (!p.isHuman && p.isAlive) {
        const { move, targetId } = calculateBotMove(p, currentPlayers);
        return { ...p, lastMove: move, lastTargetId: targetId, status: 'READY' };
      }
      return p;
    });

    setPhase('RESOLVING');
    
    // Reset round stats
    currentPlayers.forEach(p => {
      p.damageTakenThisRound = 0;
      p.energyGainedThisRound = 0;
      p.hpRecoveredThisRound = 0;
    });

    // 2. Pay Costs & Self-Effects (Charge, Sacrifice, Shield Up)
    currentPlayers.forEach(p => {
      if (!p.isAlive || !p.lastMove) return;

      let cost = p.lastMove.cost;
      if (p.classType === 'STRIKER' && p.lastMove.type === 'ATTACK' && p.lastMove.variant === 'ADVANCED') {
        cost = 2; 
      }
      p.energy -= cost;

      if (p.lastMove.type === 'CHARGE') {
        p.energy += 1;
        p.energyGainedThisRound += 1;
      } else if (p.lastMove.type === 'SACRIFICE') {
        p.hp -= 1;
        p.energy += 2;
        p.energyGainedThisRound += 2;
        p.damageTakenThisRound += 1; // Visual feedback
        logsToAdd.push(`${p.name} 使用【燃血】，牺牲生命换取了能量！`);
      } else if (p.lastMove.type === 'BUFF' && p.lastMove.label === '光盾') {
        p.shield += 1;
        logsToAdd.push(`${p.name} 开启【光盾】，护盾值 +1。`);
      }
    });

    // 3. Resolve Healing (Before attacks to save lives)
    currentPlayers.forEach(actor => {
        if (!actor.isAlive || actor.lastMove?.type !== 'HEAL' || !actor.lastTargetId) return;
        const target = currentPlayers.find(p => p.id === actor.lastTargetId);
        if (target && target.isAlive) {
            target.hp = Math.min(target.hp + 1, target.maxHp);
            target.hpRecoveredThisRound = (target.hpRecoveredThisRound || 0) + 1;
            logsToAdd.push(`${actor.name} 治愈了 ${target.name}。`);
        }
    });

    // 4. Resolve Attacks
    currentPlayers.forEach(attacker => {
      if (!attacker.isAlive || attacker.lastMove?.type !== 'ATTACK' || !attacker.lastTargetId) return;

      const target = currentPlayers.find(p => p.id === attacker.lastTargetId);
      if (!target || !target.isAlive) return;

      const attack = attacker.lastMove;
      const defense = target.lastMove; 

      let hit = false;
      let blocked = false;
      let shieldAbsorbed = false;

      // Defense Logic
      if (defense?.type === 'DEFEND') {
        if (defense.variant === 'ADVANCED') {
          blocked = true;
          logsToAdd.push(`${target.name} 开启【绝对防御】抵消了 ${attacker.name} 的攻击！`);
        } else if (attack.variant === 'BASIC') {
           blocked = true;
           logsToAdd.push(`${target.name} 轻松格挡了 ${attacker.name} 的冲击波。`);
        } else {
           // Basic defend vs High attack
           hit = true;
           logsToAdd.push(`${target.name} 试图格挡，但被 ${attacker.name} 的【元气弹】贯穿！`);
        }
      } else {
         // No active defense card
         hit = true;
      }

      // Damage Application
      if (hit && !blocked) {
         let dmg = attack.damage || 1;
         
         // Check Passive Shield (Light Shield) vs Basic Attack
         if (attack.variant === 'BASIC' && target.shield > 0) {
             target.shield -= 1;
             shieldAbsorbed = true;
             logsToAdd.push(`${attacker.name} 的攻击被 ${target.name} 的【光盾】抵消了！`);
         } else {
             if (attack.variant === 'BASIC') {
                 logsToAdd.push(`${attacker.name} 击中了 ${target.name}！`);
             } else {
                 // Advanced attack ignores light shield
                 if (target.shield > 0) {
                     logsToAdd.push(`${attacker.name} 的必杀技无视了 ${target.name} 的光盾！`);
                 } else {
                     logsToAdd.push(`${attacker.name} 狠狠地击中了 ${target.name}！`);
                 }
             }
             
             target.hp -= dmg;
             target.damageTakenThisRound += dmg;
         }
      }
    });

    setPlayers([...currentPlayers]);
    logsToAdd.forEach(l => addLog(l, 'combat'));

    // 5. Check Deaths & Winner
    // Speed up resolution if auto-playing
    const resolveDelay = isAutoPlaying ? 500 : 1500;
    
    setTimeout(() => {
      const survivors = currentPlayers.filter(p => p.hp > 0);
      
      // Update deaths
      currentPlayers.forEach(p => {
        if (p.hp <= 0 && p.isAlive) {
          p.isAlive = false;
          p.status = 'ELIMINATED';
          addLog(`${p.name} 被击败了！`, 'death');
        }
      });

      setPlayers([...currentPlayers]);

      // Win Condition
      let isGameOver = false;

      if (gameMode === 'FFA') {
          if (survivors.length <= 1) {
              isGameOver = true;
              if (survivors.length === 1) {
                  setWinner({ name: survivors[0].name, team: survivors[0].team });
                  addLog(`🏆 胜利者是 ${survivors[0].name}！`, 'win');
              } else {
                  setWinner(null); // Draw
                  addLog(`同归于尽！`, 'win');
              }
          }
      } else {
          // Team Mode
          const teamAAlive = survivors.some(p => p.team === 'A');
          const teamBAlive = survivors.some(p => p.team === 'B');
          
          if (!teamAAlive || !teamBAlive) {
              isGameOver = true;
              if (teamAAlive) {
                  setWinner({ name: '蓝队', team: 'A' });
                  addLog(`🏆 蓝队获胜！`, 'win');
              } else if (teamBAlive) {
                  setWinner({ name: '红队', team: 'B' });
                  addLog(`🏆 红队获胜！`, 'win');
              } else {
                  setWinner(null);
                  addLog(`平局！`, 'win');
              }
          }
      }

      if (isGameOver) {
        setPhase('GAME_OVER');
        setIsAutoPlaying(false); // Stop auto play on finish
      } else {
        setTimeout(() => {
          setRound(r => r + 1);
          setPhase('PLANNING');
          setNeedsTarget(false);
          setPlayers(prev => prev.map(p => ({
            ...p,
            lastMove: undefined,
            lastTargetId: undefined,
            status: p.isAlive ? (p.isHuman ? 'READY' : 'IDLE') : 'ELIMINATED',
            damageTakenThisRound: 0,
            energyGainedThisRound: 0,
            hpRecoveredThisRound: 0
          })));
        }, resolveDelay); 
      }
    }, resolveDelay); // Wait for animations
  };

  // Group players for rendering
  const myTeam = players[0]?.team || 'NONE';
  const enemies = players.filter(p => (gameMode === 'TEAM' ? p.team !== myTeam : p.id !== 1));
  const myTeamMembers = players.filter(p => (gameMode === 'TEAM' ? p.team === myTeam : p.id === 1));

  const bottomRowPlayers = myTeamMembers.sort((a, b) => a.id - b.id);

  // Guide Hint Logic
  const getGuideHint = () => {
      if (winner) return "游戏结束！点击返回大厅。";
      if (phase === 'PLANNING') {
          if (!players[0]?.isAlive) {
             if (isAutoPlaying) return "正在快进中...";
             return "你已阵亡。请选择观战选项。";
          }
          if (needsTarget) return selectedMove?.type === 'HEAL' ? "请点击队友头像进行治疗" : "请点击敌人头像进行攻击";
          if (selectedMove) return "点击确定使用卡牌";
          return "你的回合：请选择一张行动卡牌";
      }
      if (phase === 'REVEALING') return "正在锁定指令...";
      if (phase === 'RESOLVING') return "正在结算战斗结果...";
      return "准备中...";
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center relative font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full bg-slate-950 border-b border-slate-800 p-2 md:p-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-2">
           <button onClick={() => setShowManual(true)} className="w-8 h-8 rounded-full border border-slate-600 bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors" title="游戏说明">?</button>
           <h1 className="text-xl font-bold tracking-wider text-slate-100 font-display">
             ENERGY <span className="text-rose-500 text-shadow-red">DUEL</span>
           </h1>
        </div>
        <div className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
           ROUND <span className="text-white font-bold">{round}</span>
        </div>
      </div>

      {/* MANUAL MODAL */}
      <AnimatePresence>
      {showManual && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
           >
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">游戏说明书</h2>
                  <button onClick={() => setShowManual(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <section>
                      <h3 className="font-bold text-cyan-400 text-lg mb-2">基本规则</h3>
                      <p>每回合所有玩家同时选择一个行动。目标是耗尽对手的 HP。</p>
                  </section>
                  <section>
                      <h3 className="font-bold text-emerald-400 text-lg mb-2">行动卡牌</h3>
                      <ul className="space-y-2 list-disc pl-5">
                          <li><strong className="text-white">积攒</strong> (0费): 获得 1 能量。</li>
                          <li><strong className="text-white">冲击波</strong> (1费): 造成 1 伤害。可被普通格挡和光盾抵消。</li>
                          <li><strong className="text-white">元气弹</strong> (3费): 造成 2 伤害。无视普通格挡和光盾。</li>
                          <li><strong className="text-white">格挡</strong> (0费): 本回合抵挡普通攻击。</li>
                          <li><strong className="text-white">绝对防御</strong> (1费): 本回合抵挡所有伤害。</li>
                          <li><strong className="text-white">燃血</strong> (0费): <span className="text-rose-400">扣除 1 HP</span>，获得 2 能量。</li>
                          <li><strong className="text-white">光盾</strong> (1费): 获得 1 层永久护盾。护盾可抵消 1 次普通攻击（对元气弹无效）。</li>
                          <li><strong className="text-white">治愈</strong> (2费): 指定一名队友（或自己）恢复 1 HP。</li>
                      </ul>
                  </section>
                  <section>
                      <h3 className="font-bold text-indigo-400 text-lg mb-2">模式说明</h3>
                      <p><strong>大乱斗</strong>：各自为战，活到最后。</p>
                      <p><strong>团队战</strong>：红蓝对抗，击败对方全员获胜。记得保护队友！玩家阵亡后可继续观战。</p>
                  </section>
              </div>
              <button onClick={() => setShowManual(false)} className="w-full mt-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500">我明白了</button>
           </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* LOBBY */}
      {phase === 'LOBBY' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in fade-in zoom-in duration-500">
           <div className="max-w-xl w-full bg-slate-800/80 backdrop-blur p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
             <h2 className="text-3xl font-display font-bold mb-2 text-white tracking-widest">NEW GAME</h2>
             <p className="text-slate-400 mb-8 text-sm">选择游戏模式</p>
             
             {/* Mode Selection */}
             <div className="space-y-8">
                 <div>
                    <h3 className="text-indigo-400 font-bold mb-3 uppercase text-xs tracking-wider">大乱斗 (Free For All)</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {[2, 3, 4, 6, 8].map(num => (
                            <button key={num} onClick={() => goToClassSelection(num, 'FFA')} className="py-2.5 rounded-lg bg-slate-700 hover:bg-indigo-600 transition-colors border border-slate-600 font-bold text-sm md:text-base">{num}人</button>
                        ))}
                    </div>
                 </div>
                 
                 <div className="h-px bg-slate-700 w-full" />

                 <div>
                    <h3 className="text-rose-400 font-bold mb-3 uppercase text-xs tracking-wider">团队战 (Team Battle)</h3>
                    <div className="grid grid-cols-4 gap-2">
                         <button onClick={() => goToClassSelection(2, 'TEAM')} className="py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 transition-colors border border-slate-600 font-bold text-sm md:text-base">1v1</button>
                         <button onClick={() => goToClassSelection(4, 'TEAM')} className="py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 transition-colors border border-slate-600 font-bold text-sm md:text-base">2v2</button>
                         <button onClick={() => goToClassSelection(6, 'TEAM')} className="py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 transition-colors border border-slate-600 font-bold text-sm md:text-base">3v3</button>
                         <button onClick={() => goToClassSelection(8, 'TEAM')} className="py-2.5 rounded-lg bg-slate-700 hover:bg-rose-600 transition-colors border border-slate-600 font-bold text-sm md:text-base">4v4</button>
                    </div>
                 </div>
             </div>
           </div>
        </div>
      )}

      {/* CLASS SELECTION */}
      {phase === 'CLASS_SELECTION' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl w-full">
             <h2 className="text-2xl font-bold mb-6 text-center text-white">选择你的职业</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {(Object.values(CLASSES) as any[]).map((cls) => (
                 <div 
                    key={cls.id}
                    onClick={() => startGame(cls.id)}
                    className="group bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-indigo-500 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                 >
                    <div className="text-6xl mb-4 text-center">{cls.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2 text-center">{cls.name}</h3>
                    <div className="flex justify-center gap-2 mb-4 text-xs font-mono">
                       <span className="bg-rose-900/50 text-rose-300 px-2 py-1 rounded border border-rose-800">HP {cls.baseHp}</span>
                       <span className="bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded border border-cyan-800">ENG {cls.baseEnergy}</span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed text-center">{cls.description}</p>
                 </div>
               ))}
             </div>
             <button onClick={() => setPhase('LOBBY')} className="mt-8 block mx-auto text-slate-500 hover:text-slate-300">返回</button>
          </div>
        </div>
      )}

      {/* BATTLE ARENA */}
      {['PLANNING', 'REVEALING', 'RESOLVING', 'GAME_OVER'].includes(phase) && (
        <div className="flex-1 w-full max-w-7xl flex flex-col p-2 md:p-4 gap-2 justify-between">
          
          {/* TURN GUIDE BANNER */}
          <div className="w-full flex justify-center mb-1">
              <div className={`
                 px-6 py-1.5 rounded-full border text-xs sm:text-sm font-bold shadow-lg transition-all duration-300
                 ${phase === 'PLANNING' && needsTarget ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse' : ''}
                 ${phase === 'PLANNING' && !needsTarget ? 'bg-blue-500/20 border-blue-500 text-blue-200' : ''}
                 ${phase === 'RESOLVING' ? 'bg-rose-500/20 border-rose-500 text-rose-200' : ''}
              `}>
                  {getGuideHint()}
              </div>
          </div>

          {/* TOP ROW: ENEMIES */}
          <div className="flex flex-col items-center w-full gap-2">
            <h3 className="text-rose-500 text-[10px] font-bold tracking-widest uppercase">
                {gameMode === 'TEAM' ? 'Enemy Team' : 'Opponents'}
            </h3>
            <div className="flex justify-center gap-2 flex-wrap content-start">
                {enemies.map(p => (
                <PlayerArea 
                    key={p.id} 
                    player={p} 
                    isCurrentPlayer={false}
                    showMove={phase === 'RESOLVING' || phase === 'GAME_OVER'}
                    isTarget={needsTarget && validTargetIds.includes(p.id)}
                    onClick={() => handleTargetClick(p.id)}
                />
                ))}
            </div>
          </div>

          {/* MIDDLE: INFO / LOGS */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 relative min-h-[120px] my-1">
            {winner ? (
              <div className="text-center animate-in zoom-in duration-700 z-50 bg-slate-900/95 p-8 rounded-3xl border border-amber-500/50 shadow-2xl">
                <div className="text-6xl mb-4 animate-bounce">🏆</div>
                <h2 className="text-3xl md:text-4xl font-black text-amber-400 mb-2">
                  {gameMode === 'TEAM' ? (winner.team === 'A' ? 'VICTORY' : 'DEFEAT') : (winner.team ? (winner.name === players[0].name ? 'VICTORY' : 'DEFEAT') : 'DRAW')}
                </h2>
                <p className="text-slate-400 mb-6">{winner ? `${winner.name} 获胜` : '无人幸存'}</p>
                <button 
                  onClick={() => setPhase('LOBBY')}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-105"
                >
                  返回大厅
                </button>
              </div>
            ) : (
               <div className="w-full max-w-xl">
                   <GameLog logs={logs} />
               </div>
            )}
          </div>

          {/* BOTTOM ROW: ALLIES & PLAYER */}
          <div className="flex flex-col items-center justify-end pb-safe gap-2">
             <h3 className="text-blue-500 text-[10px] font-bold tracking-widest uppercase">
                {gameMode === 'TEAM' ? 'My Team' : 'Player'}
             </h3>

             {/* Controls (Only if player is present in game data) */}
             {players[0] && phase === 'PLANNING' && (
                 <div className="w-full animate-in slide-in-from-bottom-20 duration-500 mb-2 z-50">
                   <Controls 
                      player={players[0]}
                      onSelectMove={handleHumanSelectMove}
                      selectedMove={selectedMove}
                      needsTarget={needsTarget}
                      onSpectatorNext={handleSpectatorNext}
                      onAutoPlay={toggleAutoPlay}
                      onQuit={quitToMenu}
                      isAutoPlaying={isAutoPlaying}
                   />
                 </div>
             )}

             {/* Player Cards Row */}
             <div className="flex justify-center gap-2 flex-wrap">
                {bottomRowPlayers.map(p => (
                   <div key={p.id} className="relative">
                      <PlayerArea 
                        player={p} 
                        isCurrentPlayer={p.isHuman}
                        showMove={phase === 'RESOLVING' || phase === 'GAME_OVER'}
                        isTarget={needsTarget && validTargetIds.includes(p.id)}
                        onClick={() => handleTargetClick(p.id)}
                      />
                      {p.isHuman && !p.isAlive && phase === 'PLANNING' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                              <div className="text-rose-500 font-bold text-xs md:text-sm uppercase tracking-widest border-2 border-rose-500 p-1 px-2 rounded bg-black/50 backdrop-blur-sm transform -rotate-6 shadow-xl">
                                  阵亡 - 观战中
                              </div>
                          </div>
                      )}
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;