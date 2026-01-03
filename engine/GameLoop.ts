
import { GameState, Team, GameUnit, Tower, TowerType, Projectile, UnitType, TargetPreference, VisualEffect, Card, ActiveSpell } from '../types';
import { ARENA_WIDTH, ARENA_HEIGHT, BASE_ENERGY_GAIN_RATE, MAX_ENERGY, GAME_DURATION, CARD_LIBRARY } from '../constants';

const BRIDGE_X = ARENA_WIDTH / 2;
const BRIDGE_TOP_Y = ARENA_HEIGHT / 2 - 190;
const BRIDGE_BOT_Y = ARENA_HEIGHT / 2 + 190;

export const updateGame = (state: GameState, deltaTime: number): GameState => {
  const newState = { ...state };
  
  newState.time += deltaTime;
  const elapsedSeconds = newState.time / 1000;
  const timeRemaining = Math.max(0, GAME_DURATION - elapsedSeconds);

  const isOvertime = timeRemaining <= 60;
  const multiplier = isOvertime ? 2 : 1;
  const currentEnergyRate = BASE_ENERGY_GAIN_RATE * multiplier;

  newState.playerEnergy = Math.min(MAX_ENERGY, newState.playerEnergy + currentEnergyRate);
  newState.aiEnergy = Math.min(MAX_ENERGY, newState.aiEnergy + currentEnergyRate);

  if (newState.commanderAbilityCooldown > 0) {
    newState.commanderAbilityCooldown = Math.max(0, newState.commanderAbilityCooldown - deltaTime);
  }

  if (newState.aiCommanderAbilityCooldown > 0) {
    newState.aiCommanderAbilityCooldown = Math.max(0, newState.aiCommanderAbilityCooldown - deltaTime);
  }

  if (timeRemaining <= 0 && newState.status === 'PLAYING') {
    const pKing = newState.towers.find(t => t.team === Team.PLAYER && t.type === TowerType.KING);
    const aKing = newState.towers.find(t => t.team === Team.AI && t.type === TowerType.KING);
    if (pKing && aKing) {
        if (pKing.hp > aKing.hp) newState.status = 'VICTORY';
        else if (pKing.hp < aKing.hp) newState.status = 'DEFEAT';
    }
  }

  updateTowerLocks(newState.towers);

  newState.effects = newState.effects.filter(ef => {
    ef.timer -= deltaTime;
    return ef.timer > 0;
  });

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
          newState.effects.push({
            id: 'hf-' + Math.random(),
            x: ps.x, y: ps.y,
            type: 'healing_field',
            timer: 5000,
            maxTimer: 5000,
            color: '#32cd32',
            radius: card.aoeRadius || 180
          });
        } else {
          // Hechizos de impacto único
          const targets = [...newState.units, ...newState.towers].filter(t => 
            !t.isDead && t.team !== ps.team && 
            Math.hypot(t.x - ps.x, t.y - ps.y) <= (card.aoeRadius || 100)
          );
          
          targets.forEach(t => {
            if ('stunTimer' in t) {
               if (card.stunDuration) (t as GameUnit).stunTimer = card.stunDuration;
               if (card.dotDuration) (t as GameUnit).dotTimer = card.dotDuration;
            }
            t.hp -= card.damage;
          });

          newState.effects.push({
            id: Math.random().toString(),
            x: ps.x, y: ps.y,
            type: ps.cardId === 'orbital_laser' ? 'emp_wave' : 'explosion',
            timer: 800,
            maxTimer: 800,
            color: card.color,
            radius: card.aoeRadius
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
          a.hp = Math.min(a.maxHp, a.hp - (card.damage / 5)); // Dividimos el daño total por los 5 ticks (1 por segundo aprox)
        });
      }
      as.nextTick = 1000; // Tick cada segundo
    }

    return as.duration > 0;
  });

  // Update Units
  newState.units = newState.units.filter(u => !u.isDead).map(unit => {
    const updatedUnit = { ...unit };

    if (isOvertime && !updatedUnit.isOverclocked) {
      updatedUnit.isOverclocked = true;
      updatedUnit.hp += updatedUnit.maxHp * 0.2; 
      updatedUnit.maxHp *= 1.2;
    }

    if (updatedUnit.stunTimer > 0) {
      updatedUnit.stunTimer -= deltaTime;
      return updatedUnit;
    }
    if (updatedUnit.dotTimer > 0) {
      updatedUnit.dotTimer -= deltaTime;
      updatedUnit.hp -= 0.12 * (deltaTime / 16); 
    }
    
    const target = findBestTarget(updatedUnit, newState);
    
    if (target) {
      const dist = Math.hypot(target.x - updatedUnit.x, target.y - updatedUnit.y);
      
      if (dist <= updatedUnit.range) {
        if (newState.time - updatedUnit.lastAttack >= updatedUnit.attackSpeed) {
          applyDamage(updatedUnit, target, newState);
          updatedUnit.lastAttack = newState.time;
          
          newState.effects.push({
            id: Math.random().toString(),
            x: updatedUnit.x, y: updatedUnit.y,
            type: 'muzzle', timer: 150, maxTimer: 150, color: updatedUnit.color
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
        const bridgeY = updatedUnit.lane === 'TOP' ? BRIDGE_TOP_Y : BRIDGE_BOT_Y;

        const onOurSide = isPlayer ? updatedUnit.x < bridgeX - 50 : updatedUnit.x > bridgeX + 50;
        const targetOnTheirSide = isPlayer ? target.x > bridgeX : target.x < bridgeX;

        if (onOurSide && targetOnTheirSide && updatedUnit.type !== UnitType.AIR) {
            moveX = bridgeX;
            moveY = bridgeY;
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

        updatedUnit.x += vx;
        updatedUnit.y += vy;
      }
    }

    if (updatedUnit.hp <= 0) {
      updatedUnit.isDead = true;
      newState.effects.push({
        id: Math.random().toString(),
        x: updatedUnit.x, y: updatedUnit.y,
        type: 'explosion', timer: 500, maxTimer: 500, color: '#ff3300'
      });
    }
    return updatedUnit;
  });

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
        newState.effects.push({
          id: 'sw-' + Math.random(),
          x: tower.x, y: tower.y,
          type: 'shockwave', timer: 600, maxTimer: 600, color: tower.team === Team.PLAYER ? '#00ccff' : '#ff3366',
          radius: 150
        });
      }
    }

    if (newState.time - updatedTower.lastAttack >= updatedTower.attackSpeed) {
      const enemyUnits = newState.units.filter(u => u.team !== tower.team && !u.isDead);
      const target = enemyUnits.find(u => Math.hypot(u.x - tower.x, u.y - tower.y) <= tower.range);
      
      if (target) {
        spawnProjectile(updatedTower, target, newState, 'plasma');
        updatedTower.lastAttack = newState.time;
        newState.effects.push({ id: Math.random().toString(), x: tower.x, y: tower.y, type: 'muzzle', timer: 200, maxTimer: 200, color: tower.team === Team.PLAYER ? '#00ccff' : '#ff3366' });
      }
    }

    if (updatedTower.hp <= 0) {
      updatedTower.isDead = true;
      newState.effects.push({ id: Math.random().toString(), x: updatedTower.x, y: updatedTower.y, type: 'explosion', timer: 1200, maxTimer: 1200, color: '#ffcc00' });
      if (updatedTower.type === TowerType.KING) {
        newState.status = tower.team === Team.PLAYER ? 'DEFEAT' : 'VICTORY';
      }
    }
    return updatedTower;
  });

  newState.projectiles = newState.projectiles.filter(p => {
    const target = newState.units.find(u => u.id === p.targetId) || newState.towers.find(t => t.id === p.targetId);
    if (!target || target.hp <= 0) return false;

    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    p.x += Math.cos(angle) * p.speed;
    p.y += Math.sin(angle) * p.speed;

    if (Math.hypot(target.x - p.x, target.y - p.y) < 12) {
      target.hp -= p.damage;
      newState.effects.push({ id: Math.random().toString(), x: target.x, y: target.y, type: 'spark', timer: 200, maxTimer: 200, color: p.color });
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
  if (actualTarget) {
     if (actualTarget.type === UnitType.AIR && attacker.type === UnitType.GROUND && attacker.projectileType === 'none') return; 

     if (attacker.isAoE && attacker.aoeRadius) {
        const targets = [...state.units, ...state.towers].filter(t => {
            if (t.isDead || t.team === attacker.team) return false;
            if (t.type === UnitType.AIR && attacker.type === UnitType.GROUND && attacker.projectileType === 'none') return false;
            return Math.hypot(t.x - target.x, t.y - target.y) <= attacker.aoeRadius;
        });
        targets.forEach(t => t.hp -= attacker.damage);
     } else {
        if (attacker.damage < 0) {
            actualTarget.hp = Math.min(actualTarget.maxHp, actualTarget.hp + Math.abs(attacker.damage));
            state.effects.push({ id: Math.random().toString(), x: actualTarget.x, y: actualTarget.y, type: 'heal', timer: 400, maxTimer: 400, color: '#00ffaa' });
        } else if (attacker.projectileType === 'beam' || attacker.projectileType === 'none') {
            actualTarget.hp -= attacker.damage;
        }
     }
  }
};

const spawnProjectile = (source: GameUnit | Tower, target: { x: number, y: number, id: string }, state: GameState, forcedStyle?: any) => {
  const isTower = 'type' in source;
  const style = forcedStyle || (isTower ? 'plasma' : (source as GameUnit).projectileType);
  const color = isTower ? (source.team === Team.PLAYER ? '#00ccff' : '#ff3366') : (source as GameUnit).color;
  
  state.projectiles.push({
    id: Math.random().toString(),
    x: source.x,
    y: source.y,
    targetX: target.x,
    targetY: target.y,
    speed: style === 'missile' ? 4 : 8,
    damage: source.damage,
    team: source.team,
    targetId: target.id,
    style: style,
    color: color
  });
};
