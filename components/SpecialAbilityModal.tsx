import React, { useEffect, useMemo, useState } from 'react';
import { SPECIAL_ABILITIES, createDefaultAbilityConfig, findAbilityById } from '../constants';
import { SelectedSpecialAbility } from '../types';

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
    <div className="fixed inset-0 bg-black/95 z-[200] p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <span>{ability.cooldown}s CD</span>
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
              <div className="text-[10px] text-white/50 uppercase">Enfriamiento {selectedAbility.cooldown}s</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {selectedAbility.options.map(option => renderOption(option.key))}
          </div>

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
  );
};

export default SpecialAbilityModal;
