
import { AlienSubtype, Card, Faction, TowerType, SpecialAbilityBlueprint, UnitType } from './types';

export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 675;
export const MAX_ENERGY = 10;
export const BASE_ENERGY_GAIN_RATE = 0.015;
export const GAME_DURATION = 180; // 3 minutos en segundos
export const BRIDGE_X = ARENA_WIDTH / 2;
export const BRIDGE_TOP_Y = ARENA_HEIGHT / 2 - 190;
export const BRIDGE_BOTTOM_Y = ARENA_HEIGHT / 2 + 190;
export const BRIDGE_GAP_HALF = 100;

export const MOTHERSHIP_BALANCE = {
  cost: 8,
  hpRatioFromOuter: 0.625,
  speed: 0.55,
  collisionRadius: 30,
  damage: 0,
  range: 0,
  attackSpeed: 5000,
  baseCooldownMs: 30000,
  payloadBaseIntervalMs: 7000,
  payloadIntervalPerCostMs: 1000,
  color: '#9ae6ff' as const
};

export const EMP_ABILITY_BALANCE = {
  cost: 3,
  radius: 260,
  cooldownMs: 24000,
  defaultMode: 'lockdown',
  modes: {
    lockdown: {
      key: 'lockdown',
      label: 'Modo 1 · Apagón total',
      description: 'Aturde al máximo sin aplicar daño.',
      stunDuration: 3600,
      damage: 0
    },
    disruptor: {
      key: 'disruptor',
      label: 'Modo 2 · Disrupción',
      description: 'Aturde menos tiempo pero inflige daño ligero.',
      stunDuration: 1800,
      damage: 70
    }
  }
} as const;

export const CARD_LIBRARY: Card[] = [];

export const CARD_DISTRIBUTION_SCHEMA = [
  {
    group: 'Humanos',
    faction: Faction.HUMAN,
    slots: { melee: 3, shooters: 2, tank: 1, structures: 2, spells: 2 }
  },
  {
    group: 'Androides',
    faction: Faction.ANDROID,
    slots: { melee: 3, shooters: 2, tank: 1, structures: 2, spells: 2 }
  },
  {
    group: 'Alien Humanoide',
    faction: Faction.ALIEN,
    subtype: AlienSubtype.HUMANOID,
    slots: { melee: 3, shooters: 2, tank: 1, structures: 2, spells: 2 }
  },
  {
    group: 'Alien Arácnido',
    faction: Faction.ALIEN,
    subtype: AlienSubtype.ARACNID,
    slots: { melee: 3, shooters: 2, tank: 1, structures: 2, spells: 2 }
  },
  {
    group: 'Alien Slimoide',
    faction: Faction.ALIEN,
    subtype: AlienSubtype.SLIMOID,
    slots: { melee: 3, shooters: 2, tank: 1, structures: 2, spells: 2 }
  }
] as const;

// TOP/BOTTOM lanes: inner towers now sit at x=220 (y offsets ±120) and outers at x=380 (y offsets ±180) to open extra space near the bridges.
export const INITIAL_TOWERS_PLAYER = [
  { type: TowerType.KING, x: 100, y: ARENA_HEIGHT / 2, hp: 2975, range: 330, damage: 130, lane: 'CENTER' },
  { type: TowerType.INNER, x: 220, y: ARENA_HEIGHT / 2 - 120, hp: 1530, range: 270, damage: 95, lane: 'TOP' },
  { type: TowerType.INNER, x: 220, y: ARENA_HEIGHT / 2 + 120, hp: 1530, range: 270, damage: 95, lane: 'BOTTOM' },
  { type: TowerType.OUTER, x: 380, y: ARENA_HEIGHT / 2 - 180, hp: 2040, range: 270, damage: 90, lane: 'TOP' },
  { type: TowerType.OUTER, x: 380, y: ARENA_HEIGHT / 2 + 180, hp: 2040, range: 270, damage: 90, lane: 'BOTTOM' },
];

export const INITIAL_TOWERS_AI = [
  { type: TowerType.KING, x: ARENA_WIDTH - 100, y: ARENA_HEIGHT / 2, hp: 2975, range: 330, damage: 130, lane: 'CENTER' },
  { type: TowerType.INNER, x: ARENA_WIDTH - 220, y: ARENA_HEIGHT / 2 - 120, hp: 1530, range: 270, damage: 95, lane: 'TOP' },
  { type: TowerType.INNER, x: ARENA_WIDTH - 220, y: ARENA_HEIGHT / 2 + 120, hp: 1530, range: 270, damage: 95, lane: 'BOTTOM' },
  { type: TowerType.OUTER, x: ARENA_WIDTH - 380, y: ARENA_HEIGHT / 2 - 180, hp: 2040, range: 270, damage: 90, lane: 'TOP' },
  { type: TowerType.OUTER, x: ARENA_WIDTH - 380, y: ARENA_HEIGHT / 2 + 180, hp: 2040, range: 270, damage: 90, lane: 'BOTTOM' },
];

export const OUTER_TOWER_HP = INITIAL_TOWERS_PLAYER.find(t => t.type === TowerType.OUTER)?.hp || 0;
export const MOTHERSHIP_HP = Math.round(OUTER_TOWER_HP * MOTHERSHIP_BALANCE.hpRatioFromOuter);

export const SPECIAL_ABILITIES: SpecialAbilityBlueprint[] = [
  {
    id: 'emp_overwatch',
    name: 'Pulso EMP de Saturación',
    badge: 'Control',
    description: 'Desactiva unidades robóticas y ralentiza sistemas durante una ventana crítica.',
    cost: EMP_ABILITY_BALANCE.cost,
    cooldown: Math.floor(EMP_ABILITY_BALANCE.cooldownMs / 1000),
    options: [
      {
        key: 'mode',
        label: 'Modo del pulso',
        description: 'Alterna entre aturdimiento completo o disrupción con daño.',
        type: 'select',
        choices: [
          { 
            value: EMP_ABILITY_BALANCE.modes.lockdown.key, 
            label: EMP_ABILITY_BALANCE.modes.lockdown.label, 
            hint: `${EMP_ABILITY_BALANCE.modes.lockdown.stunDuration / 1000}s de aturdimiento, sin daño`
          },
          { 
            value: EMP_ABILITY_BALANCE.modes.disruptor.key, 
            label: EMP_ABILITY_BALANCE.modes.disruptor.label, 
            hint: `${EMP_ABILITY_BALANCE.modes.disruptor.stunDuration / 1000}s + ${EMP_ABILITY_BALANCE.modes.disruptor.damage} daño`
          }
        ],
        defaultValue: EMP_ABILITY_BALANCE.defaultMode
      }
    ]
  },
  {
    id: 'mothership_command',
    name: 'Llamado de Nave Nodriza',
    badge: 'Apoyo',
    description: 'Despliega una nave insignia lenta con tropas embarcadas para abrir camino.',
    cost: MOTHERSHIP_BALANCE.cost,
    cooldown: Math.floor(MOTHERSHIP_BALANCE.baseCooldownMs / 1000),
    options: [
      {
        key: 'hangarUnit',
        label: 'Carga de Hangar',
        description: 'Tropa embarcada que se despliega junto a la nave insignia.',
        type: 'select',
        choices: CARD_LIBRARY
          .filter(c => c.type !== UnitType.SPELL)
          .map(c => ({
            value: c.id,
            label: `${c.name} · ${c.cost}⚡`,
            hint: c.description
          })),
        defaultValue: CARD_LIBRARY.find(c => c.type !== UnitType.SPELL)?.id
      }
    ]
  }
];

export const createDefaultAbilityConfig = (ability: SpecialAbilityBlueprint) => ability.options.reduce((config, option) => {
  let defaultValue = option.defaultValue;

  if (defaultValue === undefined) {
    if (option.type === 'select' && option.choices?.length) defaultValue = option.choices[0].value;
    if (option.type === 'slider' && option.min !== undefined) defaultValue = option.min;
    if (option.type === 'toggle') defaultValue = false;
  }

  return { ...config, [option.key]: defaultValue ?? '' };
}, {} as Record<string, string | number | boolean>);

export const findAbilityById = (id: string) => SPECIAL_ABILITIES.find(a => a.id === id);
