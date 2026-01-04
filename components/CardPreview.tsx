import React, { useEffect, useMemo, useRef } from 'react';
import { Card, Faction, UnitType } from '../types';

type CardPreviewSize = 'sm' | 'md';

interface CardPreviewProps {
  card: Card;
  size?: CardPreviewSize;
  selected?: boolean;
  hovered?: boolean;
  subdued?: boolean;
  showCost?: boolean;
}

const factionStyles: Record<Faction, { border: string; glow: string; panel: string; accent: string; secondary: string; label: string }> = {
  [Faction.HUMAN]: {
    border: 'border-[#4cc3ff]/50',
    glow: 'shadow-[0_0_25px_rgba(76,195,255,0.35)]',
    panel: 'from-[#0c1a2a] to-[#0a0f17]',
    accent: '#4cc3ff',
    secondary: '#0f2742',
    label: 'Humano'
  },
  [Faction.ANDROID]: {
    border: 'border-[#b17dff]/60',
    glow: 'shadow-[0_0_30px_rgba(177,125,255,0.45)]',
    panel: 'from-[#11051c] to-[#0b0713]',
    accent: '#b17dff',
    secondary: '#1b0b2c',
    label: 'Androide'
  },
  [Faction.ALIEN]: {
    border: 'border-[#5ef28d]/50',
    glow: 'shadow-[0_0_28px_rgba(94,242,141,0.45)]',
    panel: 'from-[#041c11] to-[#07130c]',
    accent: '#5ef28d',
    secondary: '#0d2a1a',
    label: 'Alien'
  }
};

const typeMeta: Record<UnitType, { icon: string; label: string }> = {
  [UnitType.GROUND]: { icon: '⇧', label: 'Ground' },
  [UnitType.AIR]: { icon: '✈', label: 'Air' },
  [UnitType.BUILDING]: { icon: '⌂', label: 'Building' },
  [UnitType.SPELL]: { icon: '✶', label: 'Spell' }
};

const projectileMeta: Record<string, { icon: string; hint: string }> = {
  laser: { icon: '⚡', hint: 'Laser' },
  plasma: { icon: '✶', hint: 'Plasma' },
  missile: { icon: '➤', hint: 'Misil' },
  beam: { icon: '━', hint: 'Haz' },
  none: { icon: '', hint: '' }
};

const sizeMap: Record<CardPreviewSize, number> = { sm: 64, md: 96 };

const CardPreview: React.FC<CardPreviewProps> = ({ card, size = 'md', selected, hovered, subdued, showCost = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faction = useMemo(() => factionStyles[card.faction], [card.faction]);
  const active = selected || hovered;
  const dimension = sizeMap[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimension * dpr;
    canvas.height = dimension * dpr;
    canvas.style.width = `${dimension}px`;
    canvas.style.height = `${dimension}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimension, dimension);
    const center = dimension / 2;
    const sizeUnit = dimension / 4;
    const baseColor = card.color || faction.accent;

    const drawBaseShape = () => {
      ctx.beginPath();
      switch (card.shape) {
        case 'circle':
          ctx.arc(center, center, sizeUnit, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(center - sizeUnit, center - sizeUnit, sizeUnit * 2, sizeUnit * 2);
          break;
        case 'triangle':
          ctx.moveTo(center, center - sizeUnit);
          ctx.lineTo(center + sizeUnit, center + sizeUnit);
          ctx.lineTo(center - sizeUnit, center + sizeUnit);
          ctx.closePath();
          break;
        case 'diamond':
          ctx.moveTo(center, center - sizeUnit);
          ctx.lineTo(center + sizeUnit, center);
          ctx.lineTo(center, center + sizeUnit);
          ctx.lineTo(center - sizeUnit, center);
          ctx.closePath();
          break;
        case 'hexagon':
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = center + sizeUnit * Math.cos(angle);
            const y = center + sizeUnit * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
        case 'cross':
          ctx.rect(center - 2, center - sizeUnit, 4, sizeUnit * 2);
          ctx.rect(center - sizeUnit, center - 2, sizeUnit * 2, 4);
          break;
        case 'star':
          for (let i = 0; i < 5; i++) {
            const outerAngle = ((18 + i * 72) * Math.PI) / 180;
            const innerAngle = ((54 + i * 72) * Math.PI) / 180;
            ctx.lineTo(center + Math.cos(outerAngle) * sizeUnit, center - Math.sin(outerAngle) * sizeUnit);
            ctx.lineTo(center + Math.cos(innerAngle) * (sizeUnit / 2), center - Math.sin(innerAngle) * (sizeUnit / 2));
          }
          ctx.closePath();
          break;
      }
    };

    const fill = card.faction === Faction.ALIEN ? `${baseColor}22` : card.faction === Faction.ANDROID ? `${baseColor}15` : `${baseColor}18`;
    ctx.fillStyle = fill;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    drawBaseShape();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    if (card.faction === Faction.ANDROID) {
      ctx.strokeStyle = `${baseColor}aa`;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(center, center, sizeUnit * 1.05, 0, Math.PI * 2);
      ctx.stroke();
    } else if (card.faction === Faction.ALIEN) {
      ctx.strokeStyle = `${baseColor}99`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center, center, sizeUnit * 0.7, Math.PI * 0.2, Math.PI * 1.6);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `${baseColor}55`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, sizeUnit * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    if (card.type === UnitType.AIR) {
      ctx.save();
      ctx.strokeStyle = `${baseColor}aa`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center - sizeUnit * 0.8, center + sizeUnit * 0.4);
      ctx.quadraticCurveTo(center, center - sizeUnit * 0.8, center + sizeUnit * 0.8, center + sizeUnit * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    if (card.type === UnitType.BUILDING) {
      ctx.save();
      ctx.strokeStyle = `${baseColor}bb`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center - sizeUnit * 0.6, center + sizeUnit * 0.6);
      ctx.lineTo(center - sizeUnit * 0.6, center - sizeUnit * 0.3);
      ctx.lineTo(center, center - sizeUnit * 0.8);
      ctx.lineTo(center + sizeUnit * 0.6, center - sizeUnit * 0.3);
      ctx.lineTo(center + sizeUnit * 0.6, center + sizeUnit * 0.6);
      ctx.stroke();
      ctx.restore();
    }

    if (card.type === UnitType.SPELL) {
      ctx.save();
      ctx.strokeStyle = `${baseColor}cc`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(center, center, sizeUnit * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (active) {
      ctx.save();
      ctx.strokeStyle = `${baseColor}aa`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, sizeUnit * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [card, dimension, faction, active]);

  const projectile = projectileMeta[card.projectileType] || projectileMeta.none;

  return (
    <div
      className={`relative rounded-lg border ${faction.border} bg-gradient-to-br ${faction.panel} transition-all duration-200 overflow-hidden ${
        active ? `shadow-inner ${faction.glow}` : ''
      } ${subdued ? 'opacity-70' : ''}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 blur-xl opacity-0 transition-opacity duration-200 ${
          active ? 'opacity-40' : ''
        }`}
        style={{ background: `radial-gradient(circle at 50% 50%, ${faction.accent}33, transparent 60%)` }}
      />
      <div className="relative p-2 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[9px] uppercase leading-none">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 bg-black/20">
            <span className="text-[10px]">{card.faction === Faction.ALIEN ? '☣' : card.faction === Faction.ANDROID ? '◇' : '✪'}</span>
            <span className="text-white/80">{faction.label}</span>
            {card.faction === Faction.ALIEN && card.alienSubtype && (
              <span className="text-[8px] text-[#7bf3a2] font-semibold ml-1">{card.alienSubtype.toLowerCase()}</span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/80 flex items-center gap-1">
              <span className="text-[10px]">{typeMeta[card.type].icon}</span>
              <span>{typeMeta[card.type].label}</span>
            </span>
            {showCost && (
              <span className="px-2 py-1 rounded-full bg-black/40 border border-white/10 text-white font-black">
                {card.cost}⚡
              </span>
            )}
          </span>
        </div>

        <div className="relative flex items-center justify-center">
          <canvas ref={canvasRef} className="rounded-md bg-black/30 border border-white/5" />
          {projectile.icon && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] text-white/80 flex items-center gap-1">
              <span>{projectile.icon}</span>
              <span className="uppercase tracking-tight">{projectile.hint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardPreview;
