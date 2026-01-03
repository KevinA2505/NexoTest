
import { Card, UnitType, TargetPreference, TowerType, SpecialAbilityBlueprint } from './types';

export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 675;
export const MAX_ENERGY = 10;
export const BASE_ENERGY_GAIN_RATE = 0.015;
export const GAME_DURATION = 180; // 3 minutos en segundos

export const MOTHERSHIP_BALANCE = {
  cost: 8,
  hpRatioFromOuter: 0.5,
  speed: 0.65,
  collisionRadius: 30,
  damage: 115,
  range: 210,
  attackSpeed: 1200,
  baseCooldownMs: 7000,
  cooldownPerCostMs: 1000,
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
    id: 'infantry', name: 'Infantería Orbital', cost: 2, type: UnitType.GROUND, 
    hp: 180, damage: 28, speed: 1.8, range: 45, attackSpeed: 650, targetPref: TargetPreference.ANY, count: 3, 
    description: 'Básica y barata. Melee.', flavor: 'Soldados desechables del cinturón de asteroides.',
    shape: 'circle', color: '#ffffff', projectileType: 'none' 
  },
  { 
    id: 'marines', name: 'Marines de Plasma', cost: 3, type: UnitType.GROUND, 
    hp: 380, damage: 65, speed: 1.2, range: 190, attackSpeed: 900, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Rango medio, daño sólido.', flavor: 'Entrenados en gravedad cero para combate urbano.',
    shape: 'diamond', color: '#00ffff', projectileType: 'plasma' 
  },
  { 
    id: 'sniper', name: 'Francotirador Láser', cost: 4, type: UnitType.GROUND, 
    hp: 130, damage: 250, speed: 0.8, range: 500, attackSpeed: 2800, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Largo alcance, muy frágil.', flavor: 'Un disparo, un sistema apagado.',
    shape: 'triangle', color: '#ffff00', projectileType: 'laser' 
  },
  { 
    id: 'interceptor', name: 'Drone Interceptor', cost: 3, type: UnitType.AIR, 
    hp: 220, damage: 62, speed: 3.0, range: 160, attackSpeed: 800, targetPref: TargetPreference.AIR, count: 2, 
    description: 'Especialista anti-aéreo.', flavor: 'Drones autónomos con IA de combate obsoleta.',
    shape: 'triangle', color: '#ff00ff', projectileType: 'laser' 
  },
  { 
    id: 'fighter', name: 'Caza Ligero', cost: 4, type: UnitType.AIR, 
    hp: 450, damage: 80, speed: 2.6, range: 140, attackSpeed: 900, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Rápido y hostigador.', flavor: 'Superioridad aérea en un frasco de neón.',
    shape: 'triangle', color: '#00ff00', projectileType: 'plasma' 
  },
  { 
    id: 'guardian', name: 'Mech Guardián', cost: 5, type: UnitType.GROUND, 
    hp: 2200, damage: 110, speed: 0.6, range: 70, attackSpeed: 1600, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Tanque pesado. Melee.', flavor: 'Caminante blindado diseñado para resistir bombardeos.',
    shape: 'hexagon', color: '#999999', projectileType: 'none' 
  },
  { 
    id: 'medic', name: 'Androide Médico', cost: 3, type: UnitType.GROUND, 
    hp: 280, damage: -50, speed: 1.3, range: 170, attackSpeed: 900, targetPref: TargetPreference.ALLIES, count: 1, 
    description: 'Cura unidades aliadas.', flavor: 'Nanobots reparadores.',
    shape: 'cross', color: '#00ffaa', projectileType: 'beam' 
  },
  { 
    id: 'turret', name: 'Torreta Desplegable', cost: 3, type: UnitType.BUILDING, 
    hp: 900, damage: 45, speed: 0, range: 280, attackSpeed: 600, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Estructura defensiva.', flavor: 'Despliegue rápido.',
    shape: 'square', color: '#ffaa00', projectileType: 'plasma' 
  },
  { 
    id: 'swarm', name: 'Enjambre Alienígena', cost: 3, type: UnitType.GROUND, 
    hp: 90, damage: 25, speed: 2.5, range: 45, attackSpeed: 500, targetPref: TargetPreference.ANY, count: 8, 
    description: 'Muchos y rápidos. Melee.', flavor: 'Especies parásitas.',
    shape: 'circle', color: '#aa00ff', projectileType: 'none' 
  },
  { 
    id: 'beast', name: 'Bestia Xenomórfica', cost: 6, type: UnitType.GROUND, 
    hp: 1600, damage: 340, speed: 0.9, range: 65, attackSpeed: 1700, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Daño brutal. Melee.', flavor: 'Error genético.',
    shape: 'hexagon', color: '#ff3300', projectileType: 'none' 
  },
  { 
    id: 'destroyer', name: 'Destructor de Asedio', cost: 5, type: UnitType.GROUND, 
    hp: 1900, damage: 380, speed: 0.5, range: 60, attackSpeed: 3300, targetPref: TargetPreference.TOWERS, count: 1, 
    description: 'Prioriza torres. Melee.', flavor: 'Ariete cinético.',
    shape: 'square', color: '#ff0000', projectileType: 'none' 
  },
  { 
    id: 'mine', name: 'Mina Gravitacional', cost: 2, type: UnitType.BUILDING, 
    hp: 1, damage: 500, speed: 0, range: 10, attackSpeed: 100, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Explosión de contacto.', flavor: 'Carga de profundidad.',
    shape: 'circle', color: '#ffffff', isAoE: true, aoeRadius: 140, projectileType: 'none' 
  },
  { 
    id: 'virus', name: 'Virus Nanita', cost: 4, type: UnitType.SPELL, 
    hp: 0, damage: 22, speed: 0, range: 0, attackSpeed: 0, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Área de daño constante.', flavor: 'Corrosión molecular.',
    shape: 'circle', color: '#00ff00', isAoE: true, aoeRadius: 170, dotDuration: 6000, projectileType: 'none' 
  },
  { 
    id: 'emp', name: 'Pulso EMP', cost: 4, type: UnitType.SPELL, 
    hp: 0, damage: 105, speed: 0, range: 0, attackSpeed: 0, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Aturde enemigos en área.', flavor: 'Sobrecarga circuitos.',
    shape: 'circle', color: '#00ffff', isAoE: true, aoeRadius: 170, stunDuration: 3600, projectileType: 'none' 
  },
  { 
    id: 'tank', name: 'Tanque de Asalto', cost: 4, type: UnitType.GROUND, 
    hp: 1100, damage: 155, speed: 1.0, range: 230, attackSpeed: 1800, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Tanque ligero versátil.', flavor: 'Estándar de oro.',
    shape: 'hexagon', color: '#5555ff', projectileType: 'missile' 
  },
  { 
    id: 'behemoth', name: 'Caminante Behemoth', cost: 7, type: UnitType.GROUND, 
    hp: 3800, damage: 450, speed: 0.4, range: 60, attackSpeed: 3800, targetPref: TargetPreference.TOWERS, count: 1, 
    description: 'Asedio masivo. Solo torres.', flavor: 'Un coloso de metal impenetrable.',
    shape: 'hexagon', color: '#ff0055', projectileType: 'none' 
  },
  { 
    id: 'plasma_ram', name: 'Plasma Ram', cost: 4, type: UnitType.GROUND, 
    hp: 1100, damage: 300, speed: 2.0, range: 50, attackSpeed: 1900, targetPref: TargetPreference.TOWERS, count: 1, 
    description: 'Asedio rápido. Solo torres.', flavor: 'Diseñado para saltar brechas y embestir.',
    shape: 'triangle', color: '#ff6600', projectileType: 'none' 
  },
  { 
    id: 'goliath_drone', name: 'Drone Goliath', cost: 5, type: UnitType.AIR, 
    hp: 1500, damage: 225, speed: 1.3, range: 130, attackSpeed: 2400, targetPref: TargetPreference.TOWERS, count: 1, 
    description: 'Asedio aéreo. Solo torres.', flavor: 'Fortaleza voladora lenta pero imparable.',
    shape: 'square', color: '#ffff33', projectileType: 'plasma' 
  },
  { 
    id: 'nano_catalyst', name: 'Nano-Catalizador', cost: 4, type: UnitType.GROUND, 
    hp: 450, damage: -90, speed: 1.1, range: 210, attackSpeed: 1100, targetPref: TargetPreference.ALLIES, count: 1, 
    description: 'Healer avanzado.', flavor: 'Reconstrucción celular de alto rendimiento.',
    shape: 'hexagon', color: '#ffffff', projectileType: 'beam' 
  },
  { 
    id: 'spider_swarm', name: 'Spider Swarm', cost: 4, type: UnitType.GROUND, 
    hp: 160, damage: 35, speed: 2.2, range: 50, attackSpeed: 550, targetPref: TargetPreference.ANY, count: 12, 
    description: 'Enjambre masivo. Melee.', flavor: 'Cientos de micro-drones voraces.',
    shape: 'star', color: '#ff00ff', projectileType: 'none' 
  },
  { 
    id: 'iron_star_tank', name: 'Tanque Iron Star', cost: 6, type: UnitType.GROUND, 
    hp: 3100, damage: 210, speed: 0.7, range: 180, attackSpeed: 2200, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Súper-Tanque con cañón pesado.', flavor: 'La joya de la corona de la división acorazada.',
    shape: 'hexagon', color: '#ffaa00', projectileType: 'missile' 
  },
  { 
    id: 'nova_squad', name: 'Escuadrón Nova', cost: 4, type: UnitType.GROUND, 
    hp: 550, damage: 85, speed: 1.4, range: 220, attackSpeed: 1000, targetPref: TargetPreference.ANY, count: 3, 
    description: 'Trío de élite bien equilibrado.', flavor: 'Tres sombras en la oscuridad del espacio.',
    shape: 'diamond', color: '#00ccff', projectileType: 'plasma' 
  },
  { 
    id: 'cryo_blast', name: 'Criogenización', cost: 3, type: UnitType.SPELL, 
    hp: 0, damage: 50, speed: 0, range: 0, attackSpeed: 0, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Ralentiza y daña levemente.', flavor: 'Cero absoluto en un radio táctico.',
    shape: 'circle', color: '#aaffff', isAoE: true, aoeRadius: 160, stunDuration: 4200, projectileType: 'none' 
  },
  { 
    id: 'napalm_strike', name: 'Lluvia de Napalm', cost: 5, type: UnitType.SPELL, 
    hp: 0, damage: 45, speed: 0, range: 0, attackSpeed: 0, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Daño masivo por quemadura (DoT).', flavor: 'El vacío no detendrá el fuego.',
    shape: 'triangle', color: '#ff4400', isAoE: true, aoeRadius: 180, dotDuration: 9000, projectileType: 'none' 
  },
  { 
    id: 'orbital_laser', name: 'Rayo Orbital', cost: 6, type: UnitType.SPELL, 
    hp: 0, damage: 750, speed: 0, range: 0, attackSpeed: 0, targetPref: TargetPreference.ANY, count: 1, 
    description: 'Láser pesado desde la Torre Rey.', flavor: 'Juicio final desde la estratosfera.',
    shape: 'star', color: '#ff0000', isAoE: true, aoeRadius: 120, projectileType: 'beam' 
  },
  { 
    id: 'healing_matrix', name: 'Matriz de Sanación', cost: 4, type: UnitType.SPELL, 
    hp: 0, damage: -120, speed: 0, range: 0, attackSpeed: 1000, targetPref: TargetPreference.ALLIES, count: 1, 
    description: 'Cura aliada en área por 5s.', flavor: 'Bruma de nanobots regeneradores.',
    shape: 'circle', color: '#32cd32', isAoE: true, aoeRadius: 170, projectileType: 'none' 
  }
];

export const INITIAL_TOWERS_PLAYER = [
  { type: TowerType.KING, x: 100, y: ARENA_HEIGHT / 2, hp: 2975, range: 330, damage: 130, lane: 'CENTER' },
  { type: TowerType.INNER, x: 260, y: ARENA_HEIGHT / 2 - 120, hp: 1530, range: 270, damage: 95, lane: 'TOP' },
  { type: TowerType.INNER, x: 260, y: ARENA_HEIGHT / 2 + 120, hp: 1530, range: 270, damage: 95, lane: 'BOTTOM' },
  { type: TowerType.OUTER, x: 460, y: ARENA_HEIGHT / 2 - 180, hp: 2040, range: 270, damage: 90, lane: 'TOP' },
  { type: TowerType.OUTER, x: 460, y: ARENA_HEIGHT / 2 + 180, hp: 2040, range: 270, damage: 90, lane: 'BOTTOM' },
];

export const INITIAL_TOWERS_AI = [
  { type: TowerType.KING, x: ARENA_WIDTH - 100, y: ARENA_HEIGHT / 2, hp: 2975, range: 330, damage: 130, lane: 'CENTER' },
  { type: TowerType.INNER, x: ARENA_WIDTH - 260, y: ARENA_HEIGHT / 2 - 120, hp: 1530, range: 270, damage: 95, lane: 'TOP' },
  { type: TowerType.INNER, x: ARENA_WIDTH - 260, y: ARENA_HEIGHT / 2 + 120, hp: 1530, range: 270, damage: 95, lane: 'BOTTOM' },
  { type: TowerType.OUTER, x: ARENA_WIDTH - 460, y: ARENA_HEIGHT / 2 - 180, hp: 2040, range: 270, damage: 90, lane: 'TOP' },
  { type: TowerType.OUTER, x: ARENA_WIDTH - 460, y: ARENA_HEIGHT / 2 + 180, hp: 2040, range: 270, damage: 90, lane: 'BOTTOM' },
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
