
import React, { useMemo, useState } from 'react';
import { Card, UnitType, Faction, TargetPreference, AlienSubtype } from '../types';
import { PLAYABLE_CARD_LIBRARY } from '../constants';

interface CodexProps {
  onClose: () => void;
}

interface SortingOption {
  value: string;
  label: string;
  predicate?: (card: Card) => boolean;
}

const SORTING_OPTIONS: SortingOption[] = [
  { value: 'default', label: 'Default · Orden original' },
  { value: 'type_air', label: 'Tipo: Aéreo', predicate: (card) => card.type === UnitType.AIR },
  { value: 'type_ground', label: 'Tipo: Terrestre', predicate: (card) => card.type === UnitType.GROUND },
  { value: 'type_spell', label: 'Carta: Hechizo', predicate: (card) => card.type === UnitType.SPELL },
  { value: 'role_anti_air', label: 'Rol: Anti-aéreo', predicate: (card) => card.targetPref === TargetPreference.AIR },
  { value: 'faction_human', label: 'Facción: Humanos', predicate: (card) => card.faction === Faction.HUMAN },
  { value: 'faction_android', label: 'Facción: Androides', predicate: (card) => card.faction === Faction.ANDROID },
  { value: 'faction_alien', label: 'Facción: Alien', predicate: (card) => card.faction === Faction.ALIEN },
  { value: 'alien_humanoid', label: 'Subtipo Alien: Humanoide', predicate: (card) => card.faction === Faction.ALIEN && card.alienSubtype === AlienSubtype.HUMANOID },
  { value: 'alien_arachnid', label: 'Subtipo Alien: Arácnido', predicate: (card) => card.faction === Faction.ALIEN && card.alienSubtype === AlienSubtype.ARACNID },
  { value: 'alien_slimoid', label: 'Subtipo Alien: Slimoide', predicate: (card) => card.faction === Faction.ALIEN && card.alienSubtype === AlienSubtype.SLIMOID },
];

const Codex: React.FC<CodexProps> = ({ onClose }) => {
  const [sortKey, setSortKey] = useState('default');

  const sortedCards = useMemo(() => {
    const option = SORTING_OPTIONS.find((o) => o.value === sortKey);
    if (!option?.predicate) return PLAYABLE_CARD_LIBRARY;

    const withIndex = PLAYABLE_CARD_LIBRARY.map((card, idx) => ({ card, idx }));
    return withIndex
      .sort((a, b) => {
        const score = (entry: { card: Card }) => (option.predicate?.(entry.card) ? 0 : 1);
        const diff = score(a) - score(b);
        return diff !== 0 ? diff : a.idx - b.idx;
      })
      .map((entry) => entry.card);
  }, [sortKey]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] p-10 flex flex-col items-center">
      <div className="w-full max-w-6xl flex justify-between items-center mb-10 border-b border-[#00ccff]/30 pb-4">
        <h2 className="text-4xl font-black text-[#00ccff] tracking-tighter">CODEX DE UNIDADES</h2>
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/60 uppercase tracking-widest">
            Ordenar por
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="ml-2 bg-black border border-white/20 text-white text-xs px-2 py-1 uppercase"
            >
              {SORTING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-[#ff3366] text-[#ff3366] hover:bg-[#ff3366] hover:text-white transition uppercase font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-4 scrollbar-hide">
        {sortedCards.map(card => (
          <div key={card.id} className="bg-[#0a0a0a] border border-[#1a3a5a] p-6 rounded-lg flex flex-col gap-4 group hover:border-[#00ccff] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-[#00ccff] transition-colors">{card.name}</h3>
                <span className="text-[10px] text-[#00ccff] uppercase tracking-widest">{card.type}</span>
              </div>
              <div className="bg-[#00ccff] text-black px-3 py-1 font-black rounded-sm">{card.cost}⚡</div>
            </div>

            <div className="h-24 flex items-center justify-center bg-black/50 border border-white/5 relative overflow-hidden">
              {/* Visual representation in Codex */}
              <div 
                className="w-12 h-12 border-2 flex items-center justify-center"
                style={{ borderColor: card.color, boxShadow: `0 0 15px ${card.color}` }}
              >
                 <div className="w-4 h-4" style={{ backgroundColor: card.color }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#00ccff]/5 to-transparent"></div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-[11px] uppercase text-white/70">
              <div className="flex flex-col">
                <span className="text-white/40 text-[9px]">Vida</span>
                <span className="font-bold text-white">{card.hp}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-[9px]">Daño</span>
                <span className="font-bold text-white">{Math.abs(card.damage)} {card.damage < 0 ? '(Cura)' : ''}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-[9px]">Alcance</span>
                <span className="font-bold text-white">{card.range}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-[9px]">Cadencia</span>
                <span className="font-bold text-white">{(1000/card.attackSpeed).toFixed(1)}/s</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-white/80 italic mb-2 leading-relaxed">"{card.flavor}"</p>
              <p className="text-[10px] text-[#00ccff] font-bold uppercase">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Codex;
