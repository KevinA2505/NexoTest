
import { GameState, Team, GameUnit, Tower, TowerType, Projectile, UnitType, TargetPreference, VisualEffect, Card, ActiveSpell, Faction, VisualFamily, AlienSubtype } from '../types';
import { ARENA_WIDTH, ARENA_HEIGHT, BASE_ENERGY_GAIN_RATE, MAX_ENERGY, GAME_DURATION, CARD_LIBRARY, BRIDGE_X, BRIDGE_TOP_Y, BRIDGE_BOTTOM_Y, BRIDGE_GAP_HALF, MECHA_NEXODO_BALANCE } from '../constants';
import { createUnitsFromCard, getMothershipPayloadIntervalMs } from './abilities/mothership';
import { playSfx } from './audio';
import { inferAttackKindFromCard, inferAttackKindFromProjectile, inferAttackKindFromUnit } from './utils/attackKind';

const BRIDGE_CENTERS = [BRIDGE_TOP_Y, BRIDGE_BOTTOM_Y];

const isWithinBridgeGap = (y: number) => BRIDGE_CENTERS.some(center => Math.abs(center - y) <= BRIDGE_GAP_HALF);

const nearestBridgeCenter = (y: number) => BRIDGE_CENTERS.reduce((closest, current) => {
  return Math.abs(current - y) < Math.abs(closest - y) ? current : closest;
});

const resolveSubfaction = (
  faction: Faction | undefined,
  visualFamily?: VisualFamily,
  alienSubtype?: AlienSubtype
): VisualFamily | AlienSubtype | undefined => {
  if (faction === Faction.ALIEN) return alienSubtype;
  return visualFamily ?? alienSubtype;
};

const registerDamage = (state: GameState, team: Team, amount: number) => {
  if (amount <= 0) return;
  state.damageTaken[team] = (state.damageTaken[team] || 0) + amount;
};

const isTowerTarget = (target: GameUnit | Tower): target is Tower => 'locked' in target;

const registerDamageDealt = (state: GameState, team: Team, amount: number, targetIsTower: boolean) => {
  if (amount <= 0) return;
  state.metrics.totalDamage[team] = (state.metrics.totalDamage[team] || 0) + amount;
  if (targetIsTower) {
    state.metrics.towerDamage[team] = (state.metrics.towerDamage[team] || 0) + amount;
  }
};

const dispatchSfxForEffect = (effect: VisualEffect, at: number) => {
  const baseOptions = {
    at,
    style: effect.sourceStyle,
    faction: effect.sourceFaction,
    subfaction: effect.sourceAlienSubtype ?? effect.sourceVisualFamily,
    attackKind: effect.attackKind,
    cardId: effect.sourceCardId,
    variant: effect.variant
  };
  switch (effect.type) {
    case 'muzzle':
      playSfx('muzzle', baseOptions);
      break;
    case 'spark':
      playSfx('impact', baseOptions);
      break;
    case 'explosion':
      playSfx('explosion', baseOptions);
      break;
    case 'heal':
      playSfx('heal', { ...baseOptions, attackKind: effect.attackKind ?? 'heal' });
      break;
    case 'healing_field':
      playSfx('healing_field', { ...baseOptions, attackKind: effect.attackKind ?? 'heal' });
      break;
    case 'emp_wave':
      playSfx('emp_wave', { ...baseOptions, attackKind: effect.attackKind ?? 'laser' });
      break;
    case 'shockwave':
      playSfx('shockwave', baseOptions);
      break;
    case 'laser_beam':
      playSfx('laser_beam', { ...baseOptions, attackKind: effect.attackKind ?? 'laser', style: effect.sourceStyle ?? 'beam' });
      break;
    case 'glitch':
      playSfx('glitch', baseOptions);
      break;
  }
};

const addEffect = (state: GameState, effect: VisualEffect) => {
  state.effects.push(effect);
  dispatchSfxForEffect(effect, state.time);
};

const applyDamageToUnit = (unit: GameUnit, damage: number) => {
  if (damage <= 0) {
    return { totalDamage: 0, hpDamage: 0, mechaDamage: 0 };
  }

  let remainingDamage = damage;
  let mechaDamage = 0;

  if (unit.isMecha && (unit.mechaHp ?? 0) > 0) {
    mechaDamage = Math.min(unit.mechaHp ?? 0, remainingDamage);
    unit.mechaHp = Math.max(0, (unit.mechaHp ?? 0) - mechaDamage);
    remainingDamage -= mechaDamage;
  }

  const prevHp = unit.hp;
  unit.hp = Math.max(0, unit.hp - remainingDamage);
  const hpDamage = prevHp - unit.hp;

  return { totalDamage: mechaDamage + hpDamage, hpDamage, mechaDamage };
};

const findEnemyTarget = (unit: GameUnit, state: GameState): { x: number, y: number, id: string } | null => {
  const enemyTeam = unit.team === Team.PLAYER ? Team.AI : Team.PLAYER;
  const potentialTargets: (GameUnit | Tower)[] = [];

  if (unit.targetPref !== TargetPreference.TOWERS) {
    state.units.forEach(u => {
      if (u.team === enemyTeam && !u.isDead) {
        if (unit.type === UnitType.GROUND && unit.projectileType === 'none' && u.type === UnitType.AIR) return;
        if (unit.targetPref === TargetPreference.AIR && u.type !== UnitType.AIR) return;
        potentialTargets.push(u);
      }
    });
  }

  state.towers.forEach(t => {
    if (t.team === enemyTeam && !t.isDead && !t.locked) {
      potentialTargets.push(t);
    }
  });

  if (potentialTargets.length > 0) {
    const sorted = potentialTargets.sort((a, b) => {
      const distA = Math.hypot(a.x - unit.x, a.y - unit.y);
      const distB = Math.hypot(b.x - unit.x, b.y - unit.y);
      return distA - distB;
    });
    const target = sorted[0];
    return { x: target.x, y: target.y, id: target.id };
  }

  return null;
};

export const updateGame = (state: GameState, deltaTime: number): GameState => {
  const newState: GameState = {
    ...state,
    damageTaken: { ...state.damageTaken },
    metrics: {
      ...state.metrics,
      totalDamage: { ...state.metrics.totalDamage },
      towerDamage: { ...state.metrics.towerDamage },
      totalCost: { ...state.metrics.totalCost },
      totalCardsPlayed: { ...state.metrics.totalCardsPlayed },
      cardUsage: {
        ...state.metrics.cardUsage,
        [Team.PLAYER]: { ...state.metrics.cardUsage[Team.PLAYER] },
        [Team.AI]: { ...state.metrics.cardUsage[Team.AI] }
      }
    }
  };
  const previousElapsedSeconds = state.time / 1000;
  const previousTotalDuration = GAME_DURATION + (state.suddenDeathActive ? state.suddenDeathTimeExtensionMs / 1000 : 0);
  const previousTimeRemaining = Math.max(0, previousTotalDuration - previousElapsedSeconds);
  
  newState.time += deltaTime;
  const elapsedSeconds = newState.time / 1000;
  const totalDuration = GAME_DURATION + (newState.suddenDeathActive ? newState.suddenDeathTimeExtensionMs / 1000 : 0);
  const timeRemaining = Math.max(0, totalDuration - elapsedSeconds);

  const isOvertime = timeRemaining <= 60;
  const wasOvertime = previousTimeRemaining <= 60;
  const multiplier = isOvertime ? 2 : 1;
  const deltaSeconds = deltaTime / 1000;
  const currentEnergyGain = BASE_ENERGY_GAIN_RATE * multiplier * deltaSeconds;

  if (!wasOvertime && isOvertime && newState.arenaState === 'normal') {
    newState.arenaState = 'overtime_glitch';
    newState.arenaStateSince = newState.time;
    // Futuras variaciones de arena (clima/bioma) deberían activar aquí nuevos estados visuales sin tocar la lógica de unidades.
  }

  newState.playerEnergy = Math.min(MAX_ENERGY, newState.playerEnergy + currentEnergyGain);
  newState.aiEnergy = Math.min(MAX_ENERGY, newState.aiEnergy + currentEnergyGain);

  if (newState.commanderAbilityCooldown > 0) {
    newState.commanderAbilityCooldown = Math.max(0, newState.commanderAbilityCooldown - deltaTime);
  }

  if (newState.aiCommanderAbilityCooldown > 0) {
    newState.aiCommanderAbilityCooldown = Math.max(0, newState.aiCommanderAbilityCooldown - deltaTime);
  }

  const timerJustExpired = previousTimeRemaining > 0 && timeRemaining <= 0;
  if (timerJustExpired && newState.status === 'PLAYING') {
    if (newState.suddenDeathActive) {
      const playerDamage = newState.damageTaken[Team.PLAYER] || 0;
      const aiDamage = newState.damageTaken[Team.AI] || 0;
      if (playerDamage < aiDamage) newState.status = 'VICTORY';
      else if (playerDamage > aiDamage) newState.status = 'DEFEAT';
      else newState.status = 'DRAW';
    } else {
      const playerDestroyedEnemyTowers = newState.towers.filter(t => t.team === Team.AI && t.isDead).length;
      const aiDestroyedEnemyTowers = newState.towers.filter(t => t.team === Team.PLAYER && t.isDead).length;
  
      if (playerDestroyedEnemyTowers > aiDestroyedEnemyTowers) {
        newState.status = 'VICTORY';
      } else if (playerDestroyedEnemyTowers < aiDestroyedEnemyTowers) {
        newState.status = 'DEFEAT';
      } else {
        newState.suddenDeathActive = true;
        newState.suddenDeathTimeExtensionMs = 60000;
        newState.arenaState = 'sudden_death';
        newState.arenaStateSince = newState.time;
      }
    }
  }

  updateTowerLocks(newState.towers);

  newState.effects = newState.effects.filter(ef => {
    ef.timer -= deltaTime;
    return ef.timer > 0;
  });

  if (newState.arenaState === 'overtime_glitch') {
    const glitchChance = Math.min(1, deltaTime / 180);
    if (Math.random() < glitchChance) {
      const duration = 120 + Math.random() * 220;
      addEffect(newState, {
        id: 'glitch-' + Math.random(),
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * ARENA_HEIGHT,
        type: 'glitch',
        timer: duration,
        maxTimer: duration,
        color: '#ff3b30',
        radius: 12 + Math.random() * 24,
        sourceFaction: Faction.ANDROID,
        sourceStyle: 'beam',
        attackKind: 'damage',
        variant: 'ionic'
      });
    }
    // Nuevos estados podrían generar sus propios efectos ambientales aquí sin alterar daño, colisiones ni energía.
  }

  newState.pendingSpells = newState.pendingSpells.filter(ps => {
    ps.timer -= deltaTime;
    if (ps.timer <= 0) {
      const card = CARD_LIBRARY.find(c => c.id === ps.cardId);
      if (card) {
        if (card.id === 'healing_matrix') {
          // Si es la matriz de sanación, se convierte en un ActiveSpell tras el retraso inicial
          newState.activeSpells.push({
            id: 'as-' + Math.random(),
            cardId: card.id,
            team: ps.team,
            x: ps.x, y: ps.y,
            duration: 5000,
            nextTick: 0
          });
          addEffect(newState, {
            id: 'hf-' + Math.random(),
            x: ps.x, y: ps.y,
            type: 'healing_field',
            timer: 5000,
            maxTimer: 5000,
            color: '#32cd32',
            radius: card.aoeRadius || 180,
            sourceFaction: card.faction,
            sourceStyle: card.projectileType,
            sourceAlienSubtype: card.alienSubtype,
            sourceVisualFamily: card.visualFamily,
            sourceCardId: card.id,
            attackKind: 'heal'
          });
        } else {
          // Hechizos de impacto único
          const isAllySpell = card.targetPref === TargetPreference.ALLIES;
          const targets = [...newState.units, ...newState.towers].filter(t => {
            if (t.isDead) return false;
            const sameTeam = t.team === ps.team;
            if (isAllySpell ? !sameTeam : sameTeam) return false;
            return Math.hypot(t.x - ps.x, t.y - ps.y) <= (card.aoeRadius || 100);
          });
          
          targets.forEach(t => {
            if ('stunTimer' in t) {
               if (card.stunDuration) (t as GameUnit).stunTimer = card.stunDuration;
               if (card.dotDuration) (t as GameUnit).dotTimer = card.dotDuration;
            }
            if (card.damage < 0) {
              const maxHp = (t as GameUnit).maxHp ?? (t as Tower).maxHp ?? t.hp;
              t.hp = Math.min(maxHp, t.hp + Math.abs(card.damage));
            } else {
              if ('stunTimer' in t) {
                const { totalDamage } = applyDamageToUnit(t as GameUnit, card.damage);
                registerDamage(newState, t.team, totalDamage);
                registerDamageDealt(newState, ps.team, totalDamage, false);
              } else {
                const prevHp = t.hp;
                t.hp -= card.damage;
                const dealtDamage = Math.min(card.damage, prevHp);
                registerDamage(newState, t.team, dealtDamage);
                registerDamageDealt(newState, ps.team, dealtDamage, isTowerTarget(t as GameUnit | Tower));
              }
            }
          });

          addEffect(newState, {
            id: Math.random().toString(),
            x: ps.x, y: ps.y,
            type: card.damage < 0 ? 'heal' : (ps.cardId === 'orbital_laser' ? 'emp_wave' : 'explosion'),
            timer: 800,
            maxTimer: 800,
            color: card.color,
            radius: card.aoeRadius,
            sourceFaction: card.faction,
            sourceStyle: card.projectileType,
            sourceAlienSubtype: card.alienSubtype,
            sourceVisualFamily: card.visualFamily,
            sourceCardId: card.id,
            attackKind: inferAttackKindFromCard(card)
          });
        }
      }
      return false;
    }
    return true;
  });

  // Procesar ActiveSpells (Ticking)
  newState.activeSpells = newState.activeSpells.filter(as => {
    as.duration -= deltaTime;
    as.nextTick -= deltaTime;

    if (as.nextTick <= 0) {
      const card = CARD_LIBRARY.find(c => c.id === as.cardId);
      if (card) {
        const allies = [...newState.units, ...newState.towers].filter(t => 
          !t.isDead && t.team === as.team && 
          Math.hypot(t.x - as.x, t.y - as.y) <= (card.aoeRadius || 180)
        );
        allies.forEach(a => {
          // daño negativo es curación
          if (card.damage > 0 && 'stunTimer' in a) {
            const { totalDamage } = applyDamageToUnit(a as GameUnit, card.damage / 5);
            registerDamage(newState, a.team, totalDamage);
            registerDamageDealt(newState, as.team, totalDamage, false);
          } else {
            const prevHp = a.hp;
            const nextHp = Math.max(0, Math.min(a.maxHp, a.hp - (card.damage / 5))); // Dividimos el daño total por los 5 ticks (1 por segundo aprox)
            a.hp = nextHp;
            const damageDelta = Math.max(0, prevHp - nextHp);
            registerDamage(newState, a.team, damageDelta);
            if (card.damage > 0) {
              registerDamageDealt(newState, as.team, damageDelta, isTowerTarget(a));
            }
          }
        });
      }
      as.nextTick = 1000; // Tick cada segundo
    }

    return as.duration > 0;
  });

  // Update Units
  const spawnedUnits: GameUnit[] = [];

  newState.units = newState.units.filter(u => !u.isDead).map(unit => {
    const updatedUnit = { ...unit };

    if (isOvertime && !updatedUnit.isOverclocked) {
      updatedUnit.isOverclocked = true;
      updatedUnit.hp += updatedUnit.maxHp * 0.2; 
      updatedUnit.maxHp *= 1.2;
    }

    if (updatedUnit.decayPerMs) {
      const { totalDamage } = applyDamageToUnit(updatedUnit, updatedUnit.decayPerMs * deltaTime);
      registerDamage(newState, updatedUnit.team, totalDamage);
    }

    if (updatedUnit.spawnIntervalMs && updatedUnit.spawnCardId) {
      const lane = updatedUnit.lane ?? (updatedUnit.y < ARENA_HEIGHT / 2 ? 'TOP' : 'BOTTOM');
      updatedUnit.spawnCountdownMs = (updatedUnit.spawnCountdownMs ?? updatedUnit.spawnIntervalMs) - deltaTime;

      while (updatedUnit.spawnCountdownMs !== undefined && updatedUnit.spawnCountdownMs <= 0) {
        for (let i = 0; i < (updatedUnit.spawnCount || 1); i++) {
          const offsetX = (Math.random() - 0.5) * 40;
          const offsetY = (Math.random() - 0.5) * 40;
          const spawns = createUnitsFromCard(updatedUnit.spawnCardId, updatedUnit.team, lane, updatedUnit.x + offsetX, updatedUnit.y + offsetY).map(spawned => ({
            ...spawned,
            abilityInstanceId: updatedUnit.abilityInstanceId ?? spawned.abilityInstanceId,
            spawnMode: updatedUnit.spawnMode ?? spawned.spawnMode,
            onHitEffect: updatedUnit.spawnOnHitEffect ?? spawned.onHitEffect,
            onHitDotDurationMs: updatedUnit.spawnOnHitDotDurationMs ?? spawned.onHitDotDurationMs,
            damage: (updatedUnit.spawnOnHitEffect ?? spawned.onHitEffect) === 'heal' ? Math.abs(spawned.damage) : spawned.damage
          }));
          spawnedUnits.push(...spawns);
        }

        updatedUnit.spawnCountdownMs += updatedUnit.spawnIntervalMs;
        addEffect(newState, {
          id: 'spawn-' + Math.random(),
          x: updatedUnit.x, y: updatedUnit.y,
          type: 'shockwave',
          timer: 400,
          maxTimer: 400,
          color: updatedUnit.color,
          radius: 120,
          sourceFaction: updatedUnit.faction,
          sourceStyle: updatedUnit.projectileType,
          sourceAlienSubtype: updatedUnit.alienSubtype,
          sourceVisualFamily: updatedUnit.visualFamily,
          sourceCardId: updatedUnit.cardId,
          attackKind: inferAttackKindFromUnit(updatedUnit)
        });
        playSfx('summon', {
          at: newState.time,
          faction: updatedUnit.faction,
          style: updatedUnit.projectileType,
          subfaction: resolveSubfaction(updatedUnit.faction, updatedUnit.visualFamily, updatedUnit.alienSubtype),
          attackKind: inferAttackKindFromUnit(updatedUnit),
          cardId: updatedUnit.cardId
        });
      }
    }

    if (updatedUnit.stunTimer > 0) {
      updatedUnit.stunTimer -= deltaTime;
      return updatedUnit;
    }
    if (updatedUnit.dotTimer > 0) {
      updatedUnit.dotTimer -= deltaTime;
      const { totalDamage } = applyDamageToUnit(updatedUnit, 0.12 * (deltaTime / 16));
      registerDamage(newState, updatedUnit.team, totalDamage);
    }

    if (updatedUnit.isMecha && updatedUnit.mechaMode === 'laser') {
      if ((updatedUnit.mechaLaserActiveMs ?? 0) > 0) {
        updatedUnit.mechaLaserActiveMs = Math.max(0, (updatedUnit.mechaLaserActiveMs ?? 0) - deltaTime);
        updatedUnit.mechaLaserTickMs = (updatedUnit.mechaLaserTickMs ?? 0) - deltaTime;

        if ((updatedUnit.mechaLaserTickMs ?? 0) <= 0) {
          const laserTarget = findEnemyTarget(updatedUnit, newState);
          if (laserTarget) {
            const laserTargetEntity = newState.units.find(u => u.id === laserTarget.id) || newState.towers.find(t => t.id === laserTarget.id);
            const dist = Math.hypot(laserTarget.x - updatedUnit.x, laserTarget.y - updatedUnit.y);

            if (laserTargetEntity && dist <= updatedUnit.range) {
              if ('stunTimer' in laserTargetEntity) {
                const { totalDamage } = applyDamageToUnit(laserTargetEntity as GameUnit, MECHA_NEXODO_BALANCE.laserTickDamage);
                registerDamage(newState, laserTargetEntity.team, totalDamage);
                registerDamageDealt(newState, updatedUnit.team, totalDamage, false);
              } else {
                const prevHp = laserTargetEntity.hp;
                laserTargetEntity.hp -= MECHA_NEXODO_BALANCE.laserTickDamage;
                const dealtDamage = Math.min(MECHA_NEXODO_BALANCE.laserTickDamage, prevHp);
                registerDamage(newState, laserTargetEntity.team, dealtDamage);
                registerDamageDealt(newState, updatedUnit.team, dealtDamage, true);
              }

              addEffect(newState, {
                id: 'mecha-laser-' + Math.random(),
                x: laserTarget.x,
                y: laserTarget.y,
                startX: updatedUnit.x,
                startY: updatedUnit.y,
                type: 'laser_beam',
                timer: 200,
                maxTimer: 200,
                color: MECHA_NEXODO_BALANCE.laserColor,
                sourceFaction: updatedUnit.faction,
                sourceStyle: 'beam',
                sourceAlienSubtype: updatedUnit.alienSubtype,
                sourceVisualFamily: updatedUnit.visualFamily,
                sourceCardId: updatedUnit.cardId,
                attackKind: 'laser'
              });
            }
          }

          updatedUnit.mechaLaserTickMs = 1000;
        }

        if ((updatedUnit.mechaLaserActiveMs ?? 0) === 0) {
          updatedUnit.mechaLaserCooldownMs = MECHA_NEXODO_BALANCE.laserCooldownMs;
        }
      } else {
        if ((updatedUnit.mechaLaserCooldownMs ?? 0) > 0) {
          updatedUnit.mechaLaserCooldownMs = Math.max(0, (updatedUnit.mechaLaserCooldownMs ?? 0) - deltaTime);
        }

        if ((updatedUnit.mechaLaserCooldownMs ?? 0) <= 0) {
          updatedUnit.mechaLaserActiveMs = MECHA_NEXODO_BALANCE.laserDurationMs;
          updatedUnit.mechaLaserTickMs = 0;
        }
      }
    }

    if (updatedUnit.isMothership && updatedUnit.payloadCardId) {
      const payloadCard = CARD_LIBRARY.find(c => c.id === updatedUnit.payloadCardId && c.type !== UnitType.SPELL);
      const payloadInterval = getMothershipPayloadIntervalMs(payloadCard?.cost);
      updatedUnit.payloadSpawnTimer = (updatedUnit.payloadSpawnTimer ?? payloadInterval) - deltaTime;

      while (updatedUnit.payloadSpawnTimer !== undefined && updatedUnit.payloadSpawnTimer <= 0 && payloadCard) {
        const payloadUnits = createUnitsFromCard(payloadCard.id, updatedUnit.team, updatedUnit.lane, updatedUnit.x + 18, updatedUnit.y);
        spawnedUnits.push(...payloadUnits);
        updatedUnit.payloadSpawnTimer += payloadInterval;
      }
    }
    
    const target = findBestTarget(updatedUnit, newState);
    
    if (target) {
      const dist = Math.hypot(target.x - updatedUnit.x, target.y - updatedUnit.y);
      
      if (dist <= updatedUnit.range) {
        if (newState.time - updatedUnit.lastAttack >= updatedUnit.attackSpeed) {
          applyDamage(updatedUnit, target, newState);
          updatedUnit.lastAttack = newState.time;
          
          addEffect(newState, {
            id: Math.random().toString(),
            x: updatedUnit.x, y: updatedUnit.y,
            type: 'muzzle', timer: 150, maxTimer: 150, color: updatedUnit.color,
            sourceFaction: updatedUnit.faction,
            sourceStyle: updatedUnit.projectileType,
            sourceAlienSubtype: updatedUnit.alienSubtype,
            sourceVisualFamily: updatedUnit.visualFamily,
            sourceCardId: updatedUnit.cardId,
            attackKind: inferAttackKindFromUnit(updatedUnit)
          });

          if (updatedUnit.projectileType !== 'none' && updatedUnit.projectileType !== 'beam') {
            spawnProjectile(updatedUnit, target, newState);
          }
        }
      } else {
        let moveX = target.x;
        let moveY = target.y;

        const isPlayer = updatedUnit.team === Team.PLAYER;
        const bridgeX = BRIDGE_X;
        const bridgeY = updatedUnit.lane === 'TOP' ? BRIDGE_TOP_Y : BRIDGE_BOTTOM_Y;
        const isAirUnit = updatedUnit.type === UnitType.AIR;

        const onOurSide = isPlayer ? updatedUnit.x < bridgeX - 50 : updatedUnit.x > bridgeX + 50;
        const targetOnTheirSide = isPlayer ? target.x > bridgeX : target.x < bridgeX;

        if (onOurSide && targetOnTheirSide && !isAirUnit) {
            moveX = bridgeX;
            moveY = bridgeY;
        }

        if (!isAirUnit) {
          const crossesWall = (updatedUnit.x - bridgeX) * (moveX - bridgeX) < 0;
          const aimingAtBarrier = Math.abs(moveX - bridgeX) < 0.0001 && !isWithinBridgeGap(moveY);

          if (crossesWall) {
            const t = (bridgeX - updatedUnit.x) / (moveX - updatedUnit.x);
            const crossingY = updatedUnit.y + (moveY - updatedUnit.y) * t;
            if (!isWithinBridgeGap(crossingY)) {
              moveX = bridgeX;
              moveY = nearestBridgeCenter(crossingY);
            }
          } else if (aimingAtBarrier) {
            moveY = nearestBridgeCenter(moveY);
          }
        }

        const angle = Math.atan2(moveY - updatedUnit.y, moveX - updatedUnit.x);
        let vx = Math.cos(angle) * updatedUnit.speed;
        let vy = Math.sin(angle) * updatedUnit.speed;

        newState.units.forEach(other => {
            if (other.id !== updatedUnit.id && !other.isDead && other.team === updatedUnit.team) {
                const d = Math.hypot(other.x - updatedUnit.x, other.y - updatedUnit.y);
                const minDistance = (updatedUnit.collisionRadius ?? 22) + (other.collisionRadius ?? 22);
                if (d < minDistance) {
                    const repulsion = 0.1 * (minDistance / 22);
                    vx -= (other.x - updatedUnit.x) * repulsion;
                    vy -= (other.y - updatedUnit.y) * repulsion;
                }
            }
        });

        const movementScale = deltaSeconds * 60;
        updatedUnit.x += vx * movementScale;
        updatedUnit.y += vy * movementScale;
      }
    }

    if (updatedUnit.hp <= 0) {
      updatedUnit.isDead = true;
      playSfx('death', {
        at: newState.time,
        faction: updatedUnit.faction,
        style: updatedUnit.projectileType,
        subfaction: resolveSubfaction(updatedUnit.faction, updatedUnit.visualFamily, updatedUnit.alienSubtype),
        attackKind: 'damage',
        cardId: updatedUnit.cardId
      });

      if (updatedUnit.splitOnDeath && updatedUnit.spawnChildId) {
        const childCard = CARD_LIBRARY.find(c => c.id === updatedUnit.spawnChildId && c.type !== UnitType.SPELL);
        if (childCard) {
          const splitUnits = createUnitsFromCard(childCard.id, updatedUnit.team, updatedUnit.lane, updatedUnit.x, updatedUnit.y);
          spawnedUnits.push(...splitUnits);
        }
      }

      addEffect(newState, {
        id: Math.random().toString(),
        x: updatedUnit.x, y: updatedUnit.y,
        type: 'explosion', timer: 500, maxTimer: 500, color: '#ff3300',
        sourceFaction: updatedUnit.faction,
        sourceStyle: updatedUnit.projectileType,
        sourceAlienSubtype: updatedUnit.alienSubtype,
        sourceVisualFamily: updatedUnit.visualFamily,
        sourceCardId: updatedUnit.cardId,
        attackKind: 'damage'
      });
    }
    return updatedUnit;
  });

  if (spawnedUnits.length > 0) {
    newState.units.push(...spawnedUnits);
  }

  // Update Towers
  newState.towers = newState.towers.map(tower => {
    if (tower.isDead) return tower;
    const updatedTower = { ...tower };

    if (updatedTower.shockwaveCooldown > 0) {
      updatedTower.shockwaveCooldown -= deltaTime;
    }

    if (updatedTower.shockwaveCooldown <= 0) {
      const closeEnemies = newState.units.filter(u => 
        u.team !== tower.team && 
        !u.isDead && 
        u.type === UnitType.GROUND &&
        Math.hypot(u.x - tower.x, u.y - tower.y) < 120
      );

      if (closeEnemies.length >= 2 || (closeEnemies.length >= 1 && tower.hp < tower.maxHp * 0.5)) {
        closeEnemies.forEach(e => {
          const angle = Math.atan2(e.y - tower.y, e.x - tower.x);
          e.x += Math.cos(angle) * 60;
          e.y += Math.sin(angle) * 60;
          e.stunTimer = 1000;
        });

        updatedTower.shockwaveCooldown = 15000;
        addEffect(newState, {
          id: 'sw-' + Math.random(),
          x: tower.x, y: tower.y,
          type: 'shockwave', timer: 600, maxTimer: 600, color: tower.team === Team.PLAYER ? '#00ccff' : '#ff3366',
          radius: 150,
          sourceFaction: tower.team === Team.PLAYER ? Faction.HUMAN : Faction.ANDROID,
          sourceStyle: 'plasma',
          sourceVisualFamily: tower.team === Team.PLAYER ? ('humano' as VisualFamily) : ('ciber' as VisualFamily),
          attackKind: 'damage'
        });
      }
    }

    if (newState.time - updatedTower.lastAttack >= updatedTower.attackSpeed) {
      const enemyUnits = newState.units.filter(u => u.team !== tower.team && !u.isDead);
      const target = enemyUnits.find(u => Math.hypot(u.x - tower.x, u.y - tower.y) <= tower.range);
      
      if (target) {
        spawnProjectile(updatedTower, target, newState, 'plasma');
        updatedTower.lastAttack = newState.time;
        addEffect(newState, {
          id: Math.random().toString(),
          x: tower.x, y: tower.y,
          type: 'muzzle', timer: 200, maxTimer: 200,
          color: tower.team === Team.PLAYER ? '#00ccff' : '#ff3366',
          sourceFaction: tower.team === Team.PLAYER ? Faction.HUMAN : Faction.ANDROID,
          sourceStyle: 'plasma',
          sourceVisualFamily: tower.team === Team.PLAYER ? ('humano' as VisualFamily) : ('ciber' as VisualFamily),
          attackKind: 'damage'
        });
      }
    }

    if (updatedTower.hp <= 0) {
      updatedTower.isDead = true;
      const towerFaction = updatedTower.team === Team.PLAYER ? Faction.HUMAN : Faction.ANDROID;
      const towerFamily = towerFaction === Faction.HUMAN ? ('humano' as VisualFamily) : ('ciber' as VisualFamily);
      playSfx('death', { at: newState.time, faction: towerFaction, style: 'plasma', subfaction: towerFamily, attackKind: 'damage' });
      addEffect(newState, {
        id: Math.random().toString(),
        x: updatedTower.x, y: updatedTower.y,
        type: 'explosion', timer: 1200, maxTimer: 1200, color: '#ffcc00',
        sourceFaction: towerFaction,
        sourceStyle: 'plasma',
        sourceVisualFamily: towerFamily,
        attackKind: 'damage'
      });
      const towerRuinDurationMs = (GAME_DURATION + 120) * 1000;
      addEffect(newState, {
        id: 'ruin-' + Math.random(),
        x: updatedTower.x, y: updatedTower.y,
        type: 'tower_ruin',
        timer: towerRuinDurationMs,
        maxTimer: towerRuinDurationMs,
        color: '#2f2624',
        radius: updatedTower.type === TowerType.KING ? 64 : 48,
        sourceFaction: towerFaction,
        sourceVisualFamily: towerFamily
      });
      if (newState.arenaState === 'sudden_death' && newState.status === 'PLAYING') {
        newState.status = tower.team === Team.PLAYER ? 'DEFEAT' : 'VICTORY';
      } else if (updatedTower.type === TowerType.KING) {
        newState.status = tower.team === Team.PLAYER ? 'DEFEAT' : 'VICTORY';
      }
    }
    return updatedTower;
  });

  newState.projectiles = newState.projectiles.filter(p => {
    const projectileCard = p.sourceCardId ? CARD_LIBRARY.find(c => c.id === p.sourceCardId) : undefined;
    const target = newState.units.find(u => u.id === p.targetId) || newState.towers.find(t => t.id === p.targetId);
    if (!target || target.hp <= 0) return false;

    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    const speedFactor = p.originUnitType === UnitType.AIR ? 1.05 : 1;
    const movementScale = deltaSeconds * 60;
    p.x += Math.cos(angle) * p.speed * speedFactor * movementScale;
    p.y += Math.sin(angle) * p.speed * speedFactor * movementScale;

    if (Math.hypot(target.x - p.x, target.y - p.y) < 12) {
      const isTargetUnit = 'stunTimer' in target;
      if (p.onHitEffect === 'heal') {
        if (isTargetUnit && target.team === p.team) {
          const healAmount = Math.abs(p.damage);
          target.hp = Math.min(target.maxHp, target.hp + healAmount);
          addEffect(newState, {
            id: Math.random().toString(),
            x: target.x, y: target.y,
            type: 'heal', timer: 200, maxTimer: 200, color: '#00ffaa',
            sourceFaction: p.faction,
            sourceStyle: p.style,
            sourceAlienSubtype: projectileCard?.alienSubtype,
            sourceVisualFamily: projectileCard?.visualFamily,
            sourceCardId: p.sourceCardId,
            attackKind: inferAttackKindFromProjectile(p)
          });
        }
      } else {
        if (p.onHitEffect === 'poison' && isTargetUnit && p.onHitDotDurationMs) {
          target.dotTimer = Math.max(target.dotTimer, p.onHitDotDurationMs);
        }
        if ('stunTimer' in target) {
          const { totalDamage } = applyDamageToUnit(target as GameUnit, p.damage);
          registerDamage(newState, target.team, totalDamage);
          registerDamageDealt(newState, p.team, totalDamage, false);
        } else {
          const prevHp = target.hp;
          target.hp -= p.damage;
          const dealtDamage = Math.min(p.damage, prevHp);
          registerDamage(newState, target.team, dealtDamage);
          registerDamageDealt(newState, p.team, dealtDamage, isTowerTarget(target));
        }
          addEffect(newState, {
            id: Math.random().toString(),
            x: target.x, y: target.y,
            type: 'spark', timer: 200, maxTimer: 200, color: p.color,
            sourceFaction: p.faction,
            sourceStyle: p.style,
            sourceAlienSubtype: projectileCard?.alienSubtype,
            sourceVisualFamily: projectileCard?.visualFamily,
            sourceCardId: p.sourceCardId,
            attackKind: inferAttackKindFromProjectile(p)
          });
        }

      if (p.onHitEffect === 'poison' && p.sourceUnitId) {
        const sourceUnit = newState.units.find(u => u.id === p.sourceUnitId);
        if (sourceUnit && sourceUnit.spawnMode === 'kamikaze') sourceUnit.isDead = true;
      }

      return false;
    }
    return true;
  });

  return newState;
};

const updateTowerLocks = (towers: Tower[]) => {
  const teams = [Team.PLAYER, Team.AI];
  teams.forEach(team => {
    const teamTowers = towers.filter(t => t.team === team);
    const topOuter = teamTowers.find(t => t.type === TowerType.OUTER && t.lane === 'TOP');
    const botOuter = teamTowers.find(t => t.type === TowerType.OUTER && t.lane === 'BOTTOM');
    const topInner = teamTowers.find(t => t.type === TowerType.INNER && t.lane === 'TOP');
    const botInner = teamTowers.find(t => t.type === TowerType.INNER && t.lane === 'BOTTOM');
    const king = teamTowers.find(t => t.type === TowerType.KING);

    if (topInner) topInner.locked = !!(topOuter && !topOuter.isDead);
    if (botInner) botInner.locked = !!(botOuter && !botOuter.isDead);
    if (king) {
      const innersDead = teamTowers.filter(t => t.type === TowerType.INNER && t.isDead).length;
      king.locked = innersDead < 1;
    }
  });
};

const findBestTarget = (unit: GameUnit, state: GameState): { x: number, y: number, id: string } | null => {
  const enemyTeam = unit.team === Team.PLAYER ? Team.AI : Team.PLAYER;

  if (unit.targetPref === TargetPreference.ALLIES) {
    const allies = state.units.filter(u => u.team === unit.team && !u.isDead && u.id !== unit.id && u.hp < u.maxHp);
    if (allies.length > 0) {
      const sorted = allies.sort((a, b) => Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y));
      return { x: sorted[0].x, y: sorted[0].y, id: sorted[0].id };
    }
    return { x: unit.team === Team.PLAYER ? ARENA_WIDTH : 0, y: unit.y, id: 'none' };
  }

  const potentialTargets: (GameUnit | Tower)[] = [];

  if (unit.targetPref !== TargetPreference.TOWERS) {
    state.units.forEach(u => {
      if (u.team === enemyTeam && !u.isDead) {
        if (unit.type === UnitType.GROUND && unit.projectileType === 'none' && u.type === UnitType.AIR) return;
        if (unit.targetPref === TargetPreference.AIR && u.type !== UnitType.AIR) return;
        potentialTargets.push(u);
      }
    });
  }

  state.towers.forEach(t => {
    if (t.team === enemyTeam && !t.isDead && !t.locked) {
      potentialTargets.push(t);
    }
  });

  if (potentialTargets.length > 0) {
    const sorted = potentialTargets.sort((a, b) => {
      const distA = Math.hypot(a.x - unit.x, a.y - unit.y);
      const distB = Math.hypot(b.x - unit.x, b.y - unit.y);
      return distA - distB;
    });
    
    const target = sorted[0];
    return { x: target.x, y: target.y, id: target.id };
  }

  return null;
};

const applyDamage = (attacker: GameUnit, target: any, state: GameState) => {
  const actualTarget = state.units.find(u => u.id === target.id) || state.towers.find(t => t.id === target.id);
  if (!actualTarget) return;
  if (actualTarget.type === UnitType.AIR && attacker.type === UnitType.GROUND && attacker.projectileType === 'none') return;

  const isTargetUnit = 'stunTimer' in actualTarget;
  const attackerAttackKind = inferAttackKindFromUnit(attacker);

  if (attacker.onHitEffect === 'heal') {
    if (isTargetUnit && actualTarget.team === attacker.team) {
      const healAmount = Math.abs(attacker.damage);
      actualTarget.hp = Math.min(actualTarget.maxHp, actualTarget.hp + healAmount);
      addEffect(state, { id: Math.random().toString(), x: actualTarget.x, y: actualTarget.y, type: 'heal', timer: 400, maxTimer: 400, color: '#00ffaa', sourceFaction: attacker.faction, sourceStyle: attacker.projectileType, sourceAlienSubtype: attacker.alienSubtype, sourceVisualFamily: attacker.visualFamily, sourceCardId: attacker.cardId, attackKind: attackerAttackKind });
    }
    return;
  }

  if (attacker.isAoE && attacker.aoeRadius) {
    const targets = [...state.units, ...state.towers].filter(t => {
        if (t.isDead || t.team === attacker.team) return false;
        if (t.type === UnitType.AIR && attacker.type === UnitType.GROUND && attacker.projectileType === 'none') return false;
        return Math.hypot(t.x - target.x, t.y - target.y) <= attacker.aoeRadius;
    });
    targets.forEach(t => {
      if ('stunTimer' in t) {
        const { totalDamage } = applyDamageToUnit(t as GameUnit, attacker.damage);
        if (attacker.damage > 0) {
          registerDamage(state, t.team, totalDamage);
          registerDamageDealt(state, attacker.team, totalDamage, false);
        }
      } else {
        const prevHp = t.hp;
        t.hp -= attacker.damage;
        if (attacker.damage > 0) {
          const dealtDamage = Math.min(attacker.damage, prevHp);
          registerDamage(state, t.team, dealtDamage);
          registerDamageDealt(state, attacker.team, dealtDamage, isTowerTarget(t));
        }
      }
    });
  } else if (attacker.projectileType === 'beam' || attacker.projectileType === 'none') {
    if (attacker.damage < 0) {
      actualTarget.hp = Math.min(actualTarget.maxHp, actualTarget.hp + Math.abs(attacker.damage));
      addEffect(state, { id: Math.random().toString(), x: actualTarget.x, y: actualTarget.y, type: 'heal', timer: 400, maxTimer: 400, color: '#00ffaa', sourceFaction: attacker.faction, sourceStyle: attacker.projectileType, sourceAlienSubtype: attacker.alienSubtype, sourceVisualFamily: attacker.visualFamily, sourceCardId: attacker.cardId, attackKind: 'heal' });
    } else {
      if ('stunTimer' in actualTarget) {
        const { totalDamage } = applyDamageToUnit(actualTarget as GameUnit, attacker.damage);
        registerDamage(state, actualTarget.team, totalDamage);
        registerDamageDealt(state, attacker.team, totalDamage, false);
      } else {
        const prevHp = actualTarget.hp;
        actualTarget.hp -= attacker.damage;
        const dealtDamage = Math.min(attacker.damage, prevHp);
        registerDamage(state, actualTarget.team, dealtDamage);
        registerDamageDealt(state, attacker.team, dealtDamage, isTowerTarget(actualTarget));
      }
    }
  }

  if (attacker.onHitEffect === 'poison' && isTargetUnit && attacker.onHitDotDurationMs) {
    actualTarget.dotTimer = Math.max(actualTarget.dotTimer, attacker.onHitDotDurationMs);
  }

  if (attacker.onHitEffect === 'poison' && attacker.spawnMode === 'kamikaze') {
    attacker.isDead = true;
  }
};

const spawnProjectile = (source: GameUnit | Tower, target: { x: number, y: number, id: string }, state: GameState, forcedStyle?: any) => {
  const isTower = 'cardId' in source === false;
  const baseStyle = forcedStyle || (isTower ? 'plasma' : (source as GameUnit).projectileType);
  const sourceUnit = !isTower ? (source as GameUnit) : undefined;
  const cardId = sourceUnit?.cardId;
  const faction = isTower ? (source.team === Team.PLAYER ? Faction.HUMAN : Faction.ANDROID) : sourceUnit?.faction;
  const color = isTower ? (source.team === Team.PLAYER ? '#00ccff' : '#ff3366') : sourceUnit?.color || '#ffffff';
  const originUnitType = sourceUnit?.type;
  const speed = baseStyle === 'missile' ? 4.4 : baseStyle === 'beam' ? 10 : 8.2;

  state.projectiles.push({
    id: Math.random().toString(),
    x: source.x,
    y: source.y,
    targetX: target.x,
    targetY: target.y,
    speed,
    damage: source.damage,
    team: source.team,
    targetId: target.id,
    style: baseStyle,
    color,
    sourceCardId: cardId,
    faction: faction!,
    originUnitType,
    onHitEffect: sourceUnit?.onHitEffect,
    onHitDotDurationMs: sourceUnit?.onHitDotDurationMs,
    sourceUnitId: sourceUnit?.id,
    sourceAbilityInstanceId: sourceUnit?.abilityInstanceId
  });
};
