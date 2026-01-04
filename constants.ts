
import { AlienSubtype, Card, Faction, TowerType, SpecialAbilityBlueprint, UnitType, TargetPreference } from './types';

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

export const CARD_LIBRARY: Card[] = [
  {
    id: 'infantry',
    name: 'Guardia de Vanguardia',
    cost: 2,
    type: UnitType.GROUND,
    faction: Faction.HUMAN,
    hp: 480,
    damage: 38,
    speed: 1.2,
    range: 28,
    attackSpeed: 1100,
    targetPref: TargetPreference.ANY,
    description: 'Escudos cinéticos al frente. Tapa ráfagas iniciales y remata enjambres cuerpo a cuerpo.',
    flavor: '“Avanzamos por reflejo: escudo arriba, cabeza abajo, moral intacta.”',
    count: 3,
    shape: 'square',
    color: '#3ba7d5',
    projectileType: 'none'
  },
  {
    id: 'marines',
    name: 'Duelos Élite',
    cost: 3,
    type: UnitType.GROUND,
    faction: Faction.HUMAN,
    hp: 360,
    damage: 60,
    speed: 1.6,
    range: 24,
    attackSpeed: 900,
    targetPref: TargetPreference.ANY,
    description: 'Espadas dobles para cortar líneas blandas y presionar tanques lentos a corta distancia.',
    flavor: '“Dos hojas, cero dudas.”',
    count: 2,
    shape: 'triangle',
    color: '#1f8a70',
    projectileType: 'none'
  },
  {
    id: 'guardian',
    name: 'Abanderado de Moral',
    cost: 4,
    type: UnitType.GROUND,
    faction: Faction.HUMAN,
    hp: 540,
    damage: -45,
    speed: 1.3,
    range: 80,
    attackSpeed: 1200,
    targetPref: TargetPreference.ALLIES,
    description: 'Lanza curas de cercanía y mantiene la línea unida. Neutraliza daño de desgaste y castiga AOE prolongado.',
    flavor: '“Si oyes el cuerno, aún podemos resistir.”',
    count: 1,
    shape: 'diamond',
    color: '#f2c14f',
    projectileType: 'none'
  },
  {
    id: 'fighter',
    name: 'Caza de Apoyo',
    cost: 4,
    type: UnitType.AIR,
    faction: Faction.HUMAN,
    hp: 520,
    damage: 44,
    speed: 2.2,
    range: 190,
    attackSpeed: 850,
    targetPref: TargetPreference.ANY,
    description: 'Ráfagas de cohetes de rango medio que dispersan masas y frenan pushes ligeros.',
    flavor: '“Si lo ves, ya está marcado.”',
    count: 1,
    isAoE: true,
    aoeRadius: 60,
    shape: 'hexagon',
    color: '#ff914d',
    projectileType: 'missile'
  },
  {
    id: 'nova_squad',
    name: 'Escuadra Nova',
    cost: 5,
    type: UnitType.GROUND,
    faction: Faction.HUMAN,
    hp: 410,
    damage: 95,
    speed: 1,
    range: 250,
    attackSpeed: 1700,
    targetPref: TargetPreference.ANY,
    description: 'Francotiradores con disparo de carga: abren huecos en tanques y estructuras, pero necesitan protección.',
    flavor: '“Respira, apunta, desaparece.”',
    count: 2,
    shape: 'star',
    color: '#9c7bff',
    projectileType: 'beam'
  },
  {
    id: 'iron_star_tank',
    name: 'Tanque Estrella de Hierro',
    cost: 6,
    type: UnitType.GROUND,
    faction: Faction.HUMAN,
    hp: 1500,
    damage: 90,
    speed: 0.6,
    range: 140,
    attackSpeed: 1400,
    targetPref: TargetPreference.ANY,
    description: 'Blindaje grueso y sistemas de ruido activo. Provoke/taunt natural para absorber fuego enemigo.',
    flavor: '“Si no disparan al tanque, algo anda mal.”',
    count: 1,
    isAoE: true,
    aoeRadius: 70,
    shape: 'circle',
    color: '#6b7a8f',
    projectileType: 'plasma'
  },
  {
    id: 'tank',
    name: 'Búnker de Apoyo',
    cost: 4,
    type: UnitType.BUILDING,
    faction: Faction.HUMAN,
    hp: 1000,
    damage: 60,
    speed: 0,
    range: 200,
    attackSpeed: 900,
    targetPref: TargetPreference.ANY,
    description: 'Cobertura fija que refuerza pushes aliados y limpia hostigamiento cercano. Ideal contra enjambres terrestres.',
    flavor: '“Metal, sacos terreros y café recalentado: hogar temporal.”',
    count: 1,
    shape: 'square',
    color: '#8f9aa5',
    projectileType: 'plasma'
  },
  {
    id: 'skyfire_radar',
    name: 'Radar Skyfire',
    cost: 3,
    type: UnitType.BUILDING,
    faction: Faction.HUMAN,
    hp: 620,
    damage: 68,
    speed: 0,
    range: 260,
    attackSpeed: 1100,
    targetPref: TargetPreference.AIR,
    description: 'Estación AA especializada: derriba drones y cazas a larga distancia sin gastar tropas de línea.',
    flavor: '“Ojos en el cielo, gatillo ligero.”',
    count: 1,
    shape: 'triangle',
    color: '#5ad1e3',
    projectileType: 'laser'
  },
  {
    id: 'orbital_laser',
    name: 'Bombardeo Orbital',
    cost: 6,
    type: UnitType.SPELL,
    faction: Faction.HUMAN,
    hp: 1,
    damage: 420,
    speed: 0,
    range: 0,
    attackSpeed: 0,
    targetPref: TargetPreference.ANY,
    description: 'Golpe puntual de alta energía. Elimina blobs y reduce torres a quemaduras criticas.',
    flavor: '“No es apoyo. Es sentencia.”',
    count: 1,
    isAoE: true,
    aoeRadius: 120,
    shape: 'hexagon',
    color: '#ff4f70',
    projectileType: 'beam'
  },
  {
    id: 'healing_matrix',
    name: 'Aumento de Moral',
    cost: 3,
    type: UnitType.SPELL,
    faction: Faction.HUMAN,
    hp: 1,
    damage: -200,
    speed: 0,
    range: 0,
    attackSpeed: 0,
    targetPref: TargetPreference.ALLIES,
    description: 'Pulso de moral/velocidad: cura en área durante unos segundos y estabiliza pushes antes del cruce.',
    flavor: '“Segunda bocanada, segundo empuje.”',
    count: 1,
    isAoE: true,
    aoeRadius: 180,
    shape: 'circle',
    color: '#5ee290',
    projectileType: 'none'
  },
  {
    id: 'humanoid_psionic_disruptor',
    name: 'Disruptor Psiónico',
    cost: 3,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 420,
    damage: 46,
    speed: 1.4,
    range: 36,
    attackSpeed: 950,
    targetPref: TargetPreference.ANY,
    description: 'Descarga cortes mentales que desajustan formaciones, pero pierde control bajo daño cinético o ráfagas EMP.',
    flavor: '“Tu rabia es mi munición… hasta que me desconectas.”',
    count: 3,
    shape: 'triangle',
    color: '#9f5de2',
    projectileType: 'none'
  },
  {
    id: 'humanoid_vampiric_raider',
    name: 'Asaltante Vampírico',
    cost: 4,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 560,
    damage: 52,
    speed: 1.25,
    range: 32,
    attackSpeed: 1000,
    targetPref: TargetPreference.ANY,
    description: 'Drena vitalidad para extender combates, pero sus tejidos se rompen rápido ante impacto cinético y pulsos EMP.',
    flavor: '“Tu sangre retumba mejor que cualquier tambor de guerra.”',
    count: 2,
    shape: 'square',
    color: '#c43d6f',
    projectileType: 'none'
  },
  {
    id: 'humanoid_morale_controller',
    name: 'Controlador de Moral',
    cost: 4,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 500,
    damage: -40,
    speed: 1.15,
    range: 95,
    attackSpeed: 1250,
    targetPref: TargetPreference.ALLIES,
    description: 'Impulsa valor psiónico y desarma moraleja enemiga, pero su foco se rompe con proyectiles cinéticos y picos EMP.',
    flavor: '“No luchan por su bandera; luchan porque así lo ordeno.”',
    count: 1,
    isAoE: true,
    aoeRadius: 120,
    shape: 'diamond',
    color: '#7bcfa5',
    projectileType: 'none'
  },
  {
    id: 'humanoid_synaptic_marksman',
    name: 'Tirador de Rayos Sinápticos',
    cost: 4,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 380,
    damage: 70,
    speed: 1.3,
    range: 210,
    attackSpeed: 1150,
    targetPref: TargetPreference.ANY,
    description: 'Hazes enlazados que encadenan daño a distancia, pero un impacto cinético o EMP dispersa la sinapsis al instante.',
    flavor: '“Sigue el brillo; la corriente hace el resto.”',
    count: 2,
    shape: 'hexagon',
    color: '#70d1ff',
    projectileType: 'beam'
  },
  {
    id: 'humanoid_fusion_orb_caster',
    name: 'Artífice de Orbes de Fusión',
    cost: 5,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 360,
    damage: 120,
    speed: 1.1,
    range: 190,
    attackSpeed: 1800,
    targetPref: TargetPreference.ANY,
    description: 'Lanza orbes de carga lenta que estallan en área; balas cinéticas y descargas EMP desestabilizan la reacción.',
    flavor: '“Si chispea, retrocede. Si zumba, corre.”',
    count: 1,
    isAoE: true,
    aoeRadius: 70,
    shape: 'cross',
    color: '#ffb347',
    projectileType: 'plasma'
  },
  {
    id: 'humanoid_psychic_bastion',
    name: 'Centurión de Escudo Psíquico',
    cost: 6,
    type: UnitType.GROUND,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 1600,
    damage: 78,
    speed: 0.75,
    range: 110,
    attackSpeed: 1250,
    targetPref: TargetPreference.ANY,
    description: 'Barrera mental que refleja daño ligero y sostiene la línea, pero colapsa si recibe ráfagas cinéticas o EMP sostenido.',
    flavor: '“La mente levanta muros; el plomo los derriba.”',
    count: 1,
    shape: 'circle',
    color: '#5ac1d6',
    projectileType: 'none'
  },
  {
    id: 'humanoid_psionic_pylon',
    name: 'Pilar Psiónico de Aura',
    cost: 4,
    type: UnitType.BUILDING,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 900,
    damage: 0,
    speed: 0,
    range: 0,
    attackSpeed: 0,
    targetPref: TargetPreference.ALLIES,
    description: 'Ancla de aura que acelera regeneración psíquica cercana; proyectiles cinéticos y pulsos EMP apagan su resonancia.',
    flavor: '“No es piedra: es voluntad solidificada.”',
    count: 1,
    shape: 'diamond',
    color: '#d4a5ff',
    projectileType: 'none'
  },
  {
    id: 'humanoid_adaptive_portal',
    name: 'Portal de Refuerzos Adaptativos',
    cost: 5,
    type: UnitType.BUILDING,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 820,
    damage: 52,
    speed: 0,
    range: 160,
    attackSpeed: 1200,
    targetPref: TargetPreference.ANY,
    description: 'Canaliza refuerzos y dispara descargas para cubrir la llegada; daño cinético y EMP desconfiguran la matriz de enlace.',
    flavor: '“Cada chispa abre un pasillo, salvo cuando el metal lo aplasta.”',
    count: 1,
    shape: 'square',
    color: '#7be0d8',
    projectileType: 'laser'
  },
  {
    id: 'humanoid_psychic_silence',
    name: 'Silencio Psíquico',
    cost: 3,
    type: UnitType.SPELL,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 1,
    damage: 0,
    speed: 0,
    range: 0,
    attackSpeed: 0,
    targetPref: TargetPreference.ANY,
    description: 'Apaga canales de habilidad en un área corta; defensas cinéticas o choques EMP quiebran el silencio prematuramente.',
    flavor: '“Calla, piensa, avanza.”',
    count: 1,
    isAoE: true,
    aoeRadius: 140,
    shape: 'hexagon',
    color: '#a0b8ff',
    projectileType: 'none'
  },
  {
    id: 'humanoid_fear_wave',
    name: 'Onda de Miedo',
    cost: 4,
    type: UnitType.SPELL,
    faction: Faction.ALIEN,
    alienSubtype: AlienSubtype.HUMANOID,
    hp: 1,
    damage: 80,
    speed: 0,
    range: 0,
    attackSpeed: 0,
    targetPref: TargetPreference.ANY,
    description: 'Desborda pánico que dispersa formaciones; balas cinéticas y pulsos EMP rompen la ola mental y reducen su impacto.',
    flavor: '“El miedo es contagioso… hasta que algo te despierta de golpe.”',
    count: 1,
    isAoE: true,
    aoeRadius: 190,
    shape: 'circle',
    color: '#ff9fb3',
    projectileType: 'beam'
  }
];

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
