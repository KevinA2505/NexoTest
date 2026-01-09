
import React, { useState } from 'react';
import { ARACNO_HIVE_ABILITY_BALANCE, ARACNO_HIVE_BALANCE, ARACNO_SPIDER_MODES, CARD_BY_ID, EMP_ABILITY_BALANCE, PLAYABLE_CARD_LIBRARY, SPECIAL_ABILITIES, findAbilityById } from '../constants';
import { SelectedSpecialAbility, UnitType } from '../types';
import { getEmpModeConfig } from '../engine/abilities/emp';
import { getMothershipCooldownMs, getMothershipPayloadIntervalMs } from '../engine/abilities/mothership';
import OverlayPortal from './OverlayPortal';
import CardPreview from './CardPreview';
import './overlays.css';

interface DeckEditorProps {
  selection: string[];
  onUpdate: (newSelection: string[]) => void;
  onClose: () => void;
  onOpenAbilityModal: () => void;
  selectedAbility: SelectedSpecialAbility;
}

const DeckEditor: React.FC<DeckEditorProps> = ({ selection, onUpdate, onClose, onOpenAbilityModal, selectedAbility }) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const visibleDeckCards = PLAYABLE_CARD_LIBRARY.filter(card => !card.id.startsWith('aracno_spider'));
  const ARACNO_MODE_TO_CARD: Record<string, string> = {
    lethal: 'aracno_spider_lethal',
    healing: 'aracno_spider_heal',
    kamikaze: 'aracno_spider_kami'
  };
  const toggleCard = (id: string) => {
    if (selection.includes(id)) {
      onUpdate(selection.filter(cid => cid !== id));
    } else if (selection.length < 8) {
      onUpdate([...selection, id]);
    }
  };

  const avgCost = selection.length > 0 
    ? (selection.reduce((acc, id) => acc + (PLAYABLE_CARD_LIBRARY.find(c => c.id === id)?.cost || 0), 0) / selection.length).toFixed(1)
    : 0;

  const typeCounts = selection.reduce((acc, id) => {
    const type = PLAYABLE_CARD_LIBRARY.find(c => c.id === id)?.type;
    if (type) acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ability = findAbilityById(selectedAbility.id) || SPECIAL_ABILITIES[0];
  const hangarCardId = selectedAbility.configuration.hangarUnit as string;
  const hangarCard = PLAYABLE_CARD_LIBRARY.find(c => c.id === hangarCardId && c.type !== UnitType.SPELL);
  const displayedAbilityCooldown = ability.id === 'mothership_command'
    ? Math.ceil(getMothershipCooldownMs() / 1000)
    : ability.cooldown;
  const selectedAracnoModeKey = (selectedAbility.configuration.mode as string) || ARACNO_HIVE_ABILITY_BALANCE.defaultMode;
  const selectedAracnoCardId = ARACNO_MODE_TO_CARD[selectedAracnoModeKey] || ARACNO_MODE_TO_CARD[ARACNO_HIVE_ABILITY_BALANCE.defaultMode];
  const selectedAracnoCard = CARD_BY_ID.get(selectedAracnoCardId);
  const selectedAracnoMode = ARACNO_SPIDER_MODES[selectedAracnoModeKey as keyof typeof ARACNO_SPIDER_MODES] || ARACNO_SPIDER_MODES[ARACNO_HIVE_ABILITY_BALANCE.defaultMode as keyof typeof ARACNO_SPIDER_MODES];
  const hiveSpawnIntervalSeconds = Math.ceil(ARACNO_HIVE_BALANCE.spawnIntervalMs / 1000);
  const renderAbilityConfigValue = (key: string, value: string | number | boolean) => {
    if (ability.id === 'emp_overwatch' && key === 'mode') {
      const mode = getEmpModeConfig(String(value));
      return `${mode.label} · ${mode.stunDuration / 1000}s + ${mode.damage} dmg · Radio ${EMP_ABILITY_BALANCE.radius}`;
    }
    if (ability.id === 'mothership_command' && key === 'hangarUnit') {
      const card = PLAYABLE_CARD_LIBRARY.find(c => c.id === value);
      if (!card) return 'Pendiente';
      const cooldown = Math.ceil(getMothershipCooldownMs() / 1000);
      const payloadInterval = Math.ceil(getMothershipPayloadIntervalMs(card.cost) / 1000);
      return `${card.name} · ${card.cost}⚡ · CD ${cooldown}s · Gén. ${payloadInterval}s`;
    }
    if (ability.id === 'aracno_hive' && key === 'mode') {
      const card = selectedAracnoCard;
      return `${card?.name || 'Araña'} · HP ${selectedAracnoMode.hp} · Daño ${selectedAracnoMode.damage} · Alcance ${selectedAracnoMode.range} · Spawn ${hiveSpawnIntervalSeconds}s · Decae ${Math.round(ARACNO_HIVE_BALANCE.decayPerSecond)} HP/s`;
    }
    return String(value);
  };

  return (
    <OverlayPortal>
      <div className="overlay-shell overlay-shell--deck animate-in fade-in duration-300">
        <div className="overlay-content flex justify-between items-center mb-6 border-b border-[#00ccff]/30 pb-4">
          <div>
            <h2 className="text-3xl font-black text-[#00ccff] tracking-tighter">CENTRO DE ARMAMENTO</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Configuración de mazo táctico (8 unidades máx.)</p>
          </div>
          <button 
            onClick={onClose}
            disabled={selection.length !== 8}
            className={`px-8 py-2 border font-bold transition-all ${selection.length === 8 ? 'border-[#00ccff] text-[#00ccff] hover:bg-[#00ccff] hover:text-black' : 'border-white/10 text-white/10 cursor-not-allowed'}`}
          >
            {selection.length === 8 ? 'GUARDAR Y SALIR' : `FALTAN ${8 - selection.length} CARTAS`}
          </button>
        </div>

        <div className="overlay-content grid grid-cols-1 lg:grid-cols-4 gap-8 overflow-hidden">
          {/* Statistics Sidebar */}
          <div className="lg:col-span-1 bg-[#050505] border border-[#1a3a5a] p-6 rounded flex flex-col gap-6 h-fit">
            <h3 className="text-[#00ccff] font-bold text-sm uppercase border-b border-white/5 pb-2">Análisis de Mazo</h3>

            <div className="p-3 border border-[#00ccff]/30 bg-[#00ccff]/5 rounded flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-white/60">Habilidad Especial</span>
                <span className="text-[10px] font-black text-[#00ccff] px-2 py-0.5 border border-[#00ccff]/40 rounded">
                  {ability.badge || 'Núcleo'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">{ability.name}</span>
                <p className="text-[10px] text-white/50 leading-relaxed">{ability.description}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-white/60 uppercase">
                <span className="flex items-center gap-1"><span className="text-[#00ccff] font-black">{ability.cost}⚡</span> activación</span>
                <span className="flex items-center gap-1">
                  <span className="text-[#00ccff] font-black">{displayedAbilityCooldown}s</span> enfriamiento
                </span>
              </div>
              <div className="flex flex-wrap gap-1 text-[9px] text-white/50">
                {Object.entries(selectedAbility.configuration).map(([key, value]) => {
                  const normalizedValue = value as string | number | boolean;
                  return (
                    <span key={key} className="px-2 py-1 bg-white/5 rounded border border-white/10 capitalize">
                      {key}: <strong className="text-[#00ccff]">{renderAbilityConfigValue(key, normalizedValue)}</strong>
                    </span>
                  );
                })}
              </div>
              {ability.id === 'aracno_hive' && selectedAracnoCard && (
                <div className="mt-3 p-3 border border-white/10 rounded bg-black/30 flex gap-3 items-center">
                  <CardPreview card={selectedAracnoCard} selected hovered={hoveredCardId === selectedAracnoCard.id} size="sm" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="text-[10px] uppercase text-white/60">Nido · Intervalo {hiveSpawnIntervalSeconds}s</div>
                    <div className="text-sm font-black text-white capitalize">{selectedAracnoModeKey}</div>
                    <div className="flex flex-wrap gap-2 text-[9px] text-white/60 uppercase tracking-wide">
                      <span className="px-2 py-1 border border-white/10 rounded">HP {ARACNO_HIVE_BALANCE.hp}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Decadencia {Math.round(ARACNO_HIVE_BALANCE.decayPerSecond)} HP/s</span>
                      <span className="px-2 py-1 border border-white/10 rounded">2x {selectedAracnoCard.name}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Daño {selectedAracnoMode.damage}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Alcance {selectedAracnoMode.range}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Cadencia {selectedAracnoMode.attackSpeed}ms</span>
                      {selectedAracnoModeKey === 'kamikaze' && (
                        <span className="px-2 py-1 border border-white/10 rounded">Veneno {ARACNO_SPIDER_MODES.kamikaze.dotDuration / 1000}s</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={onOpenAbilityModal}
                className="mt-2 w-full px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#00ccff]/60 text-[#00ccff] hover:bg-[#00ccff] hover:text-black transition"
              >
                Configurar habilidad
              </button>
            </div>
            
            <div className="flex flex-col">
              <span className="text-white/40 text-[9px] uppercase">Coste Medio</span>
              <span className="text-3xl font-black text-white">{avgCost}⚡</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.values(UnitType).map(type => (
                <div key={type} className="flex flex-col">
                  <span className="text-white/40 text-[8px] uppercase">{type}</span>
                  <span className={`text-lg font-bold ${typeCounts[type] ? 'text-[#00ccff]' : 'text-white/10'}`}>
                    {typeCounts[type] || 0}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-[#00ccff]/5 border border-[#00ccff]/20 text-[9px] text-white/60 leading-relaxed uppercase">
              {Number(avgCost) > 4.5 ? '⚠ Mazo pesado: requiere gestión eficiente de energía.' : 
               Number(avgCost) < 3.2 ? '✓ Mazo ligero: ideal para presión constante.' : 
               'Balanced: Adaptable a diversas situaciones.'}
            </div>
          </div>

          {/* Card Grid */}
          <div className="lg:col-span-3 overflow-y-auto max-h-[75vh] pr-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visibleDeckCards.map(card => {
              const isSelected = selection.includes(card.id);
              return (
                <div 
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className={`
                    relative p-3 border cursor-pointer transition-all duration-300 rounded flex flex-col gap-2 h-56
                    ${isSelected ? 'bg-[#03131d] border-[#00ccff] shadow-[0_0_18px_rgba(0,204,255,0.22)]' : 'bg-[#0a0a0a] border-white/10 hover:border-white/30'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold uppercase truncate pr-2 ${isSelected ? 'text-[#00ccff]' : 'text-white/70'}`}>{card.name}</span>
                    <span className={`text-[9px] font-black px-2 rounded-sm border ${isSelected ? 'border-[#00ccff]/50 text-[#00ccff]' : 'border-white/10 text-white/60'}`}>
                      {card.faction}
                    </span>
                  </div>

                  <CardPreview
                    card={card}
                    selected={isSelected}
                    hovered={hoveredCardId === card.id}
                    size="md"
                  />

                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#00ccff] text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
};

export default DeckEditor;
