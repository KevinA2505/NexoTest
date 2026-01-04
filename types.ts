
export enum Team {
  PLAYER = 'PLAYER',
  AI = 'AI'
}

export enum UnitType {
  GROUND = 'GROUND',
  AIR = 'AIR',
  BUILDING = 'BUILDING',
  SPELL = 'SPELL'
}

export enum Faction {
  HUMAN = 'HUMAN',
  ANDROID = 'ANDROID',
  ALIEN = 'ALIEN'
}

export enum AlienSubtype {
  HUMANOID = 'HUMANOID',
  ARACNID = 'ARACNID',
  SLIMOID = 'SLIMOID'
}

export enum TargetPreference {
  ANY = 'ANY',
  TOWERS = 'TOWERS',
  AIR = 'AIR',
  ALLIES = 'ALLIES'
}

export enum TowerType {
  OUTER = 'OUTER',
  INNER = 'INNER',
  KING = 'KING'
}

export type ProjectileStyle = 'laser' | 'plasma' | 'missile' | 'beam' | 'none';
export type ArenaState = 'normal' | 'overtime_glitch';

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: UnitType;
  faction: Faction;
  alienSubtype?: AlienSubtype;
  splitOnDeath?: boolean;
  spawnChild?: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  attackSpeed: number; // ms
  targetPref: TargetPreference;
  description: string;
  flavor: string;
  count: number;
  isAoE?: boolean;
  aoeRadius?: number;
  stunDuration?: number; // ms
  dotDuration?: number; // ms
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'cross' | 'star';
  color: string;
  projectileType: ProjectileStyle;
}

export interface GameUnit {
  id: string;
  cardId: string;
  team: Team;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackSpeed: number;
  lastAttack: number;
  targetId: string | null;
  targetPref: TargetPreference;
  lane: 'TOP' | 'BOTTOM';
  isDead: boolean;
  shape: string;
  color: string;
  isAoE?: boolean;
  aoeRadius?: number;
  stunTimer: number; 
  dotTimer: number;
  projectileType: ProjectileStyle;
  isOverclocked?: boolean; // Bonus de evolución
  collisionRadius?: number;
  isMothership?: boolean;
  payloadCardId?: string;
  payloadSpawnTimer?: number;
  splitOnDeath?: boolean;
  spawnChildId?: string;
}

export interface Tower {
  id: string;
  team: Team;
  type: TowerType;
  lane: 'TOP' | 'BOTTOM' | 'CENTER';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  lastAttack: number;
  attackSpeed: number;
  isDead: boolean;
  locked: boolean;
  shockwaveCooldown: number; // Nueva mecánica defensiva
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  team: Team;
  targetId: string;
  style: ProjectileStyle;
  color: string;
}

export interface VisualEffect {
  id: string;
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  type: 'explosion' | 'spark' | 'heal' | 'muzzle' | 'emp_wave' | 'laser_beam' | 'shockwave' | 'healing_field' | 'glitch';
  timer: number;
  maxTimer: number;
  color: string;
  radius?: number;
}

export interface PendingSpell {
  id: string;
  cardId: string;
  team: Team;
  x: number;
  y: number;
  timer: number; 
}

export interface ActiveSpell {
  id: string;
  cardId: string;
  team: Team;
  x: number;
  y: number;
  duration: number; // ms restantes
  nextTick: number; // ms hasta siguiente tick
}

export interface GameState {
  playerEnergy: number;
  aiEnergy: number;
  playerHand: string[];
  playerDeck: string[]; 
  playerSelection: string[]; 
  aiHand: string[];
  aiDeck: string[];
  units: GameUnit[];
  towers: Tower[];
  projectiles: Projectile[];
  effects: VisualEffect[];
  pendingSpells: PendingSpell[];
  activeSpells: ActiveSpell[]; // Hechizos persistentes (como Matriz de Sanación)
  time: number;
  status: 'START' | 'PLAYING' | 'VICTORY' | 'DEFEAT' | 'CODEX' | 'DECK_EDITOR';
  previousStatus: 'START' | 'PLAYING' | 'VICTORY' | 'DEFEAT' | 'CODEX' | 'DECK_EDITOR';
  difficulty: number;
  commanderAbilityCooldown: number; // Enfriamiento de la habilidad especial
  aiCommanderAbilityCooldown: number;
  aiSpecialAbility: SelectedSpecialAbility;
  arenaState: ArenaState;
  arenaStateSince?: number;
}

export type SpecialAbilityOptionType = 'toggle' | 'slider' | 'select';

export interface SpecialAbilityOption {
  key: string;
  label: string;
  description: string;
  type: SpecialAbilityOptionType;
  min?: number;
  max?: number;
  step?: number;
  choices?: { value: string; label: string; hint?: string }[];
  defaultValue?: string | number | boolean;
}

export interface SpecialAbilityBlueprint {
  id: string;
  name: string;
  description: string;
  cost: number;
  cooldown: number;
  badge?: string;
  options: SpecialAbilityOption[];
}

export interface SelectedSpecialAbility {
  id: string;
  configuration: Record<string, string | number | boolean>;
}

export type TrackType = 'climax_3min' | 'meditation_5min';

export type Instrument = 'pad' | 'piano' | 'drums' | 'voidDrone';

export interface NoteEvent {
  instrument: Instrument;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}
