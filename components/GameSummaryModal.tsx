import React, { useMemo } from 'react';
import { CARD_LIBRARY, PLAYABLE_CARD_LIBRARY, POST_GAME_SUGGESTION_CONFIG } from '../constants';
import { GameMetrics, ReplacementSuggestion, Team, UnitType } from '../types';
import OverlayPortal from './OverlayPortal';
import './overlays.css';

interface GameSummaryModalProps {
  status: 'START' | 'PLAYING' | 'VICTORY' | 'DEFEAT' | 'DRAW' | 'CODEX' | 'DECK_EDITOR';
  metrics: GameMetrics;
  playerSelection: string[];
  onClose: () => void;
}

const GameSummaryModal: React.FC<GameSummaryModalProps> = ({ status, metrics, playerSelection, onClose }) => {
  const playerUsage = metrics.cardUsage[Team.PLAYER] || {};
  const totalCardsPlayed = metrics.totalCardsPlayed[Team.PLAYER] || 0;
  const averageCost = totalCardsPlayed > 0 ? metrics.totalCost[Team.PLAYER] / totalCardsPlayed : 0;
  const mostUsedCards = Object.entries(playerUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cardId, count]) => ({
      cardId,
      count,
      name: CARD_LIBRARY.find(card => card.id === cardId)?.name ?? cardId
    }));

  const underusedCards = playerSelection.filter(cardId => (playerUsage[cardId] || 0) <= POST_GAME_SUGGESTION_CONFIG.underusedThreshold);

  const suggestions = useMemo<ReplacementSuggestion[]>(() => {
    const replacementCandidates = PLAYABLE_CARD_LIBRARY.filter(card => !playerSelection.includes(card.id));
    const availableIds = new Set(replacementCandidates.map(card => card.id));
    const usedSuggestions = new Set<string>();
    const results: ReplacementSuggestion[] = [];

    const pickReplacement = (cardId: string, reason: string, onlyCheaper: boolean) => {
      const sourceCard = CARD_LIBRARY.find(card => card.id === cardId);
      if (!sourceCard) return;
      const sameType = replacementCandidates.filter(card => card.type === sourceCard.type);
      const sameFaction = sameType.filter(card => card.faction === sourceCard.faction);
      let pool = sameFaction.length ? sameFaction : sameType.length ? sameType : replacementCandidates;

      if (averageCost >= POST_GAME_SUGGESTION_CONFIG.highAverageCost || onlyCheaper) {
        const cheaperPool = pool.filter(card => card.cost <= Math.max(1, averageCost - POST_GAME_SUGGESTION_CONFIG.cheaperCostBuffer));
        if (cheaperPool.length) pool = cheaperPool;
      }

      const candidate = pool
        .filter(card => !usedSuggestions.has(card.id))
        .sort((a, b) => a.cost - b.cost)[0];

      if (!candidate || !availableIds.has(candidate.id)) return;
      usedSuggestions.add(candidate.id);
      results.push({
        cardId,
        suggestedId: candidate.id,
        reason
      });
    };

    underusedCards.forEach(cardId => {
      if (results.length >= POST_GAME_SUGGESTION_CONFIG.maxSuggestions) return;
      const usageCount = playerUsage[cardId] || 0;
      pickReplacement(cardId, `Carta infrautilizada (${usageCount} usos).`, false);
    });

    if (averageCost >= POST_GAME_SUGGESTION_CONFIG.highAverageCost && results.length < POST_GAME_SUGGESTION_CONFIG.maxSuggestions) {
      const expensiveCards = playerSelection
        .map(cardId => CARD_LIBRARY.find(card => card.id === cardId))
        .filter((card): card is NonNullable<typeof card> => !!card)
        .sort((a, b) => b.cost - a.cost)
        .slice(0, POST_GAME_SUGGESTION_CONFIG.maxSuggestions);

      expensiveCards.forEach(card => {
        if (results.length >= POST_GAME_SUGGESTION_CONFIG.maxSuggestions) return;
        if (results.some(entry => entry.cardId === card.id)) return;
        pickReplacement(card.id, `Coste medio alto (${averageCost.toFixed(1)}).`, true);
      });
    }

    return results;
  }, [averageCost, playerSelection, playerUsage, underusedCards]);

  const formatDamage = (value: number) => Math.round(value).toLocaleString('es-ES');

  return (
    <OverlayPortal>
      <div className="overlay-shell overlay-shell--modal p-4 md:p-8 flex items-start justify-center">
        <div className="overlay-content grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#050505] border border-[#1a3a5a] rounded p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-xl font-black text-[#00ccff] uppercase tracking-widest">Resumen de combate</h3>
                <p className="text-[10px] text-white/50 uppercase">{status}</p>
              </div>
              <button
                onClick={onClose}
                className="text-[10px] px-3 py-1 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border border-white/10 bg-black/40 rounded">
                <div className="text-[10px] uppercase text-white/50">Daño total</div>
                <div className="text-lg font-bold text-white">{formatDamage(metrics.totalDamage[Team.PLAYER])}</div>
              </div>
              <div className="p-3 border border-white/10 bg-black/40 rounded">
                <div className="text-[10px] uppercase text-white/50">Daño a torres</div>
                <div className="text-lg font-bold text-white">{formatDamage(metrics.towerDamage[Team.PLAYER])}</div>
              </div>
              <div className="p-3 border border-white/10 bg-black/40 rounded">
                <div className="text-[10px] uppercase text-white/50">Coste medio</div>
                <div className="text-lg font-bold text-white">{averageCost.toFixed(1)}⚡</div>
              </div>
              <div className="p-3 border border-white/10 bg-black/40 rounded">
                <div className="text-[10px] uppercase text-white/50">Cartas jugadas</div>
                <div className="text-lg font-bold text-white">{totalCardsPlayed}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-white/10 rounded bg-black/30">
                <h4 className="text-sm text-white font-bold uppercase tracking-widest mb-3">Cartas más usadas</h4>
                {mostUsedCards.length === 0 ? (
                  <p className="text-[11px] text-white/60">Sin despliegues registrados.</p>
                ) : (
                  <ul className="space-y-2">
                    {mostUsedCards.map(card => (
                      <li key={card.cardId} className="flex items-center justify-between text-[12px] text-white/80">
                        <span>{card.name}</span>
                        <span className="text-[#00ccff] font-bold">{card.count}x</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 border border-white/10 rounded bg-black/30">
                <h4 className="text-sm text-white font-bold uppercase tracking-widest mb-3">Cartas infrautilizadas</h4>
                {underusedCards.length === 0 ? (
                  <p className="text-[11px] text-white/60">Todas las cartas tuvieron uso regular.</p>
                ) : (
                  <ul className="space-y-2">
                    {underusedCards.map(cardId => {
                      const card = CARD_LIBRARY.find(entry => entry.id === cardId);
                      return (
                        <li key={cardId} className="flex items-center justify-between text-[12px] text-white/80">
                          <span>{card?.name ?? cardId}</span>
                          <span className="text-white/50">{playerUsage[cardId] || 0}x</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#1a3a5a] rounded p-6 flex flex-col gap-4">
            <h4 className="text-sm text-white font-bold uppercase tracking-widest">Sugerencias de reemplazo</h4>
            {suggestions.length === 0 ? (
              <p className="text-[11px] text-white/60">
                No hay reemplazos urgentes. Ajusta el mazo si quieres bajar el coste medio o probar nuevas sinergias.
              </p>
            ) : (
              <ul className="space-y-3">
                {suggestions.map(suggestion => {
                  const current = CARD_LIBRARY.find(card => card.id === suggestion.cardId);
                  const replacement = PLAYABLE_CARD_LIBRARY.find(card => card.id === suggestion.suggestedId);
                  return (
                    <li key={`${suggestion.cardId}-${suggestion.suggestedId}`} className="p-3 border border-white/10 rounded bg-black/30">
                      <div className="text-[12px] text-white/80">
                        Cambiar <span className="text-white font-semibold">{current?.name ?? suggestion.cardId}</span> por{' '}
                        <span className="text-[#00ccff] font-semibold">{replacement?.name ?? suggestion.suggestedId}</span>
                      </div>
                      <div className="text-[10px] text-white/50 uppercase mt-1">{suggestion.reason}</div>
                      {replacement?.type === UnitType.SPELL && (
                        <div className="text-[10px] text-[#ffcc00] mt-1 uppercase">Hechizo táctico</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
};

export default GameSummaryModal;
