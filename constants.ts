
import { GameMove, PlayerClassData } from './types';

export const BASE_HP = 3;
export const BASE_ENERGY = 0;

export const CLASSES: Record<string, PlayerClassData> = {
  GUARDIAN: {
    id: 'GUARDIAN',
    name: '铁卫',
    description: '坚如磐石。生命值上限 +1。',
    icon: '🛡️',
    baseHp: 4,
    baseEnergy: 0,
  },
  STRIKER: {
    id: 'STRIKER',
    name: '强袭',
    description: '进攻专家。【元气弹】消耗减少 1 点能量。',
    icon: '⚔️',
    baseHp: 3,
    baseEnergy: 0,
  },
  CHANNELER: {
    id: 'CHANNELER',
    name: '充能者',
    description: '能量大师。初始携带 2 点能量。',
    icon: '🔮',
    baseHp: 3,
    baseEnergy: 2,
  },
};

export const MOVES: Record<string, GameMove> = {
  // --- BASIC ---
  CHARGE: {
    type: 'CHARGE',
    variant: 'BASIC',
    cost: 0,
    label: '积攒',
    description: '获得 1 点能量。'
  },
  ATTACK_LOW: {
    type: 'ATTACK',
    variant: 'BASIC',
    cost: 1,
    damage: 1,
    label: '冲击波',
    description: '消耗1能量，造成1伤害。优先扣除护盾。'
  },
  DEFEND_LOW: {
    type: 'DEFEND',
    variant: 'BASIC',
    cost: 0,
    label: '格挡',
    description: '抵挡本回合受到的普通冲击波伤害。'
  },
  
  // --- ADVANCED ---
  ATTACK_HIGH: {
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 3,
    damage: 2, 
    label: '元气弹',
    description: '消耗3能量，造成2伤害。无视护盾，无视普通格挡。'
  },
  DEFEND_HIGH: {
    type: 'DEFEND',
    variant: 'ADVANCED',
    cost: 1,
    label: '绝对防御',
    description: '消耗1能量。本回合抵挡所有类型的伤害。'
  },

  // --- NEW SKILLS ---
  SACRIFICE: {
    type: 'SACRIFICE',
    variant: 'ADVANCED',
    cost: 0,
    label: '燃血',
    description: '扣除 1 点生命值，获得 2 点能量。'
  },
  LIGHT_SHIELD: {
    type: 'BUFF',
    variant: 'BASIC',
    cost: 1,
    label: '光盾',
    description: '消耗1能量，获得1层护盾。每层护盾可抵消1次普通伤害（永久存在直到被打破）。'
  },
  HEAL: {
    type: 'HEAL',
    variant: 'ADVANCED',
    cost: 2,
    label: '治愈',
    description: '消耗2能量，使指定目标（队友或自己）恢复 1 点生命值。'
  }
};

export const AVATARS = [
  '🧑‍🚀', '🤖', '👽', '👾', '🦸', '🦹', '🧙', '🥷'
];

export const COLORS = {
  ENERGY: 'text-cyan-400',
  HP: 'text-rose-500',
  DEFENSE: 'text-emerald-400',
  SHIELD: 'text-slate-300',
};

export const SYSTEM_INSTRUCTION = "You are a helpful AI assistant capable of breaking down tasks into steps and providing strategic advice.";
