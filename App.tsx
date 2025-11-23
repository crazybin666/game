import React, { useState, useEffect } from 'react';
import { Player, GameMove, LogEntry, GamePhase, ClassType, TeamId, GameMode, AdventureState, AdventureNode, ShopItem, Difficulty, PlayerClassData } from './types';
import { MOVES, CLASSES, SHOP_ITEMS, DIFFICULTIES, SPECIAL_MOVES, STANDARD_DECK, MAX_HAND_SIZE, MULTIPLAYER_EXTRA_CARDS, CLASS_BONUS_CARDS } from './constants';
import PlayerArea from './components/PlayerArea';
import Controls from './components/Controls';
import GameLog from './components/GameLog';
import AdventureMap from './components/AdventureMap';
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
  
  // New States
  const [lootOptions, setLootOptions] = useState<(GameMove | ShopItem)[]>([]);
  const [previewClass, setPreviewClass] = useState<ClassType | null>(null);
  const [eventOutcome, setEventOutcome] = useState<{title: string, desc: string, reward?: string} | null>(null);

  // Setup State
  const [playerCount, setPlayerCount] = useState(2);
  const [gameMode, setGameMode] = useState<GameMode>('FFA');

  // Adventure State
  const [adventureData, setAdventureData] = useState<AdventureState>({
    currentStage: 1,
    currentFloor: 0,
    gold: 0,
    maxHpMod: 0,
    permanentBuffs: [],
    map: [],
    difficulty: 'NORMAL',
    deck: [],
    cardLevels: {}
  });

  // --- CARD SYSTEM HELPERS ---
  const generateUuid = () => Math.random().toString(36).substring(2, 9);

  const applyCardLevel = (move: GameMove, level: number): GameMove => {
      if (!level || level <= 1) return move;
      const upgraded = { ...move };
      upgraded.level = level;
      
      const suffix = ` (+${level-1})`;

      // Scaling Logic
      if (move.type === 'ATTACK' && move.damage) {
          upgraded.damage += Math.floor((level - 1)); // +1 dmg per level
          upgraded.label += suffix;
          upgraded.description = upgraded.description?.replace(/(\d+)\s*点/, (match, p1) => `${parseInt(p1) + (level-1)} 点`);
      } else if (move.id === 'LIGHT_SHIELD' || move.id === 'DEFEND_LOW') {
          upgraded.label += suffix;
          upgraded.description += ` (等级加成: 额外+${level-1})`;
      } else if (move.type === 'HEAL') {
           upgraded.label += suffix;
      }

      return upgraded;
  };

  const createDeckIds = (source: string[]) => {
      return [...source];
  };

  const shuffle = (array: string[]) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
  };

  const drawCards = (player: Player, count: number): Player => {
      let newHand = [...player.hand];
      let newDrawPile = [...player.drawPile];
      let newDiscardPile = [...player.discardPile];

      for (let i = 0; i < count; i++) {
          if (newDrawPile.length === 0) {
              if (newDiscardPile.length === 0) break; // No cards left
              // Reshuffle
              newDrawPile = shuffle([...newDiscardPile]);
              newDiscardPile = [];
          }
          const cardId = newDrawPile.pop();
          if (cardId) {
              let baseMove = MOVES[cardId] || SPECIAL_MOVES.find(m => m.id === cardId);
              
              if (baseMove) {
                  // Apply Upgrades if present in player data
                  if (player.cardLevels && player.cardLevels[cardId]) {
                      baseMove = applyCardLevel(baseMove, player.cardLevels[cardId]);
                  }
                  newHand.push({ ...baseMove, uuid: generateUuid() });
              }
          }
      }

      return {
          ...player,
          hand: newHand,
          drawPile: newDrawPile,
          discardPile: newDiscardPile
      };
  };

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), round, text, type }]);
  };

  const goToClassSelection = (count: number, mode: GameMode) => {
    setPlayerCount(count);
    setGameMode(mode);
    setPhase('CLASS_SELECTION');
  };

  // --- MAP GENERATION ALGORITHM ---
  const generateDungeonMap = (stage: number): AdventureNode[][] => {
      // Map size is relatively small per stage, ending with a boss
      const totalRows = 7; 
      const map: AdventureNode[][] = [];
      const rowWidths = [1, 2, 2, 3, 2, 2, 1]; 

      for (let i = 0; i < totalRows; i++) {
          const row: AdventureNode[] = [];
          const width = rowWidths[Math.min(i, rowWidths.length - 1)] || 2;
          
          for (let j = 0; j < width; j++) {
              let type: AdventureNode['type'] = 'BATTLE';
              
              if (i === 0) type = 'START';
              else if (i === totalRows - 1) type = 'BOSS';
              else if (i === 3) type = 'SHOP';
              else if (i % 2 === 0) type = Math.random() > 0.6 ? 'REST' : 'EVENT';
              else type = Math.random() > 0.4 ? 'BATTLE' : (Math.random() > 0.5 ? 'ELITE' : 'EVENT');

              const node: AdventureNode = {
                  id: `node-s${stage}-r${i}-c${j}`,
                  row: i,
                  col: j,
                  type,
                  label: type === 'BATTLE' ? '敌人' : (type === 'ELITE' ? '强敌' : (type === 'EVENT' ? '机遇' : type)),
                  difficulty: i + (stage * 2),
                  icon: type === 'BATTLE' ? '👾' : (type === 'ELITE' ? '👿' : (type === 'EVENT' ? '❓' : '')),
                  description: '',
                  status: i === 0 ? 'AVAILABLE' : 'LOCKED',
                  nextNodes: []
              };
              row.push(node);
          }
          map.push(row);
      }
      
      // Calculate links
      for (let i = 0; i < totalRows - 1; i++) {
          const currentRow = map[i];
          const nextRow = map[i+1];
          
          currentRow.forEach((node, colIndex) => {
               const ratio = (colIndex) / (currentRow.length);
               nextRow.forEach((nextNode, nextColIndex) => {
                   const nextRatio = nextColIndex / nextRow.length;
                   if (Math.abs(ratio - nextRatio) < 0.6) {
                       node.nextNodes.push(nextNode.id);
                   }
               });
               if (node.nextNodes.length === 0) {
                   node.nextNodes.push(nextRow[Math.floor(nextRow.length * ratio)].id);
               }
          });
      }

      return map;
  };

  const handleAdventureNodeSelect = (node: AdventureNode) => {
      if (node.type === 'START') {
          completeAdventureNode(node);
          return;
      }

      if (node.type === 'SHOP') {
          setPhase('SHOP');
      } else if (node.type === 'REST') {
          const p = players[0]; 
          if (players.length > 0) {
            const healAmount = Math.ceil(p.maxHp * 0.5);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            addLog(`你休息了一会儿，恢复了 ${healAmount} 点生命值。`, 'info');
          }
          completeAdventureNode(node);
      } else if (node.type === 'EVENT') {
          handleEventEncounter();
      } else {
          startAdventureBattle(node);
      }
  };

  const handleEventEncounter = () => {
      const rand = Math.random();
      let outcome = { title: '神秘机遇', desc: '', reward: '' };

      if (rand < 0.35) {
          // Heal
          const me = players[0];
          const amt = 2;
          me.hp = Math.min(me.maxHp, me.hp + amt);
          outcome = { title: '治愈之泉', desc: `你发现了一处清澈的泉水，喝下后感觉身体变轻了。`, reward: `恢复 ${amt} HP` };
          setPlayers([me]);
      } else if (rand < 0.7) {
          // Gold
          const amt = 40 * adventureData.currentStage;
          setAdventureData(prev => ({ ...prev, gold: prev.gold + amt }));
          outcome = { title: '遗落的钱袋', desc: `角落里有一个破旧的袋子，里面装满了金币。`, reward: `获得 ${amt} 金币` };
      } else {
          // Random Upgrade
          const deck = adventureData.deck;
          if (deck.length > 0) {
              const randCardId = deck[Math.floor(Math.random() * deck.length)];
              const currentLevel = adventureData.cardLevels[randCardId] || 1;
              setAdventureData(prev => ({
                  ...prev,
                  cardLevels: { ...prev.cardLevels, [randCardId]: currentLevel + 1 }
              }));
              const cardName = MOVES[randCardId]?.label || SPECIAL_MOVES.find(m => m.id === randCardId)?.label || '卡牌';
              outcome = { title: '武道顿悟', desc: `你回顾了之前的战斗，对【${cardName}】有了新的理解。`, reward: `${cardName} 等级+1` };
          } else {
              setAdventureData(prev => ({ ...prev, gold: prev.gold + 20 }));
              outcome = { title: '意外之财', desc: '虽然没有领悟什么，但你捡到了钱。', reward: '获得 20 金币' };
          }
      }

      setEventOutcome(outcome);
      setPhase('EVENT');
  };

  const completeAdventureNode = (node: AdventureNode) => {
      const newMap = [...adventureData.map];
      const row = newMap[node.row];
      const targetNode = row.find(n => n.id === node.id);
      if (targetNode) targetNode.status = 'COMPLETED';

      row.forEach(n => {
          if (n.id !== node.id) n.status = 'SKIPPED';
      });

      if (node.row < newMap.length - 1) {
          // NORMAL PROGRESSION
          const nextRow = newMap[node.row + 1];
          if (targetNode?.nextNodes) {
             targetNode.nextNodes.forEach(nextId => {
                 const nextNode = nextRow.find(n => n.id === nextId);
                 if (nextNode) nextNode.status = 'AVAILABLE';
             });
          }
          
          setAdventureData(prev => ({
              ...prev,
              currentFloor: prev.currentFloor + 1,
              map: newMap
          }));

          setPhase('ADVENTURE_MAP');
      } else {
          // BOSS DEFEATED / END OF MAP
          if (node.type === 'BOSS') {
               const nextStage = adventureData.currentStage + 1;
               addLog(`恭喜击败第 ${adventureData.currentStage} 层领主！前往第 ${nextStage} 层...`, 'win');
               
               // Generate Next Stage
               const nextMap = generateDungeonMap(nextStage);
               
               setAdventureData(prev => ({
                   ...prev,
                   currentStage: nextStage,
                   currentFloor: 0,
                   map: nextMap
               }));
               
               setPhase('ADVENTURE_MAP');
          } else {
              // Should not happen if map gen is correct
              setPhase('ADVENTURE_MAP');
          }
      }
  };

  const startAdventureBattle = (node: AdventureNode) => {
      const isBoss = node.type === 'BOSS';
      const isElite = node.type === 'ELITE';
      const difficultyMod = DIFFICULTIES[adventureData.difficulty].hpMod;
      const stage = adventureData.currentStage;

      const enemyClassType = isBoss ? 'BOSS' : (Math.random() > 0.6 ? 'STRIKER' : (Math.random() > 0.5 ? 'BERSERKER' : 'GUARDIAN'));
      const baseStats = CLASSES[enemyClassType];
      
      // Scaling Logic: (Base + RowBonus + StageBonus) * Difficulty
      const rowFactor = 1 + (node.row * 0.15);
      const stageFactor = 1 + ((stage - 1) * 0.5); // 50% stronger per stage
      const eliteFactor = isElite ? 1.5 : 1;
      
      const hp = Math.floor(baseStats.baseHp * rowFactor * stageFactor * eliteFactor * difficultyMod);
      const energy = isBoss ? 3 : (isElite ? 1 : 0);

      const enemyDeck = STANDARD_DECK; 

      const bossName = `第${stage}层领主 ${baseStats.name}`;

      let enemy: Player = {
        id: 2,
        team: 'B',
        name: isBoss ? `👿 ${bossName}` : (isElite ? `⚠️ 精英${baseStats.name}` : `Lv.${node.row + ((stage-1)*7)} ${baseStats.name}`),
        classType: enemyClassType,
        isHuman: false,
        hp: Math.max(1, hp),
        maxHp: Math.max(1, hp),
        energy: energy,
        maxEnergy: 10 + Math.floor(stage/2),
        shield: 0,
        isAlive: true,
        status: 'IDLE',
        damageTakenThisRound: 0,
        energyGainedThisRound: 0,
        hpRecoveredThisRound: 0,
        buffs: [],
        library: enemyDeck,
        cardLevels: {},
        drawPile: shuffle([...enemyDeck]),
        hand: [],
        discardPile: []
      };
      
      // Enemy gets free levels based on stage
      if (stage > 1) {
          const enemyLevel = Math.floor(stage / 2);
          enemy.cardLevels = {
              'ATTACK_LOW': 1 + enemyLevel,
              'ATTACK_HIGH': 1 + enemyLevel
          };
      }
      
      // Draw Initial Hand
      enemy = drawCards(enemy, MAX_HAND_SIZE);

      if (adventureData.difficulty === 'HARD' || stage > 2) {
           if (Math.random() > 0.7) enemy.buffs?.push('BUFF_START_E');
      }

      // Sync Player
      const me = players[0];
      let meUpdated: Player = {
          ...me,
          id: 1,
          team: 'A',
          isAlive: true,
          energy: Math.max(0, me.energy), 
          maxEnergy: 10,
          shield: adventureData.permanentBuffs.includes('BUFF_SHIELD_START') ? 1 : 0,
          status: 'READY',
          lastMove: undefined,
          lastTargetId: undefined,
          damageTakenThisRound: 0,
          energyGainedThisRound: 0,
          hpRecoveredThisRound: 0,
          buffs: [...adventureData.permanentBuffs],
          library: adventureData.deck, 
          cardLevels: adventureData.cardLevels,
          drawPile: shuffle([...adventureData.deck]),
          hand: [],
          discardPile: []
      };

      // Draw Initial Hand for Player
      meUpdated = drawCards(meUpdated, MAX_HAND_SIZE);

      if (adventureData.permanentBuffs.includes('BUFF_START_E')) {
          meUpdated.energy += 1;
      }

      setPlayers([meUpdated, enemy]);
      setRound(1);
      setLogs([]);
      setWinner(null);
      setPhase('PLANNING');
      addLog(`遭遇 ${enemy.name}！`, 'info');
  };

  const startGame = (playerClass: ClassType, diff?: Difficulty) => {
    setIsAutoPlaying(false);
    
    const classData = CLASSES[playerClass];
    let initialDeck = [...STANDARD_DECK];

    // Add Class Bonus Cards
    if (CLASS_BONUS_CARDS[playerClass]) {
        initialDeck = [...initialDeck, ...CLASS_BONUS_CARDS[playerClass]];
    }

    if (gameMode !== 'ADVENTURE') {
        initialDeck = [...initialDeck, ...MULTIPLAYER_EXTRA_CARDS];
    }

    if (gameMode === 'ADVENTURE') {
        const difficulty = diff || 'NORMAL';
        const startStage = 1;
        const map = generateDungeonMap(startStage); 
        
        setAdventureData({
            currentStage: startStage,
            currentFloor: 0,
            gold: 0,
            maxHpMod: 0,
            permanentBuffs: [],
            map: map,
            difficulty: difficulty,
            deck: initialDeck,
            cardLevels: {}
        });
        
        const basePlayer: Player = {
            id: 1,
            team: 'A',
            name: '冒险者',
            classType: playerClass,
            isHuman: true,
            hp: classData.baseHp,
            maxHp: classData.baseHp,
            energy: classData.baseEnergy,
            maxEnergy: 10,
            shield: 0,
            isAlive: true,
            status: 'READY',
            damageTakenThisRound: 0,
            energyGainedThisRound: 0,
            hpRecoveredThisRound: 0,
            buffs: [],
            library: initialDeck,
            cardLevels: {},
            drawPile: [],
            hand: [],
            discardPile: []
        };

        setPlayers([basePlayer]);
        setLogs([]);
        setPhase('ADVENTURE_MAP'); 
        addLog(`冒险开始！难度: ${DIFFICULTIES[difficulty].name}`, 'info');

    } else {
        const newPlayers: Player[] = Array(playerCount).fill(0).map((_, i) => {
            const isHuman = i === 0;
            const validClasses = Object.keys(CLASSES).filter(k => k !== 'BOSS');
            const pClass = isHuman ? playerClass : validClasses[Math.floor(Math.random() * validClasses.length)] as ClassType;
            
            const cData = CLASSES[pClass];
            let team: TeamId = 'NONE';
            if (gameMode === 'TEAM') team = i < playerCount / 2 ? 'A' : 'B';
            
            let deck = [...STANDARD_DECK];
            if (CLASS_BONUS_CARDS[pClass]) {
                deck = [...deck, ...CLASS_BONUS_CARDS[pClass]];
            }
            deck = [...deck, ...MULTIPLAYER_EXTRA_CARDS];

            let p: Player = {
                id: i + 1,
                name: isHuman ? '你' : (gameMode === 'TEAM' && team === 'A' ? `队友 ${i}` : `电脑 ${i}`),
                team: team,
                classType: pClass,
                isHuman: isHuman,
                hp: cData.baseHp,
                maxHp: cData.baseHp,
                energy: cData.baseEnergy,
                maxEnergy: 10,
                shield: 0,
                isAlive: true,
                status: isHuman ? 'READY' : 'IDLE',
                damageTakenThisRound: 0,
                energyGainedThisRound: 0,
                hpRecoveredThisRound: 0,
                buffs: [],
                library: deck,
                drawPile: shuffle([...deck]),
                hand: [],
                discardPile: []
            };
            
            return drawCards(p, MAX_HAND_SIZE);
        });

        setPlayers(newPlayers);
        setPhase('PLANNING');
        setRound(1);
        setLogs([]);
        setWinner(null);
    }
  };

  const buyShopItem = (item: ShopItem) => {
      if (adventureData.gold >= item.cost) {
          const newGold = adventureData.gold - item.cost;
          const me = players[0];
          
          if (item.type === 'HEAL') {
              me.hp = Math.min(me.maxHp, me.hp + (item.value || 0));
              addLog(`购买了 ${item.name}，恢复生命值。`, 'info');
          } else if (item.type === 'MAX_HP') {
              me.maxHp += (item.value || 0);
              me.hp += (item.value || 0);
              addLog(`购买了 ${item.name}，最大生命值增加。`, 'info');
              setAdventureData(prev => ({...prev, maxHpMod: prev.maxHpMod + (item.value || 0)}));
          } else if (item.type === 'BUFF') {
              if (adventureData.permanentBuffs.includes(item.id)) {
                  addLog("你已经拥有这个强化了！", 'info');
                  return;
              }
              setAdventureData(prev => ({...prev, permanentBuffs: [...prev.permanentBuffs, item.id]}));
              if (item.id === 'BUFF_SHIELD_START') me.shield += 1;
              if (item.id === 'BUFF_START_E') me.energy += 1;
              me.buffs = [...adventureData.permanentBuffs, item.id];
              addLog(`购买了 ${item.name}！`, 'info');
          }

          setAdventureData(prev => ({...prev, gold: newGold}));
          setPlayers([me]);
      } else {
          addLog(`金币不足！`, 'info');
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

  // --- LOOT LOGIC ---
  const generateLoot = () => {
      const choices: (GameMove | ShopItem)[] = [];
      const MAX_CHOICES = 3;

      // 1. Guaranteed Buff/Item Slot (or at least 50% chance)
      // Increased probability from 20% to 50% to satisfy request
      if (Math.random() > 0.4) {
          const buff = SHOP_ITEMS.filter(i => 
              (i.type === 'BUFF' && !adventureData.permanentBuffs.includes(i.id)) ||
              (i.type === 'HEAL' || i.type === 'MAX_HP')
          );
          if (buff.length > 0) {
              choices.push(buff[Math.floor(Math.random() * buff.length)]);
          }
      }

      // 2. Upgrades (Cards player already has)
      const existingCards = [...new Set(adventureData.deck)]; // Unique IDs
      if (existingCards.length > 0 && choices.length < MAX_CHOICES) {
          const cardId = existingCards[Math.floor(Math.random() * existingCards.length)];
          const baseMove = MOVES[cardId] || SPECIAL_MOVES.find(m => m.id === cardId);
          if (baseMove) choices.push(baseMove);
      }

      // 3. New Cards
      const pool = [...SPECIAL_MOVES];
      while (choices.length < MAX_CHOICES && pool.length > 0) {
          const idx = Math.floor(Math.random() * pool.length);
          const pick = pool[idx];
          // Avoid duplicates in choices
          if (!choices.some(c => c.id === pick.id)) {
              choices.push(pick);
          }
          pool.splice(idx, 1);
      }

      // 4. Always add a "Recycle for Gold" option (New Feature)
      const goldOption: ShopItem = {
          id: 'REWARD_GOLD',
          name: '回收战利品',
          type: 'GOLD',
          cost: 0,
          value: 30 + (adventureData.currentStage * 10), 
          description: '放弃以上所有奖励，直接获得金币。'
      };
      choices.push(goldOption);
      
      setLootOptions(choices);
      setPhase('LOOT');
  };

  const handleSelectLoot = (item: GameMove | ShopItem) => {
      // Check if it's Gold Reward
      if ('type' in item && item.type === 'GOLD') {
           const goldAmount = item.value || 30;
           setAdventureData(prev => ({...prev, gold: prev.gold + goldAmount}));
           addLog(`回收了战利品，获得了 ${goldAmount} 金币。`, 'loot');
      } 
      // Check if it's a shop item (BUFF / HEAL / MAX_HP)
      else if ('name' in item) { // Type guard for ShopItem
           const shopItem = item as ShopItem;
           if (shopItem.type === 'BUFF') {
                setAdventureData(prev => ({...prev, permanentBuffs: [...prev.permanentBuffs, shopItem.id]}));
                addLog(`获得了强化：${shopItem.name}！`, 'loot');
           } else if (shopItem.type === 'HEAL') {
                const me = players[0];
                const healAmt = shopItem.value || 0;
                me.hp = Math.min(me.maxHp, me.hp + healAmt);
                addLog(`使用了 ${shopItem.name}，恢复 ${healAmt} HP。`, 'loot');
                setPlayers([me]);
           } else if (shopItem.type === 'MAX_HP') {
                const me = players[0];
                const boost = shopItem.value || 0;
                me.maxHp += boost;
                me.hp += boost;
                setAdventureData(prev => ({...prev, maxHpMod: prev.maxHpMod + boost}));
                addLog(`使用了 ${shopItem.name}，最大生命值 +${boost}。`, 'loot');
                setPlayers([me]);
           }
      } else {
          // It's a Move (Card)
          const move = item as GameMove;
          // Check if we already have it to upgrade
          if (adventureData.deck.includes(move.id!)) {
              const currentLevel = adventureData.cardLevels[move.id!] || 1;
              const newLevel = currentLevel + 1;
              setAdventureData(prev => ({
                  ...prev,
                  cardLevels: {
                      ...prev.cardLevels,
                      [move.id!]: newLevel
                  }
              }));
              addLog(`技能【${move.label}】升级了！(Lv.${newLevel})`, 'loot');
          } else {
              // New Card
              const newDeck = [...adventureData.deck, move.id!];
              setAdventureData(prev => ({ ...prev, deck: newDeck }));
              addLog(`习得了新技能：${move.label}！`, 'loot');
          }
      }
      
      const currentRow = adventureData.map[adventureData.currentFloor];
      const activeNode = currentRow.find(n => n.status === 'AVAILABLE');
      if (activeNode) {
          completeAdventureNode(activeNode);
      } else {
          // Logic to handle boss completion loot transition
          // If we are looting from a Boss (last row), completeAdventureNode will trigger next stage
          const lastRowIndex = adventureData.map.length - 1;
          const bossNode = adventureData.map[lastRowIndex].find(n => n.type === 'BOSS' && n.status === 'COMPLETED');
          if (bossNode) {
             // This case actually shouldn't be hit via normal logic because 'completeAdventureNode' handles the progression
             // But if we added loot *after* boss death but *before* next map:
             setPhase('ADVENTURE_MAP');
          } else {
             setPhase('ADVENTURE_MAP');
          }
      }
  };

  // --- BOT LOGIC ---
  const calculateBotMove = (bot: Player, allPlayers: Player[]): { move: GameMove, targetId?: number } => {
    const enemies = allPlayers.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team !== bot.team : p.id !== bot.id));
    
    const availableMoves = [...bot.hand, MOVES['CHARGE']];
    const affordableMoves = availableMoves.filter(m => {
         let cost = m.cost;
         if (bot.classType === 'STRIKER' && m.type === 'ATTACK' && m.variant === 'ADVANCED') cost -= 1; 
         // Sacrifice Logic handled by instant usage if possible, but for planning main move:
         if (m.type === 'SACRIFICE' && bot.hp <= 1) return false;
         // Defend Logic: If we select Defend as Main Move, it implies we just defend.
         return bot.energy >= cost;
    });

    if (affordableMoves.length === 0) return { move: MOVES['CHARGE'] }; 

    // Kill logic
    const killMove = affordableMoves.find(m => m.damage && enemies.some(e => e.hp <= (m.damage||0)));
    if (killMove) {
        const target = enemies.find(e => e.hp <= (killMove.damage||0));
        return { move: killMove, targetId: target?.id };
    }

    if (bot.hp <= 2) {
        const heal = affordableMoves.find(m => m.type === 'HEAL');
        if (heal) return { move: heal, targetId: bot.id };
        // Bot might use instant defense earlier, but if it picks defense here, it's fine.
        const block = affordableMoves.find(m => m.type === 'DEFEND' && m.variant === 'ADVANCED');
        if (block) return { move: block };
    }
    
    // ARCANE BURST Logic
    const arcaneBurst = affordableMoves.find(m => m.id === 'ARCANE_BURST');
    if (arcaneBurst && bot.energy >= 3) {
         return { move: arcaneBurst, targetId: enemies[0]?.id };
    }

    if (bot.energy >= 3) {
        const bigMove = affordableMoves.find(m => m.cost >= 2);
        if (bigMove) {
             let tid;
             if (bigMove.type === 'ATTACK') tid = enemies[0]?.id;
             if (bigMove.type === 'HEAL') tid = bot.id;
             return { move: bigMove, targetId: tid };
        }
    }

    if (bot.hp > 2 && affordableMoves.some(m => m.type === 'SACRIFICE')) {
        return { move: affordableMoves.find(m => m.type === 'SACRIFICE')! };
    }

    const attacks = affordableMoves.filter(m => m.type === 'ATTACK');
    if (attacks.length > 0 && Math.random() > 0.3) {
         const m = attacks[Math.floor(Math.random() * attacks.length)];
         return { move: m, targetId: enemies[Math.floor(Math.random() * enemies.length)]?.id };
    }

    const randomMove = affordableMoves[Math.floor(Math.random() * affordableMoves.length)];
    let targetId;
    if (randomMove.type === 'ATTACK') targetId = enemies[0]?.id;
    if (randomMove.type === 'HEAL') targetId = bot.id;
    
    return { move: randomMove, targetId };
  };

  const calculateBotDiscard = (bot: Player): number[] => {
      const indices: number[] = [];
      bot.hand.forEach((card, index) => {
          if (indices.length >= 2) return; 
          if (card.cost > bot.energy + 2) indices.push(index); 
          if (card.type === 'HEAL' && bot.hp === bot.maxHp) indices.push(index); 
      });
      if (bot.hand.length === MAX_HAND_SIZE && indices.length === 0) {
          indices.push(0);
      }
      return indices;
  };

  const handleHumanSelectMove = (move: GameMove | null) => {
    if (!move) {
        setSelectedMove(null);
        setNeedsTarget(false);
        setValidTargetIds([]);
        return;
    }
    
    const human = players[0];
    if (!human.isAlive) return;

    // Special logic for SHOCKWAVE (AOE), SACRIFICE (Instant), DEFEND (Instant)
    if (move.id === 'SHOCKWAVE' || move.id === 'SACRIFICE' || move.type === 'DEFEND') {
         setSelectedMove(move);
         setNeedsTarget(false); // No target needed
         return;
    }

    if (move.type === 'ATTACK') {
      const enemies = players.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team !== human.team : p.id !== human.id));
      if (enemies.length === 0) return;
      
      setSelectedMove(move);
      setNeedsTarget(true);
      setValidTargetIds(enemies.map(p => p.id));
      
    } else if (move.type === 'HEAL') {
      const allies = players.filter(p => p.isAlive && (gameMode === 'TEAM' ? p.team === human.team : p.id === human.id));
      setSelectedMove(move);
      setNeedsTarget(true);
      setValidTargetIds(allies.map(p => p.id));
    } else {
      setSelectedMove(move);
      setNeedsTarget(false);
    }
  };

  const handleTargetClick = (targetId: number) => {
    if (!needsTarget || !selectedMove) return;
    if (!validTargetIds.includes(targetId)) return;
    handleConfirmMoveWithTarget(targetId);
  };
  
  const handleConfirmMoveWithTarget = (targetId: number) => {
      setValidTargetIds([targetId]); 
      setNeedsTarget(false);
  };

  const executeConfirmedMove = () => {
      if (!selectedMove) return;
      
      const p = { ...players[0] };
      const cardIndex = p.hand.findIndex(c => c.uuid === selectedMove.uuid || c.id === selectedMove.id);
      
      // --- INSTANT ACTIONS ---
      const isSacrifice = selectedMove.id === 'SACRIFICE';
      const isDefense = selectedMove.type === 'DEFEND';
      const isDoubleStrike = selectedMove.id === 'DOUBLE_STRIKE';

      if (isSacrifice || isDefense || isDoubleStrike) {
          
          if (isSacrifice) {
              p.hp -= 1;
              p.energy += 2;
              p.damageTakenThisRound += 1;
              p.energyGainedThisRound += 2;
              addLog(`${p.name} 使用了【燃血】，获得 2 EP！`, 'info');
          } else if (isDefense) {
               p.energy -= selectedMove.cost;
               if (selectedMove.id === 'DEFEND_LOW') {
                   const levelBonus = (selectedMove.level || 1) - 1;
                   p.shield += 1 + levelBonus;
                   addLog(`${p.name} 使用了【格挡】(+${1+levelBonus} 防御)。`, 'info');
               } else if (selectedMove.id === 'DEFEND_HIGH') {
                   if (!p.buffs?.includes('BUFF_INVULNERABLE')) {
                        p.buffs = [...(p.buffs || []), 'BUFF_INVULNERABLE'];
                   }
                   addLog(`${p.name} 开启了【绝对防御】！`, 'info');
               } else if (selectedMove.id === 'SPIKE_SHIELD') {
                   if (!p.buffs?.includes('BUFF_INVULNERABLE')) p.buffs = [...(p.buffs || []), 'BUFF_INVULNERABLE'];
                   if (!p.buffs?.includes('BUFF_REFLECT')) p.buffs = [...(p.buffs || []), 'BUFF_REFLECT'];
                   addLog(`${p.name} 架起了【刺盾】！`, 'info');
               }
          } else if (isDoubleStrike) {
               // Double Strike Logic (Instant)
               p.energy -= selectedMove.cost;
               const targetId = validTargetIds[0];
               const target = players.find(t => t.id === targetId);
               
               if (target) {
                   const damage = 1;
                   addLog(`${p.name} 使用【二连击】！`);
                   for(let i=0; i<2; i++) {
                       if (target.buffs?.includes('BUFF_INVULNERABLE')) {
                            addLog(`${target.name} 免疫了伤害！`);
                            if (target.buffs?.includes('BUFF_REFLECT')) {
                                p.hp -= 1;
                                p.damageTakenThisRound += 1;
                            }
                       } else {
                            let dmg = damage;
                            const mitigated = Math.min(dmg, target.shield);
                            dmg -= mitigated;
                            target.shield = Math.max(0, target.shield - mitigated);
                            
                            if (dmg > 0) {
                                target.hp -= dmg;
                                target.damageTakenThisRound += dmg;
                                addLog(`${p.name} 击中了 ${target.name} (-${dmg})！`);
                            } else {
                                addLog(`${target.name} 的护盾抵消了伤害！`);
                            }
                       }
                   }
               }
          }

          // Discard
          if (cardIndex !== -1) {
              if (p.hand[cardIndex].id) p.discardPile.push(p.hand[cardIndex].id!);
              p.hand.splice(cardIndex, 1);
          }

          const newPlayers = [...players];
          newPlayers[0] = p;
          if (isDoubleStrike) {
               // Update target too
               const targetId = validTargetIds[0];
               const targetIndex = newPlayers.findIndex(pl => pl.id === targetId);
               if (targetIndex !== -1) {
                   const updatedTarget = newPlayers.find(t => t.id === validTargetIds[0]);
                   if (updatedTarget) {
                        // This block is just for consistency, logic executed above on state copies
                   }
               }
               // Correct way:
               if (targetIndex !== -1) {
                  let t = { ...newPlayers[targetIndex] };
                  // Apply damage again cleanly for the new state object
                   for(let i=0; i<2; i++) {
                       if (t.buffs?.includes('BUFF_INVULNERABLE')) {
                            if (t.buffs?.includes('BUFF_REFLECT')) {
                                p.hp -= 1;
                                p.damageTakenThisRound += 1;
                            }
                       } else {
                            let dmg = 1;
                            const mitigated = Math.min(dmg, t.shield);
                            dmg -= mitigated;
                            t.shield = Math.max(0, t.shield - mitigated);
                            if (dmg > 0) {
                                t.hp -= dmg;
                                t.damageTakenThisRound += dmg;
                            }
                       }
                  }
                  newPlayers[targetIndex] = t;
               }
          }

          setPlayers(newPlayers);
          setSelectedMove(null);
          setNeedsTarget(false);
          setValidTargetIds([]);
          
          // Check for deaths immediately for instant attacks
          if (isDoubleStrike) {
              const dead = newPlayers.filter(pl => pl.hp <= 0 && pl.isAlive);
              if (dead.length > 0) {
                  const enemiesAlive = newPlayers.some(pl => pl.team !== p.team && pl.hp > 0 && pl.isAlive);
                  if (!enemiesAlive) {
                      setPhase('REVEALING');
                      setTimeout(resolveTurn, 500);
                  }
              }
          }

          return; // Continue turn
      }

      // --- END TURN ACTIONS ---
      const targetId = validTargetIds.length === 1 ? validTargetIds[0] : undefined;
      
      const updatedPlayers = players.map(pl => 
        pl.isHuman ? { ...pl, lastMove: selectedMove, lastTargetId: targetId, status: 'READY' as const } : pl
      );
      setPlayers(updatedPlayers);
      setSelectedMove(null);
      setValidTargetIds([]);
      setPhase('REVEALING');
  };

  const handleSpectatorNext = () => {
      setPhase('REVEALING');
  };

  useEffect(() => {
    if (isAutoPlaying && phase === 'PLANNING' && !winner) {
        const timer = setTimeout(() => {
            handleSpectatorNext();
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [phase, isAutoPlaying, winner]);

  useEffect(() => {
    if (phase === 'REVEALING') {
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

    // 0. Bot Instant Logic (Simulate bots using Defend/Sacrifice before main move)
    currentPlayers = currentPlayers.map(p => {
        if (p.isHuman || !p.isAlive) return p;

        let bot = { ...p };
        let madeInstantMove = true;
        
        while (madeInstantMove) {
            madeInstantMove = false;
            const defCardIndex = bot.hand.findIndex(c => c.type === 'DEFEND' && bot.energy >= c.cost);
            const sacCardIndex = bot.hand.findIndex(c => c.id === 'SACRIFICE' && bot.hp > 2);

            if (defCardIndex !== -1) {
                const card = bot.hand[defCardIndex];
                const mainMoveCost = bot.lastMove ? bot.lastMove.cost : 0;
                
                if (bot.energy >= card.cost + mainMoveCost) {
                    bot.energy -= card.cost;
                    if (card.id === 'DEFEND_LOW') {
                         const levelBonus = (card.level || 1) - 1;
                         bot.shield += 1 + levelBonus;
                         logsToAdd.push(`${bot.name} 使用【格挡】。`);
                    }
                    if (card.id === 'DEFEND_HIGH' || card.id === 'SPIKE_SHIELD') {
                        if(!bot.buffs?.includes('BUFF_INVULNERABLE')) bot.buffs = [...(bot.buffs||[]), 'BUFF_INVULNERABLE'];
                        if(card.id === 'SPIKE_SHIELD') bot.buffs = [...(bot.buffs||[]), 'BUFF_REFLECT'];
                        logsToAdd.push(`${bot.name} 使用【${card.label}】。`);
                    }

                    if (card.id) bot.discardPile.push(card.id);
                    bot.hand.splice(defCardIndex, 1);
                    madeInstantMove = true;
                }
            } else if (sacCardIndex !== -1) {
                const card = bot.hand[sacCardIndex];
                bot.hp -= 1;
                bot.energy += 2;
                bot.damageTakenThisRound += 1;
                if (card.id) bot.discardPile.push(card.id);
                bot.hand.splice(sacCardIndex, 1);
                madeInstantMove = true;
                logsToAdd.push(`${bot.name} 使用【燃血】。`);
            }
        }
        return bot;
    });

    // 1. Bot Main Decisions (Ensure the card chosen still exists in hand)
    currentPlayers = currentPlayers.map(p => {
      if (!p.isHuman && p.isAlive) {
        const moveInHand = p.lastMove && (p.lastMove.type === 'CHARGE' || p.hand.some(c => c.uuid === p.lastMove?.uuid));
        
        if (!moveInHand) {
             return { ...p, lastMove: MOVES['CHARGE'], lastTargetId: undefined, status: 'READY' };
        }
        return { ...p, status: 'READY' };
      }
      return p;
    });

    setPhase('RESOLVING');
    
    currentPlayers.forEach(p => {
      p.damageTakenThisRound = 0;
      p.energyGainedThisRound = 0;
      p.hpRecoveredThisRound = 0;
    });

    // 2. Pay Costs & Self Effects
    currentPlayers.forEach(p => {
      if (!p.isAlive || !p.lastMove) return;

      if (p.lastMove.type !== 'CHARGE') {
          const handIndex = p.hand.findIndex(c => c.uuid === p.lastMove?.uuid || c.id === p.lastMove?.id);
          if (handIndex !== -1) {
              const usedCard = p.hand[handIndex];
              p.hand.splice(handIndex, 1);
              if (usedCard.id) p.discardPile.push(usedCard.id);
          }
      }

      let cost = p.lastMove.cost;
      if (p.classType === 'STRIKER' && p.lastMove.type === 'ATTACK' && p.lastMove.variant === 'ADVANCED') {
        cost = Math.max(0, cost - 1); 
      }
      p.energy -= cost;

      if (p.lastMove.type === 'CHARGE') {
        let gain = 1;
        // ARCANIST Passive
        if (p.classType === 'ARCANIST') gain = 2;
        p.energy += gain;
        p.energyGainedThisRound += gain;
      } else if (p.lastMove.id === 'ARCANE_BURST') {
          const damage = p.energy;
          p.energy = 0;
          p.lastMove = { ...p.lastMove, damage: damage };
          logsToAdd.push(`${p.name} 爆发了奥术能量！(伤害: ${damage})`);
      } else if (p.lastMove.id === 'MEDITATE') {
          p.energy += 2;
          p.hp -= 1; 
          logsToAdd.push(`${p.name} 进行冥想 (+2EP, -1HP)`);
      }
    });

    // 3. Resolve Healing
    currentPlayers.forEach(actor => {
        if (!actor.isAlive || actor.lastMove?.type !== 'HEAL' || !actor.lastTargetId) return;
        const target = currentPlayers.find(p => p.id === actor.lastTargetId);
        if (target && target.isAlive) {
            const healBase = 1;
            const levelBonus = (actor.lastMove.level || 1) - 1;
            const totalHeal = healBase + levelBonus;

            target.hp = Math.min(target.hp + totalHeal, target.maxHp);
            target.hpRecoveredThisRound = (target.hpRecoveredThisRound || 0) + totalHeal;
            logsToAdd.push(`${actor.name} 治愈了 ${target.name} (+${totalHeal})。`);
        }
    });

    // 4. Resolve Attacks
    currentPlayers.forEach(attacker => {
      if (!attacker.isAlive || attacker.lastMove?.type !== 'ATTACK') return;
      
      const attack = attacker.lastMove;
      
      // Identify Targets
      let targets: Player[] = [];
      
      if (attack.id === 'SHOCKWAVE') {
          targets = currentPlayers.filter(p => p.isAlive);
          logsToAdd.push(`${attacker.name} 释放了【震荡波】！`);
      } else if (attacker.lastTargetId) {
          const t = currentPlayers.find(p => p.id === attacker.lastTargetId);
          if (t && t.isAlive) targets.push(t);
      }

      // DOUBLE STRIKE handled as Instant, removed from here
      if (attack.id === 'DOUBLE_STRIKE') return;

      const hits = 1;

      for (let i = 0; i < hits; i++) {
        targets.forEach(target => {
          // Check for Invulnerability
          const isInvulnerable = target.buffs?.includes('BUFF_INVULNERABLE');
          
          if (isInvulnerable) {
               if (targets.length === 1 && i===0) logsToAdd.push(`${target.name} 免疫了伤害！`);
               if (target.buffs?.includes('BUFF_REFLECT') && attacker.id !== target.id) {
                   attacker.hp -= 1;
                   attacker.damageTakenThisRound += 1;
                   if (targets.length === 1 && i===0) logsToAdd.push(`${target.name} 的刺盾反弹了伤害！`);
               }
               return; 
          }

          let damage = attack.damage !== undefined ? attack.damage : 1;
          const isSpiritBomb = attack.id === 'ATTACK_HIGH'; 
          
          if (!isSpiritBomb) {
              let normalDefense = target.shield;
              const mitigated = Math.min(damage, normalDefense);
              damage -= mitigated;

              if (mitigated > 0) {
                   target.shield = Math.max(0, target.shield - mitigated);
                   if (targets.length === 1 && i===0) logsToAdd.push(`${target.name} 的护盾抵消了伤害！`);
              }
          } else {
              if (targets.length === 1 && i===0) logsToAdd.push(`${attacker.name} 的元气弹无视了防御！`);
          }

          // Apply Final Damage
          if (damage > 0) {
             target.hp -= damage;
             target.damageTakenThisRound += damage;
             
             if (attack.id === 'SHOCKWAVE') {
                 // Minimal log
             } else {
                 logsToAdd.push(`${attacker.name} 击中了 ${target.name} (-${damage})！`);
             }

             if ((target.hp <= 0 && attacker.buffs?.includes('BUFF_VAMP')) || attack.id === 'VAMP_STRIKE') {
                 attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1);
                 attacker.hpRecoveredThisRound = (attacker.hpRecoveredThisRound || 0) + 1;
                 logsToAdd.push(`${attacker.name} 吸取了生命！`);
             }

             if (attack.id === 'ATTACK_LOW' || attack.id === 'SHOCKWAVE') {
                 attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1);
                 attacker.hpRecoveredThisRound = (attacker.hpRecoveredThisRound || 0) + 1;
             }

             if (attack.id === 'ATTACK_HIGH') {
                 attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1);
                 attacker.hpRecoveredThisRound = (attacker.hpRecoveredThisRound || 0) + 1;
                 attacker.energy += 1;
                 attacker.energyGainedThisRound += 1;
             }

             if (attacker.classType === 'BERSERKER') {
                 attacker.energy += 1;
                 attacker.energyGainedThisRound += 1;
             }
          }
        });
      } 
    });

    // 5. Process Kill Rewards
    currentPlayers.forEach(p => {
        if (p.hp <= 0 && p.isAlive) {
            const killerCandidates = currentPlayers.filter(attacker => 
                attacker.isAlive && 
                attacker.lastMove?.type === 'ATTACK' && 
                (attacker.lastTargetId === p.id || attacker.lastMove.id === 'SHOCKWAVE')
            );
            
            killerCandidates.forEach(killer => {
                if (killer.id !== p.id) { 
                    killer.energy += 1;
                    killer.energyGainedThisRound += 1;
                    logsToAdd.push(`${killer.name} 击败了 ${p.name}，获得 1 EP！`);
                }
            });
        }
    });

    // Cleanup Temporary Buffs
    currentPlayers.forEach(p => {
        if (p.buffs) {
            p.buffs = p.buffs.filter(b => b !== 'BUFF_INVULNERABLE' && b !== 'BUFF_REFLECT');
        }
        p.shield = 0;
    });
    
    setPlayers([...currentPlayers]);
    logsToAdd.forEach(l => addLog(l, 'combat'));

    // 6. Check Deaths & Winner
    const resolveDelay = isAutoPlaying ? 500 : 1500;
    
    setTimeout(() => {
      const survivors = currentPlayers.filter(p => p.hp > 0);
      
      currentPlayers.forEach(p => {
        if (p.hp <= 0 && p.isAlive) {
          p.isAlive = false;
          p.status = 'ELIMINATED';
          addLog(`${p.name} 倒下了！`, 'death');
        }
      });
      setPlayers([...currentPlayers]);

      let isGameOver = false;

      if (gameMode === 'ADVENTURE') {
          const me = currentPlayers[0];
          const enemiesAlive = currentPlayers.slice(1).some(p => p.hp > 0);
          if (!me.isAlive) {
              isGameOver = true;
              setWinner({ name: '敌人', team: 'B' });
              addLog(`冒险结束...`, 'death');
          } else if (!enemiesAlive) {
              isGameOver = true; 
              const goldMod = DIFFICULTIES[adventureData.difficulty].goldMod;
              const goldGain = Math.floor((Math.random() * 10 + 20 + (adventureData.currentStage * 5)) * goldMod);
              setAdventureData(prev => ({...prev, gold: prev.gold + goldGain}));
              me.hp = me.maxHp; 
              addLog(`战斗胜利！获得 ${goldGain} 金币。`, 'loot');
              generateLoot();
              return; 
          }
      } else {
          if (gameMode === 'FFA') {
            if (survivors.length <= 1) {
                isGameOver = true;
                if (survivors.length === 1) {
                    setWinner({ name: survivors[0].name, team: survivors[0].team });
                    addLog(`🏆 胜利者是 ${survivors[0].name}！`, 'win');
                } else {
                    setWinner(null);
                    addLog(`同归于尽！`, 'win');
                }
            }
          } else {
            const teamAAlive = survivors.some(p => p.team === 'A');
            const teamBAlive = survivors.some(p => p.team === 'B');
            if (!teamAAlive || !teamBAlive) {
                isGameOver = true;
                if (teamAAlive) setWinner({ name: '蓝队', team: 'A' });
                else if (teamBAlive) setWinner({ name: '红队', team: 'B' });
                else { setWinner(null); addLog(`平局！`, 'win'); }
            }
          }
      }

      if (isGameOver) {
        if (phase !== 'LOOT') {
            setPhase('GAME_OVER');
            setIsAutoPlaying(false);
        }
      } else {
          if (isAutoPlaying) {
             handleDiscardAndDraw([], true);
          } else {
             setPhase('HAND_MANAGEMENT');
          }
      }
    }, resolveDelay);
  };

  const handleDiscardAndDraw = (discardIndices: number[], auto: boolean = false) => {
      let updatedPlayers = [...players];
      
      const human = updatedPlayers[0];
      if (human.isHuman && human.isAlive) {
          const indices = discardIndices.sort((a, b) => b - a);
          indices.forEach(idx => {
              if (human.hand[idx]) {
                  if (human.hand[idx].id) human.discardPile.push(human.hand[idx].id!);
                  human.hand.splice(idx, 1);
              }
          });
          updatedPlayers[0] = drawCards(human, MAX_HAND_SIZE - human.hand.length);
      }

      updatedPlayers = updatedPlayers.map(p => {
          if (!p.isHuman && p.isAlive) {
              const toDiscard = calculateBotDiscard(p).sort((a,b) => b-a);
              toDiscard.forEach(idx => {
                 if (p.hand[idx]) {
                     if (p.hand[idx].id) p.discardPile.push(p.hand[idx].id!);
                     p.hand.splice(idx, 1);
                 }
              });
              return drawCards(p, MAX_HAND_SIZE - p.hand.length);
          }
          return p;
      });

      setPlayers(updatedPlayers);
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
  };

  const myTeam = players[0]?.team || 'NONE';
  const enemies: Player[] = players.filter(p => (gameMode === 'TEAM' ? p.team !== myTeam : p.id !== 1));
  const myTeamMembers: Player[] = players.filter(p => (gameMode === 'TEAM' ? p.team === myTeam : p.id === 1));
  const bottomRowPlayers: Player[] = [...myTeamMembers].sort((a, b) => a.id - b.id);

  const getGuideHint = () => {
      if (phase === 'HAND_MANAGEMENT') return "弃牌阶段";
      if (phase === 'LOOT') return "选择战利品";
      if (winner && phase === 'GAME_OVER') return "游戏结束！";
      if (phase === 'ADVENTURE_MAP') return "选择下一步行动";
      if (phase === 'SHOP') return "购买补给";
      if (phase === 'EVENT') return "随机事件";
      if (phase === 'PLANNING') {
          if (!players[0]?.isAlive) return "你已阵亡";
          if (needsTarget) return selectedMove?.type === 'HEAL' ? "选择队友" : "选择敌人";
          if (selectedMove) return (selectedMove.type === 'SACRIFICE' || selectedMove.type === 'DEFEND' || selectedMove.id === 'DOUBLE_STRIKE') ? `立即使用${selectedMove.label}` : "点击确定";
          return "出牌 或 积攒";
      }
      return "请稍候...";
  };

  const renderClassSelection = () => {
      const renderPreview = () => {
          if (!previewClass) return null;
          const cls = CLASSES[previewClass];
          const bonusCards = CLASS_BONUS_CARDS[previewClass] || [];
          
          return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 max-w-md w-full relative shadow-2xl">
                      <button onClick={() => setPreviewClass(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl font-bold">✕</button>
                      <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
                          <span className="text-3xl">{cls.icon}</span>
                          {cls.name}
                      </h3>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-4 mt-4">
                          <div className="text-xs text-slate-400 font-bold uppercase mb-1">天赋被动</div>
                          <div className="text-sm text-white leading-relaxed">{cls.passive || '无特殊被动'}</div>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-2">
                          <div className="text-xs text-slate-400 font-bold uppercase mb-1">专属卡牌</div>
                          {bonusCards.length > 0 ? (
                              <div className="flex gap-2">
                                  {bonusCards.slice(0,1).map(cardId => {
                                      const card = SPECIAL_MOVES.find(m => m.id === cardId) || MOVES[cardId];
                                      return (
                                          <div key={cardId} className="text-sm text-cyan-300 font-bold">
                                              {card ? card.label : cardId} x2
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="text-sm text-slate-500">无</div>
                          )}
                      </div>
                  </div>
              </div>
          );
      };

      if (gameMode !== 'ADVENTURE') {
          return (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {(Object.values(CLASSES) as PlayerClassData[]).filter(c => c.id !== 'BOSS').map((cls) => (
                 <div 
                    key={cls.id}
                    onClick={() => startGame(cls.id)}
                    className="group bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                 >
                    <div className="text-5xl mb-2 text-center">{cls.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-1 text-center">{cls.name}</h3>
                    <div className="text-slate-400 text-xs text-center">{cls.description}</div>
                 </div>
               ))}
             </div>
          );
      }
      
      return (
          <div className="w-full">
              {renderPreview()}
              <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-300 mb-4 text-center">选择难度与职业</h3>
                  <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map(diff => (
                            <div key={diff} className="flex-1 max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-4">
                                <h4 className={`text-xl font-bold ${DIFFICULTIES[diff].color} mb-2`}>{DIFFICULTIES[diff].name}</h4>
                                <p className="text-xs text-slate-400 mb-4 h-8">{DIFFICULTIES[diff].desc}</p>
                                <div className="space-y-2">
                                    {(Object.values(CLASSES) as PlayerClassData[]).filter(c => c.id !== 'BOSS').map((cls) => (
                                        <div key={cls.id} className="flex gap-2">
                                            <button 
                                            onClick={() => startGame(cls.id, diff)}
                                            className="flex-1 text-left px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 flex items-center gap-2 text-sm transition-colors border border-slate-600 group"
                                            >
                                                <span className="group-hover:scale-110 transition-transform">{cls.icon}</span>
                                                <span className="font-bold text-slate-200">{cls.name}</span>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPreviewClass(cls.id); }}
                                                className="px-3 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-slate-300 hover:text-white hover:border-cyan-400 transition-colors"
                                            >
                                                🔍
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                    ))}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col items-center relative font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="w-full bg-slate-950 border-b border-slate-800 p-2 md:p-4 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-2">
           <button onClick={() => setShowManual(true)} className="w-8 h-8 rounded-full border border-slate-600 bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-colors" title="Help">?</button>
           <h1 className="text-xl font-bold tracking-wider text-slate-100 font-display">
             ENERGY <span className="text-rose-500 text-shadow-red">DUEL</span>
           </h1>
        </div>
        
        <div className="flex items-center gap-3">
            {phase !== 'LOBBY' && phase !== 'GAME_OVER' && (
                <button 
                    onClick={quitToMenu}
                    className="hidden md:block px-3 py-1 bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-800 rounded text-xs font-bold transition-colors"
                >
                    退出
                </button>
            )}

            {gameMode === 'ADVENTURE' ? (
                <div className="flex gap-3 text-xs md:text-sm font-mono text-slate-300">
                    <span className="flex items-center gap-1 text-amber-400">💰 {adventureData.gold}</span>
                    <span className="flex items-center gap-1">🚩 {adventureData.currentStage}-{adventureData.currentFloor + 1}</span>
                </div>
            ) : (
                <div className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
                ROUND <span className="text-white font-bold">{round}</span>
                </div>
            )}
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
                  <h2 className="text-2xl font-bold text-white">游戏指南</h2>
                  <button onClick={() => setShowManual(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <h3 className="text-lg font-bold text-white">冒险模式更新</h3>
                  <p>现在冒险模式采用层级制，每一层都有一个守关BOSS。</p>
                   <ul className="list-disc list-inside space-y-1">
                      <li>击败当前层BOSS后，将进入下一层。</li>
                      <li>层数越高，敌人越强，金币奖励也越丰厚。</li>
                      <li>使用地图左侧的箭头可以上下查看当前层全貌。</li>
                  </ul>

                  <h3 className="text-lg font-bold text-white mt-4">伤害与防御机制</h3>
                  <p>游戏分为<span className="text-cyan-400">普通伤害</span>和<span className="text-rose-400">必杀伤害</span>。</p>
                  <ul className="list-disc list-inside space-y-1">
                      <li><span className="text-white font-bold">普通防御</span>：1 点防御值可抵消 1 点普通伤害。</li>
                      <li><span className="text-white font-bold">必杀伤害</span>：【元气弹】无视所有普通防御（格挡/护盾），必须用【绝对防御】抵挡。</li>
                  </ul>
                  
                  <h3 className="text-lg font-bold text-white mt-4">特殊技能</h3>
                  <ul className="list-disc list-inside space-y-1">
                      <li><span className="text-purple-400 font-bold">即时卡牌</span>：【燃血】【二连击】和【防御类】卡牌现在是即时技能。使用后立即生效，不消耗回合数，可继续出牌。</li>
                  </ul>
              </div>
              <button onClick={() => setShowManual(false)} className="w-full mt-6 py-3 bg-indigo-600 rounded-xl font-bold text-white">明白！</button>
           </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* LOBBY */}
      {phase === 'LOBBY' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in fade-in zoom-in duration-500 pb-10">
           <div className="max-w-xl w-full bg-slate-800/80 backdrop-blur p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
             <h2 className="text-3xl font-display font-bold mb-2 text-white tracking-widest">NEW GAME</h2>
             <div className="text-amber-400 font-bold text-sm mb-4 animate-pulse">💡 推荐：新手请先尝试 1v1 熟悉抽卡机制</div>
             
             <div className="space-y-6">
                 {/* Adventure Mode Button */}
                 <button 
                    onClick={() => goToClassSelection(1, 'ADVENTURE')}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-lg shadow-lg transform transition hover:scale-[1.02] border border-amber-400/30 flex items-center justify-center gap-3"
                 >
                    <span className="text-2xl">🏰</span>
                    <div className="text-left leading-tight">
                        <div className="text-sm opacity-90 uppercase tracking-widest">Roguelike</div>
                        <div>冒险模式</div>
                    </div>
                 </button>

                 <div className="h-px bg-slate-700 w-full" />

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <h3 className="text-indigo-400 font-bold mb-2 text-xs uppercase">大乱斗</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[2, 3, 4].map(num => (
                                <button key={num} onClick={() => goToClassSelection(num, 'FFA')} className="py-2 rounded bg-slate-700 hover:bg-indigo-600 border border-slate-600 text-sm">{num}人</button>
                            ))}
                        </div>
                     </div>
                     <div>
                        <h3 className="text-rose-400 font-bold mb-2 text-xs uppercase">团队战</h3>
                        <div className="grid grid-cols-3 gap-2">
                             <button onClick={() => goToClassSelection(2, 'TEAM')} className="py-2 rounded bg-slate-700 hover:bg-rose-600 border border-slate-600 text-sm">1v1</button>
                             <button onClick={() => goToClassSelection(4, 'TEAM')} className="py-2 rounded bg-slate-700 hover:bg-rose-600 border border-slate-600 text-sm">2v2</button>
                             <button onClick={() => goToClassSelection(6, 'TEAM')} className="py-2 rounded bg-slate-700 hover:bg-rose-600 border border-slate-600 text-sm">3v3</button>
                        </div>
                     </div>
                 </div>
                 
                 <div className="pt-2">
                     <button onClick={() => setShowManual(true)} className="text-slate-400 text-sm hover:text-white underline">玩法说明</button>
                 </div>
             </div>
           </div>
        </div>
      )}

      {/* ADVENTURE MAP */}
      {phase === 'ADVENTURE_MAP' && (
          <AdventureMap mapData={adventureData} onNodeSelect={handleAdventureNodeSelect} />
      )}

      {/* EVENT MODAL */}
      {phase === 'EVENT' && eventOutcome && (
          <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in zoom-in duration-300 z-50">
             <div className="max-w-md w-full bg-slate-800 border border-slate-600 rounded-2xl p-6 shadow-2xl text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                 <div className="text-5xl mb-4">❓</div>
                 <h2 className="text-2xl font-bold text-white mb-2">{eventOutcome.title}</h2>
                 <p className="text-slate-300 mb-6 italic">{eventOutcome.desc}</p>
                 <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 mb-6">
                     <div className="text-xs text-slate-500 uppercase font-bold mb-1">获得奖励</div>
                     <div className="text-amber-400 font-bold text-lg">{eventOutcome.reward}</div>
                 </div>
                 <button 
                     onClick={() => {
                        const currentRow = adventureData.map[adventureData.currentFloor];
                        const eventNode = currentRow.find(n => n.status === 'AVAILABLE');
                        if (eventNode) completeAdventureNode(eventNode);
                        else setPhase('ADVENTURE_MAP');
                     }}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg"
                 >
                     继续旅程
                 </button>
             </div>
          </div>
      )}

      {/* SHOP */}
      {phase === 'SHOP' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in zoom-in duration-300">
           <div className="max-w-2xl w-full bg-slate-800 border border-slate-600 rounded-2xl p-6 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-white">补给站</h2>
                   <div className="text-amber-400 font-bold font-mono text-xl">💰 {adventureData.gold}</div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                   {SHOP_ITEMS.map(item => (
                       <button
                          key={item.id}
                          onClick={() => buyShopItem(item)}
                          disabled={adventureData.gold < item.cost || (item.type === 'BUFF' && adventureData.permanentBuffs.includes(item.id))}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                            ${(adventureData.gold >= item.cost && !(item.type === 'BUFF' && adventureData.permanentBuffs.includes(item.id)))
                                ? 'bg-slate-700 hover:bg-slate-600 border-slate-500 hover:border-amber-400 cursor-pointer' 
                                : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'}
                          `}
                       >
                           <div className="text-2xl">
                               {item.type === 'HEAL' && '🧪'}
                               {item.type === 'MAX_HP' && '💗'}
                               {item.type === 'BUFF' && '💎'}
                           </div>
                           <div className="flex-1">
                               <div className="font-bold text-white text-sm">{item.name}</div>
                               <div className="text-slate-400 text-xs">{item.description}</div>
                           </div>
                           <div className="font-bold text-amber-400 text-sm font-mono">{item.cost}</div>
                       </button>
                   ))}
               </div>

               <button 
                   onClick={() => {
                       const currentRow = adventureData.map[adventureData.currentFloor];
                       const shopNode = currentRow.find(n => n.status === 'AVAILABLE');
                       if (shopNode) completeAdventureNode(shopNode);
                       else setPhase('ADVENTURE_MAP');
                   }}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
               >
                   离开商店
               </button>
           </div>
        </div>
      )}

      {/* LOOT SELECTION */}
      {phase === 'LOOT' && (
          <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in zoom-in duration-300">
             <h2 className="text-3xl font-bold text-white mb-2 text-shadow-glow">战斗胜利！</h2>
             <p className="text-slate-400 mb-8">选择一项奖励</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
                 {lootOptions.map((item, i) => {
                     // Fix: Distinguish by checking for 'variant' which GameMove has but ShopItem does not
                     const isMove = 'variant' in item; 
                     const isGold = 'type' in item && item.type === 'GOLD';
                     // Check for Upgrade
                     const isUpgrade = isMove && !!item.id && adventureData.deck.includes(item.id);
                     
                     return (
                         <button
                            key={i}
                            onClick={() => handleSelectLoot(item)}
                            className={`
                                group relative bg-slate-800 border-2 rounded-xl p-6 flex flex-col items-center text-center transition-all hover:-translate-y-2 hover:shadow-xl
                                ${isUpgrade ? 'border-amber-500 hover:shadow-amber-500/30' : 
                                  isGold ? 'border-yellow-500 hover:shadow-yellow-500/30 bg-yellow-900/10' :
                                  'border-slate-600 hover:border-cyan-400 hover:shadow-cyan-500/20'}
                            `}
                         >
                            {isUpgrade && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-md">
                                    UPGRADE!
                                </div>
                            )}
                            
                            {isMove && <div className="absolute top-3 left-3 text-cyan-400 font-mono text-xs">{(item as GameMove).cost} EP</div>}
                            
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                                {isMove ? '📜' : (item as ShopItem).type === 'BUFF' ? '💎' : (isGold ? '♻️' : '💰')}
                            </div>
                            
                            <h3 className={`text-xl font-bold mb-2 ${isGold ? 'text-yellow-400' : 'text-white'}`}>
                                {isUpgrade ? `${(item as GameMove).label} (Lv.${(adventureData.cardLevels[(item as GameMove).id!] || 1) + 1})` : (item as any).name || (item as any).label}
                            </h3>
                            
                            <p className="text-sm text-slate-400">
                                {isUpgrade ? `增强技能效果。` : (item as any).description}
                            </p>
                            
                            {isGold && (
                                <div className="mt-2 text-yellow-400 font-bold font-mono">+{(item as ShopItem).value} GOLD</div>
                            )}
                         </button>
                     );
                 })}
             </div>
          </div>
      )}

      {/* CLASS SELECTION */}
      {phase === 'CLASS_SELECTION' && (
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 animate-in slide-in-from-right duration-500 pb-safe">
          <div className="max-w-4xl w-full">
             <h2 className="text-2xl font-bold mb-6 text-center text-white">
                 {gameMode === 'ADVENTURE' ? '配置冒险' : '选择职业'}
             </h2>
             
             {renderClassSelection()}

             <button onClick={() => setPhase('LOBBY')} className="mt-8 block mx-auto text-slate-500 hover:text-slate-300">返回</button>
          </div>
        </div>
      )}

      {/* BATTLE ARENA */}
      {['PLANNING', 'REVEALING', 'RESOLVING', 'GAME_OVER', 'HAND_MANAGEMENT'].includes(phase) && (
        <div className="flex-1 w-full max-w-7xl flex flex-col p-1 md:p-4 gap-2 justify-between">
          
          {/* TURN GUIDE BANNER */}
          <div className="w-full flex justify-center mt-1 mb-1">
              <div className={`
                 px-6 py-1 rounded-full border text-xs font-bold shadow-lg transition-all duration-300 flex items-center gap-2
                 ${phase === 'PLANNING' && needsTarget ? 'bg-amber-900/80 border-amber-500 text-amber-200 animate-pulse' : ''}
                 ${phase === 'PLANNING' && !needsTarget && !selectedMove ? 'bg-blue-900/80 border-blue-500 text-blue-200' : ''}
                 ${phase === 'PLANNING' && selectedMove && !needsTarget ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200' : ''}
                 ${phase === 'RESOLVING' ? 'bg-rose-900/80 border-rose-500 text-rose-200' : ''}
                 ${phase === 'HAND_MANAGEMENT' ? 'bg-indigo-900/80 border-indigo-500 text-indigo-200' : ''}
                 ${phase === 'GAME_OVER' ? 'bg-slate-800 border-slate-500 text-slate-300' : ''}
              `}>
                  {getGuideHint()}
              </div>
          </div>

          {/* TOP ROW: ENEMIES */}
          <div className="flex flex-col items-center w-full gap-2 min-h-[140px] justify-center">
            <div className="flex justify-center gap-2 flex-wrap">
                {enemies.map(p => (
                <PlayerArea 
                    key={p.id} 
                    player={p} 
                    isCurrentPlayer={false}
                    showMove={phase === 'RESOLVING' || phase === 'GAME_OVER'}
                    isTarget={needsTarget && validTargetIds.includes(p.id)}
                    onClick={() => handleTargetClick(p.id)}
                    verticalAlign="top"
                />
                ))}
            </div>
          </div>

          {/* MIDDLE: INFO / LOGS */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 relative my-1 min-h-[80px]">
            {winner && phase === 'GAME_OVER' ? (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center bg-slate-900 p-8 rounded-3xl border border-slate-600 shadow-2xl animate-in zoom-in duration-300">
                    <div className="text-6xl mb-4 animate-bounce">
                        {gameMode === 'ADVENTURE' && winner.team === 'A' ? '🎉' : (gameMode === 'ADVENTURE' ? '💀' : '🏆')}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                        {gameMode === 'ADVENTURE' 
                           ? (winner.team === 'A' ? 'STAGE CLEAR' : 'YOU DIED')
                           : (winner.team === 'A' ? 'VICTORY' : 'DEFEAT')}
                    </h2>
                    <p className="text-slate-400 mb-6">
                        {gameMode === 'ADVENTURE' 
                           ? (winner.team === 'A' ? '本层攻略完成' : `止步于第 ${adventureData.currentStage} 层`)
                           : `${winner.name} 获胜`}
                    </p>
                    <button 
                      onClick={() => {
                           if (gameMode === 'ADVENTURE') {
                               if (winner.team === 'A') {
                                   // Logic is handled by map generation in completeAdventureNode usually, 
                                   // but if we are here it means game ended.
                                   // Actually in new logic we don't end game on stage clear.
                                   // We only get here if we died.
                                   setPhase('LOBBY'); 
                               } else {
                                   setPhase('LOBBY'); // Reset on death
                               }
                           } else {
                               setPhase('LOBBY');
                           }
                      }}
                      className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-bold text-white shadow-lg border border-slate-500"
                    >
                      {gameMode === 'ADVENTURE' && winner.team === 'A' ? '继续' : '返回主菜单'}
                    </button>
                  </div>
              </div>
            ) : (
               <div className="w-full max-w-xl opacity-90 hover:opacity-100 transition-opacity">
                   <GameLog logs={logs} />
               </div>
            )}
          </div>

          {/* BOTTOM ROW: ALLIES & PLAYER */}
          <div className="flex flex-col items-center justify-end pb-safe gap-2">
             
             {/* Controls */}
             {players[0] && (phase === 'PLANNING' || phase === 'HAND_MANAGEMENT') && (
                 <div className="w-full animate-in slide-in-from-bottom-10 duration-300 mb-1 z-50">
                   <Controls 
                      player={players[0]}
                      onSelectMove={handleHumanSelectMove}
                      selectedMove={selectedMove}
                      needsTarget={needsTarget}
                      onSpectatorNext={handleSpectatorNext}
                      onAutoPlay={toggleAutoPlay}
                      onQuit={quitToMenu}
                      isAutoPlaying={isAutoPlaying}
                      onConfirmMove={executeConfirmedMove}
                      gamePhase={phase}
                      onDiscardCards={(indices) => handleDiscardAndDraw(indices)}
                   />
                 </div>
             )}

             {/* Player Cards */}
             <div className="flex justify-center gap-2 flex-wrap">
                {bottomRowPlayers.map((p: Player) => (
                   <div key={p.id} className="relative">
                      <PlayerArea 
                        player={p} 
                        isCurrentPlayer={p.isHuman}
                        showMove={phase === 'RESOLVING' || phase === 'GAME_OVER'}
                        isTarget={needsTarget && validTargetIds.includes(p.id)}
                        onClick={() => handleTargetClick(p.id)}
                        verticalAlign="bottom"
                      />
                      {p.isHuman && !p.isAlive && phase === 'PLANNING' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                              <div className="text-rose-500 font-bold text-xs uppercase tracking-widest border-2 border-rose-500 px-2 py-1 rounded bg-black/80 transform -rotate-6">
                                  阵亡
                              </div>
                          </div>
                      )}
                      {/* Deck Count Indicator */}
                      <div className="absolute -left-8 bottom-0 text-[9px] font-mono text-slate-500 flex flex-col gap-0.5">
                          <span title="抽牌堆">📚{p.drawPile.length}</span>
                          <span title="弃牌堆">🗑️{p.discardPile.length}</span>
                      </div>
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