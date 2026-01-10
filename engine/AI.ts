
import { GameState, Team, Card, UnitType, TargetPreference, SelectedSpecialAbility, TowerType } from '../types';
import { CARD_LIBRARY, ARENA_WIDTH, MAX_ENERGY, ARENA_HEIGHT, findAbilityById, GAME_DURATION, isMeleeSingleUnitCard } from '../constants';

interface PlayerPattern {
  topLaneDeployCount: number;
  bottomLaneDeployCount: number;
  airUnitCount: number;
  swarmUnitCount: number;
  tankUnitCount: number;
  aggressionX: number; // Average X position of player units
}

export class NexoAI {
  private lastDecisionTime: number = 0;
  private playerPattern: PlayerPattern = this.getInitialPattern();
  private observedUnitIds: Set<string> = new Set();

  private getInitialPattern(): PlayerPattern {
    return {
      topLaneDeployCount: 0,
      bottomLaneDeployCount: 0,
      airUnitCount: 0,
      swarmUnitCount: 0,
      tankUnitCount: 0,
      aggressionX: 0
    };
  }

  public reset() {
    this.playerPattern = this.getInitialPattern();
    this.observedUnitIds.clear();
    this.lastDecisionTime = 0;
  }

  /**
   * Actualiza el modelo de aprendizaje observando las unidades del jugador en tiempo real.
   */
  private updateLearning(state: GameState) {
    const playerUnits = state.units.filter(u => u.team === Team.PLAYER && !u.isDead);
    
    playerUnits.forEach(u => {
      if (!this.observedUnitIds.has(u.id)) {
        this.observedUnitIds.add(u.id);
        
        // Seguimiento de carriles
        if (u.lane === 'TOP') this.playerPattern.topLaneDeployCount++;
        else this.playerPattern.bottomLaneDeployCount++;

        // Seguimiento de tipos
        const card = CARD_LIBRARY.find(c => c.id === u.cardId);
        if (card) {
          if (card.type === UnitType.AIR) this.playerPattern.airUnitCount++;
          if (card.count > 3) this.playerPattern.swarmUnitCount++;
          if (card.hp > 1200) this.playerPattern.tankUnitCount++;
        }
      }
    });

    // Calcular agresividad promedio
    if (playerUnits.length > 0) {
      const avgX = playerUnits.reduce((acc, u) => acc + u.x, 0) / playerUnits.length;
      this.playerPattern.aggressionX = (this.playerPattern.aggressionX * 0.95) + (avgX * 0.05);
    }
  }

  private tryUseAbility(state: GameState, onAbility?: (ability: SelectedSpecialAbility) => void): boolean {
    if (!onAbility || !state.aiSpecialAbility) return false;
    if (state.aiCommanderAbilityCooldown > 0) return false;

    const ability = findAbilityById(state.aiSpecialAbility.id);
    if (!ability) return false;
    if (state.aiEnergy < ability.cost) return false;
    const aiHasMothership = state.units.some(u => u.team === Team.AI && u.isMothership && !u.isDead);
    const aiHasAracnoHive = state.units.some(u => u.cardId === 'aracno_hive' && u.team === Team.AI && !u.isDead);

    const playerUnits = state.units.filter(u => u.team === Team.PLAYER && !u.isDead);
    const aiUnits = state.units.filter(u => u.team === Team.AI && !u.isDead);

    if (ability.id === 'emp_overwatch') {
      const playerOnAISide = playerUnits.filter(u => u.x > ARENA_WIDTH / 2);
      const clusteredPush = playerOnAISide.filter(u => Math.abs(u.y - ARENA_HEIGHT / 2) < 220);
      const heavyThreat = playerOnAISide.some(u => {
        const card = CARD_LIBRARY.find(c => c.id === u.cardId);
        return card && (card.hp > 1200 || card.count > 3);
      });

      if (playerOnAISide.length >= 3 || clusteredPush.length >= 2 || heavyThreat) {
        onAbility(state.aiSpecialAbility);
        return true;
      }
    }

    if (ability.id === 'mothership_command') {
      if (aiHasMothership) return false;
      const hangarCardId = state.aiSpecialAbility.configuration.hangarUnit as string | undefined;
      const hangarCard = CARD_LIBRARY.find(c => c.id === hangarCardId && c.type !== UnitType.SPELL);
      if (!hangarCard) return false;

      const aiFrontline = aiUnits.filter(u => u.x > ARENA_WIDTH * 0.55);
      const playerFrontline = playerUnits.filter(u => u.x > ARENA_WIDTH * 0.55);
      const aiIsBehind = aiFrontline.length < playerFrontline.length;
      const hasEnergyToCommit = state.aiEnergy >= ability.cost + Math.max(0, hangarCard.cost - 2);

      if (hasEnergyToCommit && (aiUnits.length < playerUnits.length || aiIsBehind || state.aiEnergy > MAX_ENERGY * 0.8)) {
        onAbility(state.aiSpecialAbility);
        return true;
      }
    }

    if (ability.id === 'mecha_nexodo') {
      const aiHasMecha = state.units.some(u => u.team === Team.AI && u.isMecha && !u.isDead);
      if (aiHasMecha) return false;

      const pilotCandidates = state.aiDeck
        .map(cardId => CARD_LIBRARY.find(c => c.id === cardId))
        .filter((card): card is Card => Boolean(card) && isMeleeSingleUnitCard(card));
      if (pilotCandidates.length === 0) return false;

      const pilotCard = pilotCandidates.sort((a, b) => (b.hp + b.damage) - (a.hp + a.damage))[0];
      const hasEnergyToCommit = state.aiEnergy >= ability.cost + Math.max(0, pilotCard.cost - 2);
      if (!hasEnergyToCommit) return false;

      const aiKing = state.towers.find(t => t.team === Team.AI && t.type === TowerType.KING);
      const enemyPressureNearKing = aiKing
        ? playerUnits.some(u => Math.hypot(u.x - aiKing.x, u.y - aiKing.y) < 260)
        : false;
      const highHpTarget = playerUnits.some(u => u.maxHp > 1500 || u.hp > 1500);
      const chosenMode = enemyPressureNearKing ? 'shield' : (highHpTarget ? 'laser' : 'shield');

      if (enemyPressureNearKing || highHpTarget || state.aiEnergy > MAX_ENERGY * 0.85) {
        onAbility({
          ...state.aiSpecialAbility,
          configuration: {
            ...state.aiSpecialAbility.configuration,
            mode: chosenMode,
            pilotCard: pilotCard.id
          }
        });
        return true;
      }
    }

    if (ability.id === 'aracno_hive') {
      if (aiHasAracnoHive) return false;
      const aiKing = state.towers.find(t => t.team === Team.AI && t.type === TowerType.KING);
      const enemyPressureNearKing = aiKing
        ? playerUnits.some(u => Math.hypot(u.x - aiKing.x, u.y - aiKing.y) < 260)
        : false;
      const canCounterPush = state.aiEnergy >= ability.cost + 3 && aiUnits.some(u => u.x > ARENA_WIDTH * 0.55);
      const hasEnergyOverflow = state.aiEnergy > MAX_ENERGY * 0.75 && playerUnits.length <= aiUnits.length;

      if (enemyPressureNearKing || canCounterPush || hasEnergyOverflow) {
        onAbility(state.aiSpecialAbility);
        return true;
      }
    }

    return false;
  }

  /**
   * Evalúa la mejor carta para jugar basándose en la mano actual, amenazas y aprendizaje.
   */
  private evaluateBestCard(state: GameState): { id: string, score: number } | null {
    const hand = state.aiHand;
    const playerUnits = state.units.filter(u => u.team === Team.PLAYER && !u.isDead);
    
    const scoredHand = hand.map(cardId => {
      const card = CARD_LIBRARY.find(c => c.id === cardId);
      if (!card || state.aiEnergy < card.cost) return { id: cardId, score: -1 };

      let score = 10; // Puntuación base

      // 1. REACCIONES ESPECÍFICAS (CONTRAPARTIDAS)
      if (playerUnits.length > 0) {
        // Contra-aire
        const airThreats = playerUnits.filter(u => u.type === UnitType.AIR).length;
        if (airThreats > 0) {
          if (card.targetPref === TargetPreference.AIR) score += 60;
          if (card.projectileType !== 'none') score += 20;
        }

        // Contra-enjambre
        const swarmThreats = playerUnits.filter(u => {
          const c = CARD_LIBRARY.find(lib => lib.id === u.cardId);
          return c && c.count > 3;
        }).length;
        if (swarmThreats > 0 && card.isAoE) score += 50;

        // Contra-tanques
        const tankThreats = playerUnits.filter(u => u.hp > 1500).length;
        if (tankThreats > 0 && card.damage > 200) score += 40;
      }

      // 2. APRENDIZAJE (SESGO POR PATRÓN DEL JUGADOR)
      if (this.playerPattern.airUnitCount > 3 && card.projectileType !== 'none') score += 15;
      if (this.playerPattern.swarmUnitCount > 2 && card.isAoE) score += 15;

      // 3. ESTRATEGIA SEGÚN ENERGÍA
      if (state.aiEnergy > 8) {
        if (card.hp > 1500) score += 30; // Priorizar tanques para iniciar push si hay exceso
        if (card.targetPref === TargetPreference.TOWERS) score += 20;
      }

      // 4. APOYO
      if (card.targetPref === TargetPreference.ALLIES) {
        const damagedAllies = state.units.filter(u => u.team === Team.AI && u.hp < u.maxHp * 0.7).length;
        score += damagedAllies * 25;
      }

      return { id: cardId, score };
    });

    const best = scoredHand.sort((a, b) => b.score - a.score)[0];
    return (best && best.score > 0) ? best : null;
  }

  public update(state: GameState, onDeploy: (cardId: string, x: number, y: number) => void, onAbility?: (ability: SelectedSpecialAbility) => void) {
    const now = state.time;
    
    // Configuración por dificultad
    const baseDifficultyAdjust = [3500, 2000, 900][state.difficulty];
    const baseEnergyReserve = [3, 1, 0][state.difficulty]; // Cuánta energía guarda la IA "por si acaso"
    const mistakeChance = [0.4, 0.15, 0.02][state.difficulty]; // Probabilidad de no tomar la decisión óptima

    const elapsedSeconds = now / 1000;
    const timeRemaining = Math.max(0, GAME_DURATION - elapsedSeconds);
    const isOvertime = timeRemaining <= 60;

    const aiKing = state.towers.find(t => t.team === Team.AI && t.type === TowerType.KING);
    const playerKing = state.towers.find(t => t.team === Team.PLAYER && t.type === TowerType.KING);
    const isAiBehindOnKing = aiKing && playerKing ? aiKing.hp < playerKing.hp : false;

    const difficultyAdjust = isOvertime || isAiBehindOnKing ? Math.max(600, baseDifficultyAdjust * 0.6) : baseDifficultyAdjust;
    const energyReserve = isOvertime || isAiBehindOnKing ? Math.max(0, baseEnergyReserve - 1) : baseEnergyReserve;

    if (now - this.lastDecisionTime < difficultyAdjust) return;

    this.updateLearning(state);

    if (this.tryUseAbility(state, onAbility)) {
      this.lastDecisionTime = now;
      return;
    }

    // Simular error de IA o tiempo de reflexión
    if (Math.random() < mistakeChance) {
      this.lastDecisionTime = now;
      return;
    }

    const bestCardChoice = this.evaluateBestCard(state);
    if (!bestCardChoice) return;

    const card = CARD_LIBRARY.find(c => c.id === bestCardChoice.id);
    if (!card) return;

    // Verificar si puede costearlo respetando su reserva de dificultad
    if (state.aiEnergy < card.cost + energyReserve) return;

    // --- LÓGICA DE POSICIONAMIENTO ---
    const playerUnits = state.units.filter(u => u.team === Team.PLAYER && !u.isDead);
    const aiTowers = state.towers.filter(t => t.team === Team.AI);
    
    let deployX = ARENA_WIDTH - 200;
    let deployY = ARENA_HEIGHT / 2;

    // Determinar carril según amenazas o aprendizaje, incluyendo estado de torres
    const topThreat = playerUnits.filter(u => u.lane === 'TOP').length;
    const botThreat = playerUnits.filter(u => u.lane === 'BOTTOM').length;

    const computeTowerThreat = (lane: 'TOP' | 'BOTTOM') => {
      const laneTowers = aiTowers.filter(t => t.lane === lane && (t.type === TowerType.OUTER || t.type === TowerType.INNER));
      return laneTowers.reduce((score, tower) => {
        const nearbyEnemies = playerUnits.filter(u => u.lane === lane && Math.hypot(u.x - tower.x, u.y - tower.y) < 320);
        const nearbyCount = nearbyEnemies.length;
        if (tower.isDead) return score + 40 + nearbyCount * 10;
        if (tower.hp < tower.maxHp * 0.5) return score + 30 + nearbyCount * 8;
        if (tower.hp < tower.maxHp * 0.85 && nearbyCount > 0) return score + 15 + nearbyCount * 5;
        return score + Math.min(nearbyCount * 4, 12);
      }, 0);
    };

    const topLaneScore = topThreat * 10 + computeTowerThreat('TOP');
    const bottomLaneScore = botThreat * 10 + computeTowerThreat('BOTTOM');
    
    if (topLaneScore > bottomLaneScore || (topLaneScore === bottomLaneScore && this.playerPattern.topLaneDeployCount > this.playerPattern.bottomLaneDeployCount)) {
      deployY = ARENA_HEIGHT / 2 - 180 + (Math.random() * 60 - 30);
    } else {
      deployY = ARENA_HEIGHT / 2 + 180 + (Math.random() * 60 - 30);
    }

    // Hechizos: Siempre sobre el enemigo
    if (card.type === UnitType.SPELL && playerUnits.length > 0) {
      const aoeRadius = card.aoeRadius || 150;

      let bestClusterCenter: { x: number; y: number } | null = null;
      let bestClusterScore = 0;
      let bestClusterCount = 0;

      playerUnits.forEach(candidate => {
        const cluster = playerUnits.filter(u => Math.hypot(u.x - candidate.x, u.y - candidate.y) <= aoeRadius * 1.05);
        const totalHp = cluster.reduce((acc, u) => acc + u.hp, 0);
        const score = totalHp + cluster.length * 50;

        if (score > bestClusterScore || (score === bestClusterScore && cluster.length > bestClusterCount)) {
          bestClusterScore = score;
          bestClusterCount = cluster.length;
          const centerX = cluster.reduce((acc, u) => acc + u.x, 0) / cluster.length;
          const centerY = cluster.reduce((acc, u) => acc + u.y, 0) / cluster.length;
          bestClusterCenter = { x: centerX, y: centerY };
        }
      });

      if (bestClusterCenter && bestClusterCount > 1) {
        deployX = bestClusterCenter.x;
        deployY = bestClusterCenter.y;
      } else {
        const target = playerUnits.sort((a, b) => b.x - a.x)[0]; // Fallback: el más avanzado
        deployX = target.x;
        deployY = target.y;
      }
    } 
    // Defensa: Cerca de las torres si hay amenazas
    else if (playerUnits.some(u => u.x > ARENA_WIDTH / 2 + 100)) {
      const closestThreat = playerUnits.sort((a, b) => b.x - a.x)[0];
      deployX = Math.min(ARENA_WIDTH - 150, closestThreat.x + 150);
    }
    // Ataque: Al fondo para acumular tropas (push)
    else {
      deployX = ARENA_WIDTH - 100 - (Math.random() * 100);
    }

    // Validar límites de despliegue IA
    if (card.type !== UnitType.SPELL) {
      deployX = Math.max(ARENA_WIDTH / 2 + 50, deployX);
      deployX = Math.min(ARENA_WIDTH - 50, deployX);
    }

    onDeploy(card.id, deployX, deployY);
    this.lastDecisionTime = now;
  }
}
