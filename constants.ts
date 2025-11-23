

import { GameMove, PlayerClassData, ShopItem, AdventureNode, Difficulty, ClassType } from './types';

export const BASE_HP = 3;
export const BASE_ENERGY = 0;
export const MAX_HAND_SIZE = 5;

export const SYSTEM_INSTRUCTION = "You are a helpful assistant for the card game Energy Duel. You can answer questions about card effects, game rules, and strategy.";

export const DIFFICULTIES: Record<Difficulty, { name: string, hpMod: number, goldMod: number, desc: string, color: string }> = {
  EASY: { name: '简单', hpMod: 0.6, goldMod: 1.5, desc: '敌人血量大幅降低，适合新手', color: 'text-green-400' },
  NORMAL: { name: '普通', hpMod: 0.85, goldMod: 1.2, desc: '标准体验，轻松愉快', color: 'text-blue-400' },
  HARD: { name: '困难', hpMod: 1.1, goldMod: 1.0, desc: '充满挑战的敌人', color: 'text-rose-500' }
};

export const BUFF_ICONS: Record<string, string> = {
  'BUFF_START_E': '🔋',
  'BUFF_THORN': '🌵',
  'BUFF_VAMP': '🧛',
  'BUFF_SHIELD_START': '🛡️',
  'BUFF_INVULNERABLE': '✨',
  'BUFF_REFLECT': '💢',
};

// Map Move IDs to GameMove objects
export const MOVES: Record<string, GameMove> = {
  // --- BASIC ---
  CHARGE: {
    id: 'CHARGE',
    type: 'CHARGE',
    variant: 'BASIC',
    cost: 0,
    label: '积攒',
    description: '获得 1 点能量(EP)。不消耗手牌。'
  },
  ATTACK_LOW: {
    id: 'ATTACK_LOW',
    type: 'ATTACK',
    variant: 'BASIC',
    cost: 1,
    damage: 1,
    label: '冲击波',
    description: '造成 1 点[普通伤害]，并恢复 1 点生命。'
  },
  DEFEND_LOW: {
    id: 'DEFEND_LOW',
    type: 'DEFEND',
    variant: 'BASIC',
    cost: 0,
    label: '格挡',
    description: '【即时】获得 1 点[普通防御]。每点防御可抵消 1 点[普通伤害]。使用后可继续出牌。'
  },
  
  // --- ADVANCED ---
  ATTACK_HIGH: {
    id: 'ATTACK_HIGH',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 3,
    damage: 2, 
    label: '元气弹',
    description: '造成 2 点[必杀伤害]，无视普通防御。命中恢复 1HP 和 1EP。'
  },
  DEFEND_HIGH: {
    id: 'DEFEND_HIGH',
    type: 'DEFEND',
    variant: 'ADVANCED',
    cost: 1,
    label: '绝对防御',
    description: '【即时】本回合免疫所有类型的伤害。使用后可继续出牌。'
  },

  // --- SPECIALS / UTILITY ---
  SACRIFICE: {
    id: 'SACRIFICE',
    type: 'SACRIFICE',
    variant: 'BASIC',
    cost: 0,
    label: '燃血',
    description: '【即时】消耗 1 HP，获得 2 EP。使用后可继续出牌。'
  },
  LIGHT_SHIELD: {
    id: 'LIGHT_SHIELD',
    type: 'BUFF',
    variant: 'BASIC',
    cost: 1,
    label: '光盾',
    description: '获得 1 点【护盾值】。护盾视为[普通防御]，可叠加。'
  },
  HEAL: {
    id: 'HEAL',
    type: 'HEAL',
    variant: 'ADVANCED',
    cost: 2,
    label: '治愈',
    description: '消耗 2 点能量，恢复 1 点生命值(HP)。'
  },
  
  // --- NEW AOE CARD ---
  SHOCKWAVE: {
    id: 'SHOCKWAVE',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 2,
    damage: 1,
    label: '震荡波',
    description: '对[所有单位]造成 1 点[普通伤害]。命中恢复 1 HP。'
  }
};

export const SPECIAL_MOVES: GameMove[] = [
  {
    id: 'DOUBLE_STRIKE',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 1,
    damage: 1,
    label: '二连击',
    description: '【即时】消耗 1 EP，对目标造成 2 次 1 点[普通伤害]。使用后可继续出牌。' 
  },
  {
    id: 'MEDITATE',
    type: 'CHARGE',
    variant: 'ADVANCED',
    cost: 0,
    label: '冥想',
    description: '消耗 1 点生命值，获得 2 点能量。'
  },
  {
    id: 'VAMP_STRIKE',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 3,
    damage: 1,
    label: '吸血斩',
    description: '造成 1 点[必杀伤害]。若造成伤害，恢复自身 1 点生命值。'
  },
  {
    id: 'SPIKE_SHIELD',
    type: 'DEFEND',
    variant: 'ADVANCED',
    cost: 1,
    label: '刺盾',
    description: '【即时】进行绝对防御。若成功抵挡伤害，反弹 1 点真实伤害。'
  },
  {
    id: 'SHOCKWAVE',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 2,
    damage: 1,
    label: '震荡波',
    description: '对[所有单位]造成 1 点[普通伤害]。命中恢复 1 HP。'
  },
  {
    id: 'ARCANE_BURST',
    type: 'ATTACK',
    variant: 'ADVANCED',
    cost: 0,
    damage: 0,
    label: '奥术冲击',
    description: '消耗所有当前能量，每消耗 1 点能量造成 1 点[普通伤害]。'
  }
];

// Standard Deck for ALL classes
export const STANDARD_DECK = [
    'ATTACK_LOW', 'ATTACK_LOW', 'ATTACK_LOW', // 3 Basic Attacks
    'DEFEND_LOW', 'DEFEND_LOW', // 2 Basic Defends
    'ATTACK_HIGH', // 1 Heavy Attack
    'DEFEND_HIGH', // 1 Heavy Defend
    'SACRIFICE', // 1 Utility
    'LIGHT_SHIELD', // 1 Utility
    'LIGHT_SHIELD' // 1 Utility 
];

// Multiplayer Extra Deck (Adds Shockwave)
export const MULTIPLAYER_EXTRA_CARDS = [
    'SHOCKWAVE'
];

// Bonus cards added based on class choice
export const CLASS_BONUS_CARDS: Record<string, string[]> = {
    'GUARDIAN': ['SPIKE_SHIELD', 'SPIKE_SHIELD'],
    'STRIKER': ['DOUBLE_STRIKE', 'DOUBLE_STRIKE'],
    'CHANNELER': ['SHOCKWAVE', 'SHOCKWAVE'],
    'BERSERKER': ['VAMP_STRIKE', 'VAMP_STRIKE'],
    'ARCANIST': ['ARCANE_BURST', 'ARCANE_BURST'],
    'BOSS': []
};

// Classes
export const CLASSES: Record<ClassType, PlayerClassData> = {
  GUARDIAN: {
    id: 'GUARDIAN',
    name: '守护者',
    description: '高血量 反伤',
    icon: '🛡️',
    baseHp: 5,
    baseEnergy: 0,
    passive: '基础生命值 +2'
  },
  STRIKER: {
    id: 'STRIKER',
    name: '强袭者',
    description: '低耗能 连击',
    icon: '⚔️',
    baseHp: 3,
    baseEnergy: 0,
    passive: '元气弹(必杀)消耗 -1 EP'
  },
  CHANNELER: {
    id: 'CHANNELER',
    name: '唤灵师',
    description: '高能量 群伤',
    icon: '🔮',
    baseHp: 3,
    baseEnergy: 2,
    passive: '战斗开始时 +1 EP'
  },
  BERSERKER: {
    id: 'BERSERKER',
    name: '狂战士',
    description: '高爆发 吸血',
    icon: '🪓',
    baseHp: 4,
    baseEnergy: 0,
    passive: '造成伤害时获得 1 EP'
  },
  ARCANIST: {
    id: 'ARCANIST',
    name: '奥术师',
    description: '能量爆发',
    icon: '🧙‍♂️',
    baseHp: 3,
    baseEnergy: 0,
    passive: '【积攒】获得 2 EP'
  },
  BOSS: {
    id: 'BOSS',
    name: '魔王',
    description: 'BOSS',
    icon: '👹',
    baseHp: 10,
    baseEnergy: 2,
    passive: '强大无比'
  }
};

export const SHOP_ITEMS: ShopItem[] = [
    { id: 'POTION_S', name: '小生命药水', type: 'HEAL', cost: 30, value: 1, description: '恢复 1 HP' },
    { id: 'POTION_L', name: '大生命药水', type: 'HEAL', cost: 50, value: 3, description: '恢复 3 HP' },
    { id: 'HEART', name: '生命之心', type: 'MAX_HP', cost: 80, value: 1, description: 'Max HP +1' },
    { id: 'BUFF_START_E', name: '充能戒指', type: 'BUFF', cost: 100, description: '战斗开始 +1 EP' },
    { id: 'BUFF_THORN', name: '荆棘护甲', type: 'BUFF', cost: 120, description: '完美防御反弹 1 伤' },
    { id: 'BUFF_VAMP', name: '吸血鬼之牙', type: 'BUFF', cost: 150, description: '击杀敌人回 1 HP' },
    { id: 'BUFF_SHIELD_START', name: '光之护符', type: 'BUFF', cost: 90, description: '战斗开始 +1 光盾' },
];
