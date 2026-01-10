import { ARENA_HEIGHT, ARENA_WIDTH, CARD_LIBRARY, MECHA_NEXODO_BALANCE, isMeleeSingleUnitCard } from '../../constants';
import { GameState, GameUnit, TargetPreference, Team, TowerType, UnitType } from '../../types';

const MECHA_SPAWN_OFFSET_X = 140;

const resolveMechaMode = (mode?: string): GameUnit['mechaMode'] => {
  if (mode === 'laser' || mode === 'shield') return mode;
  return 'shield';
};

const getSpawnPosition = (state: GameState, team: Team) => {
  const king = state.towers.find(t => t.team === team && t.type === TowerType.KING && !t.isDead);
  const fallbackX = team === Team.PLAYER ? MECHA_SPAWN_OFFSET_X : ARENA_WIDTH - MECHA_SPAWN_OFFSET_X;
  const fallbackY = ARENA_HEIGHT / 2;

  if (!king) {
    return { x: fallbackX, y: fallbackY };
  }

  const direction = team === Team.PLAYER ? 1 : -1;
  const spawnX = Math.min(Math.max(40, king.x + MECHA_SPAWN_OFFSET_X * direction), ARENA_WIDTH - 40);
  return { x: spawnX, y: king.y };
};

export const applyMechaNexodoAbility = (
  state: GameState,
  casterTeam: Team,
  pilotCardId?: string,
  mode?: string
): GameState => {
  const pilotCard = CARD_LIBRARY.find(card => card.id === pilotCardId);
  if (!pilotCard || pilotCard.type === UnitType.SPELL || !isMeleeSingleUnitCard(pilotCard)) return state;

  const mechaMode = resolveMechaMode(mode);
  const spawnPosition = getSpawnPosition(state, casterTeam);
  const lane: GameUnit['lane'] = spawnPosition.y < ARENA_HEIGHT / 2 ? 'TOP' : 'BOTTOM';

  const mechaUnit: GameUnit = {
    id: 'mecha-' + Math.random().toString(16).slice(2),
    cardId: pilotCard.id,
    faction: pilotCard.faction,
    team: casterTeam,
    type: pilotCard.type,
    visualFamily: pilotCard.visualFamily,
    spellShape: pilotCard.spellShape,
    alienSubtype: pilotCard.alienSubtype,
    x: spawnPosition.x,
    y: spawnPosition.y,
    hp: pilotCard.hp,
    maxHp: pilotCard.hp,
    damage: pilotCard.damage,
    range: pilotCard.range,
    speed: pilotCard.speed,
    attackSpeed: pilotCard.attackSpeed,
    lastAttack: 0,
    targetId: null,
    targetPref: pilotCard.targetPref,
    lane,
    isDead: false,
    shape: pilotCard.shape,
    color: pilotCard.color,
    isAoE: pilotCard.isAoE,
    aoeRadius: pilotCard.aoeRadius,
    stunTimer: 1000,
    dotTimer: 0,
    projectileType: pilotCard.projectileType,
    isOverclocked: false,
    splitOnDeath: pilotCard.splitOnDeath,
    spawnChildId: pilotCard.spawnChild,
    isMecha: true,
    mechaMode,
    mechaHp: MECHA_NEXODO_BALANCE.extraHp,
    mechaMaxHp: MECHA_NEXODO_BALANCE.extraHp,
    mechaLaserCooldownMs: MECHA_NEXODO_BALANCE.laserCooldownMs,
    mechaLaserActiveMs: mechaMode === 'laser' ? MECHA_NEXODO_BALANCE.laserDurationMs : 0,
    mechaPilotCardId: pilotCard.id
  };

  const spawnEffect = {
    id: 'mecha-nexodo-fx-' + Math.random(),
    x: mechaUnit.x,
    y: mechaUnit.y,
    type: 'shockwave' as const,
    timer: 800,
    maxTimer: 800,
    color: MECHA_NEXODO_BALANCE.frameColor,
    radius: 150,
    sourceFaction: mechaUnit.faction
  };

  const nextPlayerEnergy = casterTeam === Team.PLAYER
    ? Math.max(0, state.playerEnergy - MECHA_NEXODO_BALANCE.activationCost)
    : state.playerEnergy;
  const nextAiEnergy = casterTeam === Team.AI
    ? Math.max(0, state.aiEnergy - MECHA_NEXODO_BALANCE.activationCost)
    : state.aiEnergy;

  return {
    ...state,
    units: [...state.units, mechaUnit],
    effects: [...state.effects, spawnEffect],
    playerEnergy: nextPlayerEnergy,
    aiEnergy: nextAiEnergy,
    commanderAbilityCooldown: casterTeam === Team.PLAYER ? MECHA_NEXODO_BALANCE.laserCooldownMs : state.commanderAbilityCooldown,
    aiCommanderAbilityCooldown: casterTeam === Team.AI ? MECHA_NEXODO_BALANCE.laserCooldownMs : state.aiCommanderAbilityCooldown
  };
};
