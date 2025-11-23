

export type ActionType = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'HEAL' | 'BUFF' | 'SACRIFICE';
export type MoveVariant = 'BASIC' | 'ADVANCED'; // BASIC usually low cost, ADVANCED high cost

export interface GameMove {
  type: ActionType;
  variant: MoveVariant;
  cost: number;
  damage?: number; // For attacks
  label: string;
  description?: string;
  id?: string; // Optional ID for looking up in decks
  uuid?: string; // Unique ID for hand management to distinguish duplicate cards
  level?: number; // Current upgrade level
}

export type ClassType = 'GUARDIAN' | 'STRIKER' | 'CHANNELER' | 'BERSERKER' | 'ARCANIST' | 'BOSS';

export interface PlayerClassData {
  id: ClassType;
  name: string;
  description: string; // Short description
  icon: string;
  baseHp: number;
  baseEnergy: number;
  passive: string; // Description of passive ability
}

export type TeamId = 'A' | 'B' | 'NONE';

export interface Player {
  id: number;
  team: TeamId; // New: Team affiliation
  name: string;
  classType: ClassType;
  isHuman: boolean;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number; 
  shield: number; // New: Persistent shield points
  isAlive: boolean;
  lastMove?: GameMove;
  lastTargetId?: number; 
  status: 'IDLE' | 'READY' | 'ACTING' | 'ELIMINATED' | 'WINNER';
  damageTakenThisRound: number;
  energyGainedThisRound: number;
  hpRecoveredThisRound?: number;
  // Adventure Mode Specifics
  buffs?: string[]; // IDs of active buffs
  
  // Card System
  library: string[]; // All cards owned (Deck List IDs)
  cardLevels?: Record<string, number>; // Map of Card ID -> Level (for upgrades)
  drawPile: string[]; // Current Draw Pile IDs
  hand: GameMove[]; // Current Hand Objects
  discardPile: string[]; // Current Discard Pile IDs
}

export interface LogEntry {
  id: string;
  round: number;
  text: string;
  type: 'info' | 'combat' | 'death' | 'win' | 'loot' | 'event';
}

export type GamePhase = 'LOBBY' | 'CLASS_SELECTION' | 'PLANNING' | 'REVEALING' | 'RESOLVING' | 'HAND_MANAGEMENT' | 'GAME_OVER' | 'ADVENTURE_MAP' | 'SHOP' | 'LOOT' | 'EVENT';

export type GameMode = 'FFA' | 'TEAM' | 'ADVENTURE';

export interface Step {
  index: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  estimated_duration_minutes: number;
  required_resources?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface TaskSolverResponse {
  steps?: Step[];
  reply?: string;
  [key: string]: any;
}

// --- ADVENTURE MODE TYPES ---

export type NodeType = 'START' | 'BATTLE' | 'ELITE' | 'SHOP' | 'REST' | 'BOSS' | 'EVENT';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface AdventureNode {
  id: string;
  row: number; // Depth/Floor within current map
  col: number; // Horizontal position
  type: NodeType;
  label: string;
  difficulty: number;
  icon: string;
  description: string;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'SKIPPED';
  nextNodes: string[]; // IDs of connected nodes in next row
  x?: number; // Visual X % (calculated)
  y?: number; // Visual Y % (calculated)
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'BUFF' | 'HEAL' | 'MAX_HP' | 'GOLD';
  cost: number;
  description: string;
  value?: number; // Amount to heal or buff ID
}

export interface AdventureState {
  currentStage: number; // The overarching Level/World (1, 2, 3...)
  currentFloor: number; // Current Row Index in the current map
  gold: number;
  maxHpMod: number; // Bonus max HP gained
  permanentBuffs: string[]; // List of buff IDs
  map: AdventureNode[][]; // 2D Grid: [Row][Col]
  difficulty: Difficulty;
  deck: string[]; // The player's current library in adventure
  cardLevels: Record<string, number>; // Map of Card ID -> Level
}