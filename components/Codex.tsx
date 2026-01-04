
import React, { useMemo, useState } from 'react';
import { Card, UnitType, Faction, TargetPreference, AlienSubtype, ProjectileStyle } from '../types';
import { CARD_LIBRARY } from '../constants';

interface CodexProps {
  onClose: () => void;
}

interface SortingOption {
  value: string;
  label: string;
  predicate?: (card: Card) => boolean;
}

const TYPE_LABELS: Record<UnitType, string> = {
  [UnitType.AIR]: 'Aéreo',
  [UnitType.GROUND]: 'Terrestre',
  [UnitType.SPELL]: 'Hechizo',
  [UnitType.BUILDING]: 'Edificio'
};

const TARGET_LABELS: Record<TargetPreference, string> = {
  [TargetPreference.ANY]: 'Versátil',
  [TargetPreference.TOWERS]: 'Asedio/Torres',
  [TargetPreference.AIR]: 'Anti-aéreo',
  [TargetPreference.ALLIES]: 'Soporte/Aliados'
};

const FACTION_LABELS: Record<Faction, string> = {
  [Faction.HUMAN]: 'Humanos',
  [Faction.ANDROID]: 'Androides',
  [Faction.ALIEN]: 'Alien'
};

const ALIEN_SUBTYPE_LABELS: Record<AlienSubtype, string> = {
  [AlienSubtype.HUMANOID]: 'Humanoide',
  [AlienSubtype.ARACNID]: 'Arácnido',
  [AlienSubtype.SLIMOID]: 'Slimoide'
};

const PROJECTILE_LABELS: Record<ProjectileStyle, string> = {
  laser: 'Láser',
  plasma: 'Plasma',
  missile: 'Misil',
  beam: 'Rayo',
  none: 'Instantáneo'
};

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
    if (!option?.predicate) return CARD_LIBRARY;

    const withIndex = CARD_LIBRARY.map((card, idx) => ({ card, idx }));
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
        {sortedCards.map(card => {
          const isHealing = card.damage < 0;
          const isSpell = card.type === UnitType.SPELL;
          const attacksPerSecond = card.attackSpeed > 0 ? 1000 / card.attackSpeed : 0;
          const dps = Math.abs(card.damage) * attacksPerSecond;

          return (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-xl border border-white/10 p-6 flex flex-col gap-5 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_60px_rgba(0,0,0,0.45)]"
              style={{
                background: `linear-gradient(145deg, ${card.color}14, #0c1020 30%, #06070f)`,
                boxShadow: `0 0 25px ${card.color}26`
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-80 transition"
                style={{
                  background: `radial-gradient(120% 80% at 20% 20%, ${card.color}24 0%, transparent 60%), radial-gradient(80% 60% at 80% 10%, ${card.color}18 0%, transparent 50%)`
                }}
              />

              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/70">
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">{FACTION_LABELS[card.faction]}</span>
                    {card.faction === Faction.ALIEN && card.alienSubtype && (
                      <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[#9efcff]">{ALIEN_SUBTYPE_LABELS[card.alienSubtype]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white drop-shadow-sm leading-tight group-hover:text-[#b0f2ff]">{card.name}</h3>
                    <p className="text-[11px] text-white/60 uppercase tracking-[0.25em]">Codex #{card.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase">
                    <span
                      className="px-3 py-1 rounded-full bg-white/10 border border-white/10 font-bold tracking-wide shadow-sm"
                      style={{ boxShadow: `0 0 0 1px ${card.color}40` }}
                    >
                      {TYPE_LABELS[card.type]}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#0c1b2a] border border-[#00ccff]/40 text-[#a3e8ff] font-semibold tracking-wide">
                      Rol: {TARGET_LABELS[card.targetPref]}
                    </span>
                    {card.splitOnDeath && (
                      <span className="px-3 py-1 rounded-full bg-[#ffe57f14] border border-amber-300/50 text-amber-200 font-semibold">Divide al morir</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="px-4 py-2 rounded-lg text-lg font-black text-black shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${card.color}, #ffffff)` }}
                  >
                    {card.cost} ⚡
                  </div>
                  <div className="text-[10px] text-white/60 uppercase tracking-[0.2em]">Energía</div>
                </div>
              </div>

              <div className="h-28 flex items-center justify-between gap-4 relative z-10">
                <div className="flex-1 h-full rounded-lg border border-white/5 bg-black/40 backdrop-blur-sm overflow-hidden relative">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(120deg, ${card.color}22 0%, transparent 60%)`
                    }}
                  />
                  <div className="absolute -right-6 -bottom-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${card.color}33` }} />
                  <div className="flex items-center justify-center h-full relative">
                    <div
                      className="w-14 h-14 rounded-xl border-2 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                      style={{ borderColor: card.color, boxShadow: `0 0 20px ${card.color}70, inset 0 0 12px ${card.color}40` }}
                    >
                      <div className="w-6 h-6 rounded-md" style={{ background: `linear-gradient(135deg, ${card.color}, #ffffff)` }} />
                    </div>
                    <div className="absolute top-2 right-2 text-[10px] uppercase text-white/60 tracking-wider">Visión táctica</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-[11px] text-white/70">
                  <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-inner">
                    <div className="text-[10px] uppercase text-white/50">Proyecto</div>
                    <div className="font-semibold text-white">{PROJECTILE_LABELS[card.projectileType]}</div>
                  </div>
                  {isSpell && (
                    <div className="px-3 py-2 rounded-lg bg-[#162032] border border-[#54d0ff]/40 shadow-inner">
                      <div className="text-[10px] uppercase text-[#9be7ff]">Hechizo</div>
                      <div className="font-semibold text-white">{card.isAoE ? `AOE ${card.aoeRadius || 0}m` : 'Efecto puntual'}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] uppercase relative z-10">
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Vida</span>
                  <span className="text-lg font-bold text-white">{card.hp}</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border shadow-sm" style={{ borderColor: isHealing ? '#4ade8088' : '#ffffff1a', background: isHealing ? '#1a3a2622' : 'rgba(255,255,255,0.04)' }}>
                  <span className="text-white/40 text-[10px] tracking-widest">{isHealing ? 'Curación' : 'Daño'}</span>
                  <span className={`text-lg font-bold ${isHealing ? 'text-emerald-300' : 'text-white'}`}>
                    {Math.abs(card.damage)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">DPS</span>
                  <span className="text-lg font-bold text-white">{dps.toFixed(1)}</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Alcance</span>
                  <span className="text-lg font-bold text-white">{card.range}</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Velocidad</span>
                  <span className="text-lg font-bold text-white">{card.speed.toFixed(1)}</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Cadencia</span>
                  <span className="text-lg font-bold text-white">{attacksPerSecond.toFixed(1)}/s</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Radio AOE</span>
                  <span className="text-lg font-bold text-white">{card.isAoE ? `${card.aoeRadius || 0}m` : '—'}</span>
                </div>
                <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 shadow-sm">
                  <span className="text-white/40 text-[10px] tracking-widest">Coste</span>
                  <span className="text-lg font-bold text-white">{card.cost}⚡</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 relative z-10">
                <p className="text-sm text-white/80 italic mb-2 leading-relaxed">"{card.flavor}"</p>
                <p className="text-[11px] text-[#9be7ff] font-semibold uppercase tracking-wide">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Codex;
