import React, { useEffect, useMemo, useState } from 'react';
import { ARACNO_HIVE_ABILITY_BALANCE, ARACNO_HIVE_BALANCE, ARACNO_SPIDER_MODES, CARD_LIBRARY, EMP_ABILITY_BALANCE, MECHA_NEXODO_BALANCE, MOTHERSHIP_BALANCE, MOTHERSHIP_HP, PLAYABLE_CARD_LIBRARY, SPECIAL_ABILITIES, createDefaultAbilityConfig, findAbilityById, isMeleeSingleUnitCard } from '../constants';
import { SelectedSpecialAbility, UnitType } from '../types';
import { getEmpModeConfig } from '../engine/abilities/emp';
import { getMothershipCooldownMs, getMothershipPayloadIntervalMs } from '../engine/abilities/mothership';
import OverlayPortal from './OverlayPortal';
import CardPreview from './CardPreview';
import './overlays.css';

interface SpecialAbilityModalProps {
  initialSelection: SelectedSpecialAbility;
  onConfirm: (selection: SelectedSpecialAbility) => void;
  onClose: () => void;
}

const SpecialAbilityModal: React.FC<SpecialAbilityModalProps> = ({ initialSelection, onConfirm, onClose }) => {
  const [selectedId, setSelectedId] = useState(() => initialSelection.id || SPECIAL_ABILITIES[0].id);
  const [configurations, setConfigurations] = useState<Record<string, Record<string, string | number | boolean>>>(() => {
    const initialAbility = findAbilityById(initialSelection.id) || SPECIAL_ABILITIES[0];
    return {
      [initialAbility.id]: { ...createDefaultAbilityConfig(initialAbility), ...initialSelection.configuration }
    };
  });

  const selectedAbility = useMemo(
    () => findAbilityById(selectedId) || SPECIAL_ABILITIES[0],
    [selectedId]
  );

  useEffect(() => {
    if (!configurations[selectedAbility.id]) {
      setConfigurations(prev => ({
        ...prev,
        [selectedAbility.id]: createDefaultAbilityConfig(selectedAbility)
      }));
    }
  }, [selectedAbility, configurations]);

  const updateConfig = (key: string, value: string | number | boolean) => {
    setConfigurations(prev => ({
      ...prev,
      [selectedAbility.id]: {
        ...prev[selectedAbility.id],
        [key]: value
      }
    }));
  };

  const currentConfig = configurations[selectedAbility.id] || createDefaultAbilityConfig(selectedAbility);
  const selectedEmpMode = getEmpModeConfig(currentConfig.mode as string);
  const selectedHangarCardId = currentConfig.hangarUnit as string;
  const selectedHangarCard = PLAYABLE_CARD_LIBRARY.find(c => c.id === selectedHangarCardId && c.type !== UnitType.SPELL);
  const mothershipCooldownSeconds = Math.ceil(getMothershipCooldownMs() / 1000);
  const mothershipPayloadSeconds = Math.ceil(getMothershipPayloadIntervalMs(selectedHangarCard?.cost) / 1000);
  const displayedCooldown = selectedAbility.id === 'mothership_command' ? mothershipCooldownSeconds : selectedAbility.cooldown;
  const ARACNO_MODE_TO_CARD: Record<string, string> = {
    lethal: 'aracno_spider_lethal',
    healing: 'aracno_spider_heal',
    kamikaze: 'aracno_spider_kami'
  };
  const selectedAracnoModeKey = (currentConfig.mode as string) || ARACNO_HIVE_ABILITY_BALANCE.defaultMode;
  const selectedAracnoCardId = ARACNO_MODE_TO_CARD[selectedAracnoModeKey] || ARACNO_MODE_TO_CARD[ARACNO_HIVE_ABILITY_BALANCE.defaultMode];
  const selectedAracnoCard = CARD_LIBRARY.find(c => c.id === selectedAracnoCardId);
  const selectedAracnoMode = ARACNO_SPIDER_MODES[selectedAracnoModeKey as keyof typeof ARACNO_SPIDER_MODES] || ARACNO_SPIDER_MODES[ARACNO_HIVE_ABILITY_BALANCE.defaultMode as keyof typeof ARACNO_SPIDER_MODES];
  const hiveSpawnIntervalSeconds = Math.ceil(ARACNO_HIVE_BALANCE.spawnIntervalMs / 1000);
  const selectedMechaModeKey = (currentConfig.mode as string) || 'shield';
  const selectedMechaPilotId = currentConfig.pilotCard as string | undefined;
  const selectedMechaPilot = selectedMechaPilotId ? PLAYABLE_CARD_LIBRARY.find(c => c.id === selectedMechaPilotId) : undefined;
  const hasValidMechaPilot = selectedMechaPilot ? isMeleeSingleUnitCard(selectedMechaPilot) : false;
  const MECHA_MODE_DETAILS: Record<string, { label: string; hint: string }> = {
    shield: {
      label: 'Escudo',
      hint: `Blindaje pesado con +${MECHA_NEXODO_BALANCE.extraHp} HP fijos para absorber focus enemigo.`
    },
    laser: {
      label: 'Láser',
      hint: `Rayo continuo de ${MECHA_NEXODO_BALANCE.laserTickDamage} daño/tick durante ${MECHA_NEXODO_BALANCE.laserDurationMs / 1000}s (CD ${MECHA_NEXODO_BALANCE.laserCooldownMs / 1000}s).`
    }
  };

  const renderOption = (optionKey: string) => {
    const option = selectedAbility.options.find(o => o.key === optionKey);
    if (!option) return null;

    const value = currentConfig[option.key];

    if (option.type === 'slider') {
      return (
        <div key={option.key} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-white font-semibold">{option.label}</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">{option.description}</p>
            </div>
            <span className="text-[#00ccff] font-black text-sm">{value}</span>
          </div>
          <input
            type="range"
            min={option.min}
            max={option.max}
            step={option.step}
            value={Number(value)}
            onChange={e => updateConfig(option.key, Number(e.target.value))}
            className="accent-[#00ccff]"
          />
        </div>
      );
    }

    if (option.type === 'toggle') {
      return (
        <label
          key={option.key}
          className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded cursor-pointer"
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => updateConfig(option.key, e.target.checked)}
            className="mt-1 accent-[#00ccff]"
          />
          <div>
            <p className="text-sm text-white font-semibold">{option.label}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">{option.description}</p>
          </div>
        </label>
      );
    }

    if (option.type === 'select') {
      return (
        <div key={option.key} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">{option.label}</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">{option.description}</p>
            </div>
            <span className="text-[#00ccff] font-black text-sm capitalize">{String(value)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {option.choices?.map(choice => (
              <button
                key={choice.value}
                onClick={() => updateConfig(option.key, choice.value)}
                className={`p-3 border rounded text-left transition ${
                  value === choice.value
                    ? 'border-[#00ccff] bg-[#00ccff]/10 text-white'
                    : 'border-white/10 bg-black/30 text-white/70 hover:border-white/30'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-widest">{choice.label}</div>
                {choice.hint && <div className="text-[10px] text-white/60">{choice.hint}</div>}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <OverlayPortal>
      <div className="overlay-shell overlay-shell--modal p-4 md:p-8 flex items-start justify-center">
        <div className="overlay-content grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-[#050505] border border-[#1a3a5a] rounded p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-lg font-black text-[#00ccff] uppercase tracking-widest">Habilidad Especial</h3>
                <p className="text-[10px] text-white/50 uppercase">Selecciona el protocolo de mando</p>
              </div>
              <button
                onClick={onClose}
                className="text-[10px] px-3 py-1 border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {SPECIAL_ABILITIES.map(ability => {
                const active = ability.id === selectedAbility.id;
                const hangarOption = ability.options.find(o => o.key === 'hangarUnit');
                const abilityHangarCardId = (configurations[ability.id]?.hangarUnit as string) || (hangarOption?.defaultValue as string);
                const abilityHangarCard = PLAYABLE_CARD_LIBRARY.find(c => c.id === abilityHangarCardId && c.type !== UnitType.SPELL);
                const cooldownLabel = ability.id === 'mothership_command'
                  ? `${Math.ceil(getMothershipCooldownMs() / 1000)}s CD`
                  : `${ability.cooldown}s CD`;
                return (
                  <button
                    key={ability.id}
                    onClick={() => setSelectedId(ability.id)}
                    className={`p-3 border rounded text-left transition flex flex-col gap-1 ${
                      active
                        ? 'border-[#00ccff] bg-[#00ccff]/10 shadow-[0_0_10px_rgba(0,204,255,0.2)]'
                        : 'border-white/10 hover:border-white/30 bg-black/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{ability.name}</span>
                      <span className="text-[10px] px-2 py-1 border border-[#00ccff]/40 text-[#00ccff] rounded uppercase">
                        {ability.badge || 'Core'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-snug">{ability.description}</p>
                    <div className="text-[10px] text-white/50 uppercase flex gap-3 mt-1">
                      <span>{ability.cost}⚡ costo</span>
                      <span>{cooldownLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#050505] border border-[#1a3a5a] rounded p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest">Configuración</div>
                <h4 className="text-2xl font-black text-white">{selectedAbility.name}</h4>
                <p className="text-[11px] text-white/60 max-w-2xl">{selectedAbility.description}</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/50 uppercase">Coste</div>
                <div className="text-[#00ccff] text-xl font-black">{selectedAbility.cost}⚡</div>
                <div className="text-[10px] text-white/50 uppercase">Enfriamiento {displayedCooldown}s</div>
                {selectedAbility.id === 'mothership_command' && (
                  <div className="text-[9px] text-[#00ccff] font-semibold">CD fijo 30s · Genera carga cada {mothershipPayloadSeconds}s</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {selectedAbility.options.map(option => renderOption(option.key))}
            </div>

            {selectedAbility.id === 'emp_overwatch' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div className="p-3 border border-[#00ccff]/30 bg-[#00ccff]/5 rounded">
                  <div className="text-[10px] uppercase text-white/50">Coste</div>
                  <div className="text-xl font-black text-[#00ccff]">{selectedAbility.cost}⚡</div>
                  <div className="text-[10px] uppercase text-white/50">Enfriamiento</div>
                  <div className="text-sm font-bold text-white">{selectedAbility.cooldown}s</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded col-span-2">
                  <div className="text-[10px] uppercase text-white/50">Vista previa</div>
                  <div className="text-lg font-black text-white">{selectedEmpMode.label}</div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">{selectedEmpMode.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/70">
                    <span className="px-2 py-1 border border-white/10 rounded">Radio {EMP_ABILITY_BALANCE.radius}</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Aturdimiento {selectedEmpMode.stunDuration / 1000}s</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Daño {selectedEmpMode.damage}</span>
                  </div>
                </div>
              </div>
            )}
            {selectedAbility.id === 'mothership_command' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div className="p-3 border border-[#00ccff]/30 bg-[#00ccff]/5 rounded">
                  <div className="text-[10px] uppercase text-white/50">Casco</div>
                  <div className="text-xl font-black text-[#00ccff]">{MOTHERSHIP_HP} HP</div>
                  <div className="text-[10px] uppercase text-white/50">Velocidad</div>
                  <div className="text-sm font-bold text-white">{MOTHERSHIP_BALANCE.speed.toFixed(2)} u/tick</div>
                  <div className="text-[10px] uppercase text-white/50">Colisión</div>
                  <div className="text-sm font-bold text-white">{MOTHERSHIP_BALANCE.collisionRadius}px radio</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded col-span-2">
                  <div className="text-[10px] uppercase text-white/50">Carga de hangar</div>
                  <div className="text-lg font-black text-white">
                    {selectedHangarCard ? selectedHangarCard.name : 'Selecciona una tropa'}
                  </div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">
                    {selectedHangarCard ? `Despliega ${selectedHangarCard.count || 1}x ${selectedHangarCard.name} junto a la nave.` : 'Solo admite tropas (sin hechizos).'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/70">
                    <span className="px-2 py-1 border border-white/10 rounded">Coste habilidad {MOTHERSHIP_BALANCE.cost}⚡</span>
                    <span className="px-2 py-1 border border-white/10 rounded">CD fijo {mothershipCooldownSeconds}s</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Genera carga cada {mothershipPayloadSeconds}s</span>
                  </div>
                </div>
              </div>
            )}
            {selectedAbility.id === 'aracno_hive' && selectedAracnoCard && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div className="p-3 border border-[#00ccff]/30 bg-[#00ccff]/5 rounded">
                  <div className="text-[10px] uppercase text-white/50">Estructura</div>
                  <div className="text-lg font-black text-[#00ccff]">Nido Aracno</div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Temporario · {ARACNO_HIVE_ABILITY_BALANCE.cost}⚡ · CD {ARACNO_HIVE_ABILITY_BALANCE.cooldown}s</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/70">
                    <span className="px-2 py-1 border border-white/10 rounded">HP {ARACNO_HIVE_BALANCE.hp}</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Decae {Math.round(ARACNO_HIVE_BALANCE.decayPerSecond)} HP/s</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Intervalo {hiveSpawnIntervalSeconds}s</span>
                    <span className="px-2 py-1 border border-white/10 rounded">Genera 2x {selectedAracnoCard.name}</span>
                  </div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded col-span-2 flex gap-3 items-center">
                  <CardPreview card={selectedAracnoCard} selected size="md" />
                  <div className="flex-1">
                    <div className="text-[10px] uppercase text-white/50">Modo seleccionado</div>
                    <div className="text-lg font-black text-white capitalize">{selectedAracnoModeKey}</div>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">{selectedAracnoCard.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/70">
                      <span className="px-2 py-1 border border-white/10 rounded">HP {selectedAracnoMode.hp}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Daño {selectedAracnoMode.damage}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Vel. {selectedAracnoMode.speed.toFixed(2)}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Alcance {selectedAracnoMode.range}</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Cadencia {selectedAracnoMode.attackSpeed}ms</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Objetivo {selectedAracnoMode.targetPref}</span>
                      {selectedAracnoModeKey === 'kamikaze' && (
                        <span className="px-2 py-1 border border-white/10 rounded">DOT {ARACNO_SPIDER_MODES.kamikaze.dotDuration / 1000}s</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedAbility.id === 'mecha_nexodo' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                <div className="p-3 border border-[#00ccff]/30 bg-[#00ccff]/5 rounded">
                  <div className="text-[10px] uppercase text-white/50">Chasis</div>
                  <div className="text-xl font-black text-[#00ccff]">Mecha Nexodo</div>
                  <div className="text-[10px] uppercase text-white/50">HP extra</div>
                  <div className="text-sm font-bold text-white">+{MECHA_NEXODO_BALANCE.extraHp}</div>
                  <div className="text-[10px] uppercase text-white/50">Láser</div>
                  <div className="text-sm font-bold text-white">{MECHA_NEXODO_BALANCE.laserTickDamage} daño/tick</div>
                </div>
                <div className="p-3 border border-white/10 bg-white/5 rounded col-span-2 flex gap-3 items-center">
                  {selectedMechaPilot ? (
                    <CardPreview card={selectedMechaPilot} selected size="md" />
                  ) : (
                    <div className="h-20 w-20 border border-dashed border-white/20 rounded flex items-center justify-center text-[9px] text-white/40 uppercase">
                      Sin piloto
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-[10px] uppercase text-white/50">Modo seleccionado</div>
                    <div className="text-lg font-black text-white">{MECHA_MODE_DETAILS[selectedMechaModeKey]?.label || 'Escudo'}</div>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">
                      {MECHA_MODE_DETAILS[selectedMechaModeKey]?.hint || 'Selecciona un modo de combate.'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-white/70">
                      <span className="px-2 py-1 border border-white/10 rounded">CD {Math.floor(MECHA_NEXODO_BALANCE.laserCooldownMs / 1000)}s</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Duración {Math.floor(MECHA_NEXODO_BALANCE.laserDurationMs / 1000)}s</span>
                      <span className="px-2 py-1 border border-white/10 rounded">Coste {MECHA_NEXODO_BALANCE.activationCost}⚡</span>
                      {!hasValidMechaPilot && (
                        <span className="px-2 py-1 border border-red-400/40 text-red-300 rounded">Piloto melee individual requerido</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[11px] uppercase tracking-widest border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirm({ id: selectedAbility.id, configuration: currentConfig })}
                className="px-5 py-2 text-[11px] uppercase tracking-widest border border-[#00ccff] text-[#00ccff] hover:bg-[#00ccff] hover:text-black transition rounded font-bold"
              >
                Confirmar selección
              </button>
            </div>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
};

export default SpecialAbilityModal;
