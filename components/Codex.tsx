
import React from 'react';
import { Card, UnitType } from '../types';
import { CARD_LIBRARY } from '../constants';

interface CodexProps {
  onClose: () => void;
}

const Codex: React.FC<CodexProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/95 z-[100] p-10 flex flex-col items-center">
      <div className="w-full max-w-6xl flex justify-between items-center mb-10 border-b border-[#00ccff]/30 pb-4">
        <h2 className="text-4xl font-black text-[#00ccff] tracking-tighter">CODEX DE UNIDADES</h2>
        <button 
          onClick={onClose}
          className="px-6 py-2 border border-[#ff3366] text-[#ff3366] hover:bg-[#ff3366] hover:text-white transition uppercase font-bold"
        >
          Cerrar
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-4 scrollbar-hide">
        {CARD_LIBRARY.map(card => (
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
