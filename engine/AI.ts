
import { GameState, Team, Card, UnitType, TargetPreference, SelectedSpecialAbility } from '../types';
import { CARD_LIBRARY, ARENA_WIDTH, MAX_ENERGY, ARENA_HEIGHT, findAbilityById } from '../constants';

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
    const difficultyAdjust = [3500, 2000, 900][state.difficulty];
    const energyReserve = [3, 1, 0][state.difficulty]; // Cuánta energía guarda la IA "por si acaso"
    const mistakeChance = [0.4, 0.15, 0.02][state.difficulty]; // Probabilidad de no tomar la decisión óptima

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
    const aiTowers = state.towers.filter(t => t.team === Team.AI && !t.isDead);
    
    let deployX = ARENA_WIDTH - 200;
    let deployY = ARENA_HEIGHT / 2;

    // Determinar carril según amenazas o aprendizaje
    const topThreat = playerUnits.filter(u => u.lane === 'TOP').length;
    const botThreat = playerUnits.filter(u => u.lane === 'BOTTOM').length;
    
    if (topThreat > botThreat || (topThreat === botThreat && this.playerPattern.topLaneDeployCount > this.playerPattern.bottomLaneDeployCount)) {
      deployY = ARENA_HEIGHT / 2 - 180 + (Math.random() * 60 - 30);
    } else {
      deployY = ARENA_HEIGHT / 2 + 180 + (Math.random() * 60 - 30);
    }

    // Hechizos: Siempre sobre el enemigo
    if (card.type === UnitType.SPELL && playerUnits.length > 0) {
      const target = playerUnits.sort((a, b) => b.x - a.x)[0]; // El más avanzado
      deployX = target.x;
      deployY = target.y;
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
