
export type ActionType = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'HEAL' | 'BUFF' | 'SACRIFICE';
export type MoveVariant = 'BASIC' | 'ADVANCED'; // BASIC usually low cost, ADVANCED high cost

export interface GameMove {
  type: ActionType;
  variant: MoveVariant;
  cost: number;
  damage?: number; // For attacks
  label: string;
  description?: string;
}

export type ClassType = 'GUARDIAN' | 'STRIKER' | 'CHANNELER';

export interface PlayerClassData {
  id: ClassType;
  name: string;
  description: string;
  icon: string;
  baseHp: number;
  baseEnergy: number;
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
}

export interface LogEntry {
  id: string;
  round: number;
  text: string;
  type: 'info' | 'combat' | 'death' | 'win';
}

export type GamePhase = 'LOBBY' | 'CLASS_SELECTION' | 'PLANNING' | 'REVEALING' | 'RESOLVING' | 'GAME_OVER';

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
