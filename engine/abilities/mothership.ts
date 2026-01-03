import { ARENA_HEIGHT, ARENA_WIDTH, CARD_LIBRARY, MOTHERSHIP_BALANCE, MOTHERSHIP_HP } from '../../constants';
import { GameState, GameUnit, TargetPreference, Team, UnitType } from '../../types';

const SPAWN_OFFSET_X = 140;
const SPAWN_OFFSET_Y = 150;

const createUnitsFromCard = (cardId: string, team: Team, lane: 'TOP' | 'BOTTOM', originX: number, originY: number) => {
  const card = CARD_LIBRARY.find(c => c.id === cardId);
  if (!card || card.type === UnitType.SPELL) return [] as GameUnit[];

  const units: GameUnit[] = [];
  for (let i = 0; i < (card.count || 1); i++) {
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 80;

    units.push({
      id: Math.random().toString(),
      cardId: card.id,
      team,
      type: card.type,
      x: originX + offsetX,
      y: originY + offsetY,
      hp: card.hp,
      maxHp: card.hp,
      damage: card.damage,
      range: card.range,
      speed: card.speed,
      attackSpeed: card.attackSpeed,
      lastAttack: 0,
      targetId: null,
      targetPref: card.targetPref,
      lane,
      isDead: false,
      shape: card.shape,
      color: card.color,
      isAoE: card.isAoE,
      aoeRadius: card.aoeRadius,
      stunTimer: 0,
      dotTimer: 0,
      projectileType: card.projectileType,
      isOverclocked: false,
      collisionRadius: undefined
    });
  }

  return units;
};

const pickLaneForReinforcement = (state: GameState, team: Team) => {
  const scoreLane = (lane: 'TOP' | 'BOTTOM') => {
    const allies = state.units.filter(u => u.team === team && u.lane === lane && !u.isDead).length;
    const enemies = state.units.filter(u => u.team !== team && u.lane === lane && !u.isDead).length;
    return enemies - allies;
  };

  const topScore = scoreLane('TOP');
  const bottomScore = scoreLane('BOTTOM');
  return topScore >= bottomScore ? 'TOP' : 'BOTTOM';
};

export const getMothershipCooldownMs = (cardCost?: number) => {
  return MOTHERSHIP_BALANCE.baseCooldownMs + (cardCost || 0) * MOTHERSHIP_BALANCE.cooldownPerCostMs;
};

export const applyMothershipAbility = (state: GameState, casterTeam: Team, hangarCardId?: string): GameState => {
  const hangarCard = CARD_LIBRARY.find(c => c.id === hangarCardId && c.type !== UnitType.SPELL);
  if (!hangarCard) return state;

  const lane = pickLaneForReinforcement(state, casterTeam);
  const spawnX = casterTeam === Team.PLAYER ? SPAWN_OFFSET_X : ARENA_WIDTH - SPAWN_OFFSET_X;
  const spawnY = ARENA_HEIGHT / 2 + (lane === 'TOP' ? -SPAWN_OFFSET_Y : SPAWN_OFFSET_Y);

  const mothership: GameUnit = {
    id: 'ms-' + Math.random(),
    cardId: 'mothership_flagship',
    team: casterTeam,
    type: UnitType.AIR,
    x: spawnX,
    y: spawnY,
    hp: MOTHERSHIP_HP,
    maxHp: MOTHERSHIP_HP,
    damage: MOTHERSHIP_BALANCE.damage,
    range: MOTHERSHIP_BALANCE.range,
    speed: MOTHERSHIP_BALANCE.speed,
    attackSpeed: MOTHERSHIP_BALANCE.attackSpeed,
    lastAttack: 0,
    targetId: null,
    targetPref: TargetPreference.ANY,
    lane,
    isDead: false,
    shape: 'hexagon',
    color: MOTHERSHIP_BALANCE.color,
    isAoE: false,
    aoeRadius: undefined,
    stunTimer: 0,
    dotTimer: 0,
    projectileType: 'plasma',
    isOverclocked: false,
    collisionRadius: MOTHERSHIP_BALANCE.collisionRadius,
    isMothership: true,
    payloadCardId: hangarCard.id
  };

  const escorts = createUnitsFromCard(hangarCard.id, casterTeam, lane, spawnX + 18, spawnY);

  const newEffects = [
    ...state.effects,
    {
      id: 'ms-burn-' + Math.random(),
      x: spawnX,
      y: spawnY,
      type: 'shockwave' as const,
      timer: 700,
      maxTimer: 700,
      color: MOTHERSHIP_BALANCE.color,
      radius: 140
    }
  ];

  return {
    ...state,
    units: [...state.units, mothership, ...escorts],
    effects: newEffects,
    playerEnergy: casterTeam === Team.PLAYER ? Math.max(0, state.playerEnergy - MOTHERSHIP_BALANCE.cost) : state.playerEnergy,
    aiEnergy: casterTeam === Team.AI ? Math.max(0, state.aiEnergy - MOTHERSHIP_BALANCE.cost) : state.aiEnergy,
    commanderAbilityCooldown: casterTeam === Team.PLAYER ? getMothershipCooldownMs(hangarCard.cost) : state.commanderAbilityCooldown,
    aiCommanderAbilityCooldown: casterTeam === Team.AI ? getMothershipCooldownMs(hangarCard.cost) : state.aiCommanderAbilityCooldown
  };
};
