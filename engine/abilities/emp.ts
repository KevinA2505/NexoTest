import { ARENA_HEIGHT, ARENA_WIDTH, EMP_ABILITY_BALANCE } from '../../constants';
import { GameState, Team } from '../../types';

export type EmpModeKey = keyof typeof EMP_ABILITY_BALANCE.modes;

export const getEmpModeConfig = (mode?: string) => {
  const fallback = EMP_ABILITY_BALANCE.modes[EMP_ABILITY_BALANCE.defaultMode as EmpModeKey];
  if (!mode) return fallback;
  return EMP_ABILITY_BALANCE.modes[mode as EmpModeKey] || fallback;
};

export const applyEmpAbility = (state: GameState, casterTeam: Team, mode?: string): GameState => {
  const modeConfig = getEmpModeConfig(mode);
  const centerX = ARENA_WIDTH / 2;
  const centerY = ARENA_HEIGHT / 2;

  const updatedUnits = state.units.map(unit => {
    if (unit.team === casterTeam || unit.isDead) return unit;
    const inRange = Math.hypot(unit.x - centerX, unit.y - centerY) <= EMP_ABILITY_BALANCE.radius;
    if (!inRange) return unit;

    return {
      ...unit,
      stunTimer: Math.max(unit.stunTimer, modeConfig.stunDuration),
      hp: unit.hp - modeConfig.damage
    };
  });

  return {
    ...state,
    units: updatedUnits,
    effects: [
      ...state.effects,
      {
        id: 'emp-' + Math.random(),
        x: centerX,
        y: centerY,
        type: 'emp_wave',
        timer: 1000,
        maxTimer: 1000,
        color: '#00ccff',
        radius: EMP_ABILITY_BALANCE.radius
      }
    ],
    playerEnergy: Math.max(0, state.playerEnergy - EMP_ABILITY_BALANCE.cost),
    commanderAbilityCooldown: EMP_ABILITY_BALANCE.cooldownMs
  };
};
