
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Team, Card, GameUnit, Tower, TowerType, UnitType, TargetPreference, VisualEffect, SelectedSpecialAbility, ArenaState } from './types';
import { CARD_LIBRARY, INITIAL_TOWERS_PLAYER, INITIAL_TOWERS_AI, MAX_ENERGY, ARENA_HEIGHT, ARENA_WIDTH, GAME_DURATION, SPECIAL_ABILITIES, createDefaultAbilityConfig, findAbilityById, EMP_ABILITY_BALANCE } from './constants';
import { updateGame } from './engine/GameLoop';
import { NexoAI } from './engine/AI';
import { applyEmpAbility, getEmpModeConfig } from './engine/abilities/emp';
import { applyMothershipAbility, getMothershipCooldownMs, getMothershipPayloadIntervalMs } from './engine/abilities/mothership';
import Arena from './components/Arena';
import Codex from './components/Codex';
import DeckEditor from './components/DeckEditor';
import SpecialAbilityModal from './components/SpecialAbilityModal';

const rollRandomAbilitySelection = (): SelectedSpecialAbility => {
  const ability = SPECIAL_ABILITIES[Math.floor(Math.random() * SPECIAL_ABILITIES.length)];
  const configuration = createDefaultAbilityConfig(ability);

  ability.options.forEach(option => {
    if (option.type === 'select' && option.choices?.length) {
      const choice = option.choices[Math.floor(Math.random() * option.choices.length)];
      configuration[option.key] = choice.value;
    }

    if (option.type === 'slider' && option.min !== undefined && option.max !== undefined) {
      const step = option.step || 1;
      const steps = Math.floor((option.max - option.min) / step);
      const offset = Math.floor(Math.random() * (steps + 1));
      configuration[option.key] = option.min + offset * step;
    }

    if (option.type === 'toggle') {
      configuration[option.key] = Math.random() > 0.5;
    }
  });

  return { id: ability.id, configuration };
};

const aiController = new NexoAI();

const App: React.FC = () => {
  const [specialAbility, setSpecialAbility] = useState<SelectedSpecialAbility>(() => {
    const defaultAbility = SPECIAL_ABILITIES[0];
    return {
      id: defaultAbility.id,
      configuration: createDefaultAbilityConfig(defaultAbility)
    };
  });
  const [isAbilityModalOpen, setIsAbilityModalOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialSelection = ['infantry', 'marines', 'fighter', 'nova_squad', 'iron_star_tank', 'tank', 'orbital_laser', 'healing_matrix'];
    return {
      playerEnergy: 5,
      aiEnergy: 5,
      playerHand: [],
      playerDeck: [],
      playerSelection: initialSelection,
      aiHand: [],
      aiDeck: [],
      units: [],
      towers: [],
      projectiles: [],
      effects: [],
      pendingSpells: [],
      activeSpells: [],
      time: 0,
      status: 'START',
      previousStatus: 'START',
      difficulty: 1,
      commanderAbilityCooldown: 0,
      aiCommanderAbilityCooldown: 0,
      aiSpecialAbility: rollRandomAbilitySelection(),
      arenaState: 'normal',
      arenaStateSince: 0
    };
  });

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    idx: number;
    card: Card;
    position: { x: number; y: number } | null;
    overArena: boolean;
  } | null>(null);
  const [arenaBounds, setArenaBounds] = useState<DOMRect | null>(null);
  const gameLoopRef = useRef<number>(undefined);

  const triggerCommanderAbility = () => {
    const activeAbility = findAbilityById(specialAbility.id) || SPECIAL_ABILITIES[0];
    const abilityCost = activeAbility.cost;
    if (gameState.commanderAbilityCooldown > 0 || gameState.status !== 'PLAYING') return;
    const selectedHangarCard = specialAbility.configuration.hangarUnit as string | undefined;

    setGameState(prev => {
      if (prev.playerEnergy < abilityCost || prev.commanderAbilityCooldown > 0 || prev.status !== 'PLAYING') return prev;

      if (activeAbility.id === 'emp_overwatch') {
        const selectedMode = (specialAbility.configuration.mode as string) || EMP_ABILITY_BALANCE.defaultMode;
        return applyEmpAbility(prev, Team.PLAYER, selectedMode);
      }

      if (activeAbility.id === 'mothership_command') {
        const hasActiveMothership = prev.units.some(u => u.team === Team.PLAYER && u.isMothership && !u.isDead);
        if (hasActiveMothership) return prev;
        return applyMothershipAbility(prev, Team.PLAYER, selectedHangarCard);
      }

      return prev;
    });
  };

  const spawnUnits = useCallback((cardId: string, team: Team, x: number, y: number) => {
    const card = CARD_LIBRARY.find(c => c.id === cardId);
    if (!card) return;

    if (card.type === UnitType.SPELL) {
      setGameState(prev => {
        const newState = { ...prev };
        const king = newState.towers.find(t => t.team === team && t.type === TowerType.KING);

        newState.pendingSpells.push({
          id: 'ps-' + Math.random(),
          cardId: card.id,
          team,
          x, y,
          timer: 1000 
        });

        newState.effects.push({
          id: 'beam-' + Math.random(),
          x, y,
          startX: king ? king.x : (team === Team.PLAYER ? 100 : ARENA_WIDTH - 100),
          startY: king ? king.y : ARENA_HEIGHT / 2,
          type: card.projectileType === 'beam' ? 'laser_beam' : (card.damage < 0 ? 'heal' : 'emp_wave'),
          timer: 1000,
          maxTimer: 1000,
          color: card.color,
          radius: card.aoeRadius
        });

        return newState;
      });
      return;
    }

    const newUnits: GameUnit[] = [];
    const lane = y < ARENA_HEIGHT / 2 ? 'TOP' : 'BOTTOM';

    for (let i = 0; i < (card.count || 1); i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      newUnits.push({
        id: Math.random().toString(),
        cardId: card.id,
        team,
        type: card.type,
        x: x + offsetX,
        y: y + offsetY,
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
        splitOnDeath: card.splitOnDeath,
        spawnChildId: card.spawnChild
      });
    }

    setGameState(prev => ({
      ...prev,
      units: [...prev.units, ...newUnits]
    }));
  }, []);

  const handlePlayerDeploy = (x: number, y: number) => {
    if (selectedCardIdx === null) return;
    attemptDeployCard(selectedCardIdx, x, y);
  };

  const attemptDeployCard = useCallback((cardIdx: number, x: number, y: number) => {
      const cardId = gameState.playerHand[cardIdx];
      const card = CARD_LIBRARY.find(c => c.id === cardId);
      if (!card) return false;
      if (gameState.status !== 'PLAYING') return false;
      if (card.type !== UnitType.SPELL && x > ARENA_WIDTH / 2) return false;
      if (gameState.playerEnergy < card.cost) return false;

      spawnUnits(cardId, Team.PLAYER, x, y);
      
      setGameState(prev => {
        const nextInDeck = prev.playerDeck[0];
        const newDeck = [...prev.playerDeck.slice(1), cardId];
        const newHand = [...prev.playerHand];
        newHand[cardIdx] = nextInDeck;

        return {
          ...prev,
          playerEnergy: prev.playerEnergy - card.cost,
          playerHand: newHand,
          playerDeck: newDeck
        };
      });
      setSelectedCardIdx(null);
      return true;
  }, [gameState, spawnUnits]);

  const isPositionInsideArena = useCallback((clientX: number, clientY: number) => {
      if (!arenaBounds) return false;
      return (
        clientX >= arenaBounds.left &&
        clientX <= arenaBounds.right &&
        clientY >= arenaBounds.top &&
        clientY <= arenaBounds.bottom
      );
  }, [arenaBounds]);

  const clientToArenaPosition = useCallback((clientX: number, clientY: number) => {
      if (!arenaBounds) return null;
      return {
        x: (clientX - arenaBounds.left) * (ARENA_WIDTH / arenaBounds.width),
        y: (clientY - arenaBounds.top) * (ARENA_HEIGHT / arenaBounds.height)
      };
  }, [arenaBounds]);

  const isValidDrop = useCallback((card: Card, x: number) => {
      if (card.type !== UnitType.SPELL && x > ARENA_WIDTH / 2) return false;
      return true;
  }, []);

  const startCardDrag = (event: React.MouseEvent, idx: number, card: Card | undefined, canAfford: boolean) => {
    if (!card || !canAfford || gameState.status !== 'PLAYING') return;
    event.preventDefault();
    setSelectedCardIdx(idx);
    const inside = isPositionInsideArena(event.clientX, event.clientY);
    setDragState({
      idx,
      card,
      position: inside ? clientToArenaPosition(event.clientX, event.clientY) : null,
      overArena: inside
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const arenaPos = clientToArenaPosition(e.clientX, e.clientY);
      const inside = isPositionInsideArena(e.clientX, e.clientY);
      setDragState(prev => prev ? ({
        ...prev,
        position: inside ? arenaPos : null,
        overArena: inside
      }) : prev);
    };

    const handleUp = (e: MouseEvent) => {
      const arenaPos = clientToArenaPosition(e.clientX, e.clientY);
      setDragState(prev => {
        if (prev && arenaPos && isPositionInsideArena(e.clientX, e.clientY) && isValidDrop(prev.card, arenaPos.x)) {
          attemptDeployCard(prev.idx, arenaPos.x, arenaPos.y);
        } else {
          setSelectedCardIdx(null);
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, clientToArenaPosition, isPositionInsideArena, attemptDeployCard, isValidDrop]);

  const handleAIDeploy = (cardId: string, x: number, y: number) => {
    spawnUnits(cardId, Team.AI, x, y);
    setGameState(prev => {
        const card = CARD_LIBRARY.find(c => c.id === cardId);
        const currentIdx = prev.aiHand.indexOf(cardId);
        const nextInDeck = prev.aiDeck[0];
        const newDeck = [...prev.aiDeck.slice(1), cardId];
        const newHand = [...prev.aiHand];
        if (currentIdx !== -1) newHand[currentIdx] = nextInDeck;

        return {
            ...prev,
            aiEnergy: prev.aiEnergy - (card?.cost || 0),
            aiHand: newHand,
            aiDeck: newDeck
        };
    });
  };

  const handleAIAbility = useCallback((selection: SelectedSpecialAbility) => {
    setGameState(prev => {
      if (prev.status !== 'PLAYING') return prev;
      if (prev.aiCommanderAbilityCooldown > 0) return prev;

      const ability = findAbilityById(selection.id);
      if (!ability) return prev;
      if (prev.aiEnergy < ability.cost) return prev;
      const aiHasMothership = prev.units.some(u => u.team === Team.AI && u.isMothership && !u.isDead);

      if (selection.id === 'emp_overwatch') {
        const selectedMode = (selection.configuration.mode as string) || EMP_ABILITY_BALANCE.defaultMode;
        return applyEmpAbility(prev, Team.AI, selectedMode);
      }

      if (selection.id === 'mothership_command') {
        const hangarCard = selection.configuration.hangarUnit as string | undefined;
        if (!hangarCard) return prev;
        if (aiHasMothership) return prev;
        return applyMothershipAbility(prev, Team.AI, hangarCard);
      }

      return prev;
    });
  }, []);

  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;
    let lastTime = Date.now();
    const frame = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      setGameState(prev => {
        const updated = updateGame(prev, dt);
        aiController.update(updated, handleAIDeploy, handleAIAbility);
        return updated;
      });
      gameLoopRef.current = requestAnimationFrame(frame);
    };
    gameLoopRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, [gameState.status]);

  const startNewGame = (difficulty: number) => {
    aiController.reset();
    
    const playerDeckPool = [...gameState.playerSelection].sort(() => 0.5 - Math.random());
    const fullPool = CARD_LIBRARY.map(c => c.id);
    const aiDeckPool = [...fullPool].sort(() => 0.5 - Math.random()).slice(0, 8);

    setGameState(prev => ({
      ...prev,
      playerEnergy: 5,
      aiEnergy: 5,
      playerHand: playerDeckPool.slice(0, 4),
      playerDeck: playerDeckPool.slice(4),
      aiHand: aiDeckPool.slice(0, 4),
      aiDeck: aiDeckPool.slice(4),
      units: [],
      status: 'PLAYING',
      difficulty,
      projectiles: [],
      effects: [],
      pendingSpells: [],
      activeSpells: [],
      time: 0,
      commanderAbilityCooldown: 0,
      aiCommanderAbilityCooldown: 0,
      aiSpecialAbility: rollRandomAbilitySelection(),
      towers: [
        ...INITIAL_TOWERS_PLAYER.map(t => ({ ...t, id: 'p-' + Math.random(), team: Team.PLAYER, locked: false, isDead: false, maxHp: t.hp, lastAttack: 0, attackSpeed: 1100, shockwaveCooldown: 0 })),
        ...INITIAL_TOWERS_AI.map(t => ({ ...t, id: 'a-' + Math.random(), team: Team.AI, locked: false, isDead: false, maxHp: t.hp, lastAttack: 0, attackSpeed: 1100, shockwaveCooldown: 0 }))
      ],
    }));
  };

  const setStatus = (newStatus: GameState['status']) => {
    setGameState(prev => ({
      ...prev,
      previousStatus: prev.status,
      status: newStatus
    }));
  };

  const closeOverlay = () => {
    setGameState(prev => ({
      ...prev,
      status: prev.previousStatus === 'PLAYING' ? 'PLAYING' : 'START'
    }));
  };

  const timeRemaining = Math.max(0, GAME_DURATION - Math.floor(gameState.time / 1000));
  const isOvertime = timeRemaining <= 60 && timeRemaining > 0;
  const activeAbility = findAbilityById(specialAbility.id) || SPECIAL_ABILITIES[0];
  const abilityCost = activeAbility.cost;
  const selectedHangarCardId = specialAbility.configuration.hangarUnit as string | undefined;
  const selectedHangarCard = CARD_LIBRARY.find(c => c.id === selectedHangarCardId && c.type !== UnitType.SPELL);
  const playerHasMothership = gameState.units.some(u => u.team === Team.PLAYER && u.isMothership && !u.isDead);
  const abilityReady = gameState.playerEnergy >= abilityCost
    && gameState.commanderAbilityCooldown <= 0
    && (activeAbility.id !== 'mothership_command' || (!!selectedHangarCard && !playerHasMothership));
  const currentEmpMode = getEmpModeConfig(specialAbility.configuration.mode as string);
  const currentMothershipCooldown = Math.ceil(getMothershipCooldownMs() / 1000);
  const currentMothershipPayloadInterval = Math.ceil(getMothershipPayloadIntervalMs(selectedHangarCard?.cost) / 1000);
  const abilityEditingLocked = gameState.status === 'PLAYING';
  const isDeckEditorOpen = gameState.status === 'DECK_EDITOR';

  return (
    <div className={`min-h-screen flex bg-[#010101] overflow-hidden select-none font-mono text-white ${isDeckEditorOpen ? 'app-overlay-locked' : ''}`}>
      <div className="w-48 h-screen bg-[#050505] border-r border-[#1a3a5a] flex flex-col p-4 shadow-[5px_0_30px_rgba(0,0,0,0.5)] z-30 overflow-y-auto scrollbar-hide">
        <div className="mb-6 flex flex-col items-center">
            <div className="text-[10px] text-[#00ccff] font-bold uppercase tracking-[0.2em] mb-1">Command Deck</div>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ccff]/30 to-transparent"></div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          {gameState.status === 'PLAYING' && gameState.playerHand.map((cardId, idx) => {
            const card = CARD_LIBRARY.find(c => c.id === cardId);
            const isSelected = selectedCardIdx === idx;
            const canAfford = card ? gameState.playerEnergy >= card.cost : false;
            return (
              <div
                key={idx}
                onClick={() => setSelectedCardIdx(isSelected ? null : idx)}
                onMouseDown={(e) => startCardDrag(e, idx, card, canAfford)}
                className={`
                  relative w-full h-28 border transition-all duration-300 flex flex-col justify-between p-2 rounded-md
                  ${isSelected ? 'border-[#00ccff] translate-x-4 shadow-[0_0_25px_rgba(0,204,255,0.3)] bg-[#00ccff]/10' : 'border-[#1a3a5a] bg-[#0a0a0a] hover:border-[#00ccff]/50'}
                  ${canAfford ? 'cursor-pointer' : 'opacity-30 grayscale'}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[8px] text-[#00ccff] font-bold uppercase tracking-tighter leading-tight max-w-[70%]">{card?.name}</span>
                  <span className="bg-[#00ccff] text-black text-[9px] font-black px-1 rounded-sm">{card?.cost}</span>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                   <div 
                     className="w-6 h-6 border flex items-center justify-center rotate-45"
                     style={{ borderColor: card?.color }}
                   >
                      <div className="w-1.5 h-1.5" style={{ backgroundColor: card?.color }}></div>
                   </div>
                </div>

                <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1 mt-1">
                   <div className="text-[6px] text-[#00ccff]/70 uppercase font-bold truncate">{card?.description}</div>
                </div>
              </div>
            );
          })}
          
          {gameState.status === 'PLAYING' && (
            <div className="mt-2 flex flex-col items-center opacity-40">
              <span className="text-[7px] text-white/40 uppercase mb-1">Sig.</span>
              <div className="w-10 h-12 border border-white/10 bg-[#0a0a0a] flex items-center justify-center rounded">
                <div className="w-3 h-3 border rotate-45" style={{ borderColor: CARD_LIBRARY.find(c => c.id === gameState.playerDeck[0])?.color }}></div>
              </div>
            </div>
          )}
        </div>

        {gameState.status === 'PLAYING' && (
            <div className="mt-6 border-t border-[#1a3a5a] pt-4 flex flex-col items-center">
                <button 
                  onClick={triggerCommanderAbility}
                  disabled={!abilityReady}
                  className={`
                    w-full py-3 rounded border flex flex-col items-center justify-center transition-all duration-300
                    ${abilityReady ? 'border-[#00ccff] bg-[#00ccff]/10 animate-pulse text-[#00ccff]' : 'border-white/10 text-white/20 grayscale'}
                  `}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">TAC-PULSE</span>
                    <span className="text-[8px] mt-1">Coste: {abilityCost}⚡</span>
                    {activeAbility.id === 'emp_overwatch' && (
                      <span className="text-[8px] text-[#00ccff] mt-1 text-center leading-tight">
                        {currentEmpMode.label}
                      </span>
                    )}
                    {activeAbility.id === 'mothership_command' && (
                      <span className="text-[8px] text-[#00ccff] mt-1 text-center leading-tight">
                        {selectedHangarCard ? `${selectedHangarCard.name} · CD ${currentMothershipCooldown}s · Gén. ${currentMothershipPayloadInterval}s` : 'Configura la carta embarcada'}
                      </span>
                    )}
                    {gameState.commanderAbilityCooldown > 0 && (
                        <div className="text-[7px] mt-1 opacity-50">CD: {(gameState.commanderAbilityCooldown / 1000).toFixed(0)}s</div>
                    )}
                </button>
                <p className="text-[6px] text-white/30 uppercase mt-2 text-center">
                  {activeAbility.id === 'emp_overwatch'
                    ? `${currentEmpMode.stunDuration / 1000}s + ${currentEmpMode.damage || '0'} daño en radio ${EMP_ABILITY_BALANCE.radius}`
                    : activeAbility.id === 'mothership_command'
                      ? `Nave con ${selectedHangarCard ? selectedHangarCard.name : 'carga pendiente'} · CD fijo ${currentMothershipCooldown}s · Genera carga cada ${currentMothershipPayloadInterval}s`
                      : 'Aturde enemigos globales'}
                </p>
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center p-6 h-screen relative">
        <div className="w-full max-w-[1100px] flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-6">
            <div className="text-2xl tracking-tighter text-[#00ccff] drop-shadow-[0_0_8px_#00ccff]">NEXOROYALE</div>
            <div className="flex gap-2">
              <button onClick={() => setStatus('CODEX')} className="text-[9px] border border-[#00ccff]/30 px-3 py-1 text-[#00ccff]/70 hover:bg-[#00ccff] hover:text-black transition uppercase tracking-widest">Codex</button>
              <button onClick={() => setStatus('DECK_EDITOR')} className="text-[9px] border border-[#00ccff]/30 px-3 py-1 text-[#00ccff]/70 hover:bg-[#00ccff] hover:text-black transition uppercase tracking-widest">Mazo</button>
              <button
                disabled={abilityEditingLocked}
                onClick={() => !abilityEditingLocked && setIsAbilityModalOpen(true)}
                className={`text-[9px] border px-3 py-1 uppercase tracking-widest transition ${
                  abilityEditingLocked
                    ? 'border-white/10 text-white/20 cursor-not-allowed'
                    : 'border-[#00ccff]/30 text-[#00ccff]/70 hover:bg-[#00ccff] hover:text-black'
                }`}
              >
                Habilidad
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
              <span className="text-[8px] opacity-40 uppercase tracking-widest">Sincronización Tactical</span>
              <div className={`text-xl ${isOvertime ? 'text-[#ff3366] animate-pulse' : 'text-white'}`}>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              {isOvertime && <div className="text-[8px] text-[#ff3366] font-black uppercase">Fisión Overclock x2</div>}
          </div>

          <div className="flex gap-6 text-lg">
             <div className="flex flex-col items-end">
                <span className="text-[8px] text-[#ff3366] opacity-50 uppercase tracking-widest">IA Nexus</span>
                <div className="text-[#ff3366] drop-shadow-[0_0_5px_#ff3366] font-bold">{Math.floor(gameState.aiEnergy)}⚡</div>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[8px] text-[#00ccff] opacity-50 uppercase tracking-widest">User Link</span>
                <div className="text-[#00ccff] drop-shadow-[0_0_5px_#00ccff] font-bold">{Math.floor(gameState.playerEnergy)}⚡</div>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[8px] text-[#00ccff] opacity-50 uppercase tracking-widest">Habilidad</span>
                <div className="text-[9px] text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-[#00ccff]/40 text-[#00ccff] uppercase tracking-widest text-[8px] rounded">
                    {activeAbility.badge || 'Core'}
                  </span>
                  <span className="font-bold">{activeAbility.name}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
          <div className="w-full max-w-[1100px]">
            <Arena 
              state={gameState} 
              onDeploy={handlePlayerDeploy} 
              dragPreview={
                dragState && dragState.position && dragState.card.type !== UnitType.GROUND
                  ? {
                      x: dragState.position.x,
                      y: dragState.position.y,
                      cardRange: dragState.card.aoeRadius || dragState.card.range,
                      color: dragState.card.color,
                      isValid: dragState.overArena && isValidDrop(dragState.card, dragState.position.x)
                    }
                  : null
              }
              onBoundsChange={setArenaBounds}
            />
          </div>
        </div>

        <div className="w-full max-w-[1100px] mt-4 flex flex-col gap-2">
            <div className="flex justify-between px-2">
                <span className="text-[9px] font-bold text-[#00ccff]/70 uppercase tracking-widest">Energy Core Status</span>
                <span className="text-[9px] font-bold text-[#00ccff]">{gameState.playerEnergy.toFixed(1)} / {MAX_ENERGY}</span>
            </div>
            <div className="h-2 bg-[#111] relative overflow-hidden rounded-full border border-white/5">
                <div className="h-full bg-[#00ccff] transition-all duration-300 shadow-[0_0_10px_#00ccff]" style={{ width: `${(gameState.playerEnergy / MAX_ENERGY) * 100}%` }} />
                {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} className="absolute h-full w-[1px] bg-black/50" style={{ left: `${i * 10}%` }} />
                ))}
            </div>
        </div>
      </div>

      {gameState.status === 'CODEX' && <Codex onClose={closeOverlay} />}
      {gameState.status === 'DECK_EDITOR' && (
        <DeckEditor 
          selection={gameState.playerSelection} 
          onUpdate={(newSel) => setGameState(p => ({ ...p, playerSelection: newSel }))}
          onClose={closeOverlay}
          onOpenAbilityModal={() => setIsAbilityModalOpen(true)}
          selectedAbility={specialAbility}
        />
      )}

      {(gameState.status === 'START' || gameState.status === 'VICTORY' || gameState.status === 'DEFEAT') && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center text-center p-10 border-[10px] border-[#1a3a5a]/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a3a5a33_0%,_transparent_70%)] opacity-50" />
          <h1 className="text-7xl font-black text-white mb-2 tracking-tighter relative">
            <span className="absolute -inset-2 blur-3xl bg-[#00ccff] opacity-20"></span>
            {gameState.status === 'START' ? 'NEXOROYALE' : gameState.status}
          </h1>
          <p className="text-[#00ccff] text-base mb-12 uppercase tracking-[0.4em] font-mono opacity-80">Guerra Táctica de Vanguardia</p>
          <div className="grid grid-cols-1 gap-4 w-full max-w-xs relative z-10">
             {['Iniciado', 'Comandante', 'Supremo'].map((label, i) => (
                <button key={i} onClick={() => startNewGame(i)} className="group relative py-3 border border-[#00ccff]/50 text-[#00ccff] overflow-hidden transition-all hover:bg-[#00ccff] hover:text-black font-bold uppercase tracking-widest text-xs hover:border-[#00ccff] rounded">
                  <span className="relative z-10">{label}</span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                </button>
             ))}
            <div className="flex gap-2 mt-4">
               <button onClick={() => setStatus('DECK_EDITOR')} className="flex-1 py-2 border border-[#00ccff]/30 text-[#00ccff]/70 text-[9px] uppercase tracking-widest hover:bg-[#00ccff] hover:text-black transition">Mazo</button>
               <button onClick={() => setStatus('CODEX')} className="flex-1 py-2 border border-[#00ccff]/30 text-[#00ccff]/70 text-[9px] uppercase tracking-widest hover:bg-[#00ccff] hover:text-black transition">Codex</button>
               <button onClick={() => setIsAbilityModalOpen(true)} className="flex-1 py-2 border border-[#00ccff]/30 text-[#00ccff]/70 text-[9px] uppercase tracking-widest hover:bg-[#00ccff] hover:text-black transition">Habilidad</button>
             </div>
          </div>
        </div>
      )}

      {isAbilityModalOpen && (
        <SpecialAbilityModal
          initialSelection={specialAbility}
          onClose={() => setIsAbilityModalOpen(false)}
          onConfirm={(selection) => {
            setSpecialAbility(selection);
            setIsAbilityModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
