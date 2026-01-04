import { ARENA_HEIGHT, ARENA_WIDTH, ARACNO_HIVE_ABILITY_BALANCE, ARACNO_HIVE_BALANCE, ARACNO_SPIDER_MODES } from '../../constants';
import { Faction, GameState, GameUnit, TargetPreference, Team, TowerType, UnitType } from '../../types';

export type AracnoModeKey = 'lethal' | 'healing' | 'kamikaze';

const MODE_TO_CARD: Record<AracnoModeKey, string> = {
  lethal: 'aracno_spider_lethal',
  healing: 'aracno_spider_heal',
  kamikaze: 'aracno_spider_kami'
};

const resolveAracnoMode = (mode?: string): AracnoModeKey => {
  if (!mode) return ARACNO_HIVE_ABILITY_BALANCE.defaultMode as AracnoModeKey;
  return (MODE_TO_CARD as Record<string, string>)[mode] ? (mode as AracnoModeKey) : (ARACNO_HIVE_ABILITY_BALANCE.defaultMode as AracnoModeKey);
};

const getSpawnPosition = (team: Team, kingX: number, kingY: number) => {
  const direction = team === Team.PLAYER ? 1 : -1;
  const offsetX = ARACNO_HIVE_BALANCE.relativePositionFromKing.x * direction;
  const offsetY = ARACNO_HIVE_BALANCE.relativePositionFromKing.y;
  const x = Math.min(Math.max(40, kingX + offsetX), ARENA_WIDTH - 40);
  const y = Math.min(Math.max(40, kingY + offsetY), ARENA_HEIGHT - 40);
  return { x, y };
};

export const applyAracnoAbility = (state: GameState, casterTeam: Team, mode?: string): GameState => {
  const king = state.towers.find(t => t.team === casterTeam && t.type === TowerType.KING && !t.isDead);
  if (!king) return state;

  const hasActiveHive = state.units.some(u => u.cardId === 'aracno_hive' && u.team === casterTeam && !u.isDead);
  if (hasActiveHive) return state;

  const selectedMode = resolveAracnoMode(mode);
  const spawnCardId = MODE_TO_CARD[selectedMode];
  const position = getSpawnPosition(casterTeam, king.x, king.y);
  const lane: GameUnit['lane'] = position.y < ARENA_HEIGHT / 2 ? 'TOP' : 'BOTTOM';
  const abilityInstanceId = 'aracno-hive-' + Math.random().toString(16).slice(2);

  const hive: GameUnit = {
    id: abilityInstanceId,
    cardId: 'aracno_hive',
    faction: Faction.ALIEN,
    team: casterTeam,
    type: UnitType.BUILDING,
    visualFamily: 'organico',
    x: position.x,
    y: position.y,
    hp: ARACNO_HIVE_BALANCE.hp,
    maxHp: ARACNO_HIVE_BALANCE.hp,
    damage: 0,
    range: 0,
    speed: 0,
    attackSpeed: 0,
    lastAttack: 0,
    targetId: null,
    targetPref: TargetPreference.ANY,
    lane,
    isDead: false,
    shape: 'hexagon',
    color: '#b4ff9f',
    isAoE: false,
    stunTimer: 0,
    dotTimer: 0,
    projectileType: 'none',
    collisionRadius: 48,
    spawnIntervalMs: ARACNO_HIVE_BALANCE.spawnIntervalMs,
    spawnCountdownMs: ARACNO_HIVE_BALANCE.spawnIntervalMs,
    decayPerMs: ARACNO_HIVE_BALANCE.decayPerSecond / 1000,
    spawnCardId,
    spawnCount: 2,
    abilityInstanceId,
    spawnOnHitEffect: selectedMode === 'healing' ? 'heal' : selectedMode === 'kamikaze' ? 'poison' : undefined,
    spawnOnHitDotDurationMs: selectedMode === 'kamikaze' ? ARACNO_SPIDER_MODES.kamikaze.dotDuration : undefined,
    spawnMode: selectedMode
  };

  const spawnEffect = {
    id: 'aracno-hive-fx-' + Math.random(),
    x: hive.x,
    y: hive.y,
    type: 'shockwave' as const,
    timer: 900,
    maxTimer: 900,
    color: hive.color,
    radius: 150,
    sourceFaction: hive.faction
  };

  const nextPlayerEnergy = casterTeam === Team.PLAYER ? Math.max(0, state.playerEnergy - ARACNO_HIVE_ABILITY_BALANCE.cost) : state.playerEnergy;
  const nextAiEnergy = casterTeam === Team.AI ? Math.max(0, state.aiEnergy - ARACNO_HIVE_ABILITY_BALANCE.cost) : state.aiEnergy;

  return {
    ...state,
    units: [...state.units, hive],
    effects: [...state.effects, spawnEffect],
    playerEnergy: nextPlayerEnergy,
    aiEnergy: nextAiEnergy,
    commanderAbilityCooldown: casterTeam === Team.PLAYER ? ARACNO_HIVE_ABILITY_BALANCE.cooldown * 1000 : state.commanderAbilityCooldown,
    aiCommanderAbilityCooldown: casterTeam === Team.AI ? ARACNO_HIVE_ABILITY_BALANCE.cooldown * 1000 : state.aiCommanderAbilityCooldown
  };
};
