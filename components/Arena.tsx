
import React, { useRef, useEffect, useMemo } from 'react';
import { AlienSubtype, Faction, GameState, GameUnit, ProjectileStyle, Team, TowerType, UnitType } from '../types';
import { ARENA_WIDTH, ARENA_HEIGHT, BRIDGE_GAP_HALF, BRIDGE_TOP_Y, BRIDGE_BOTTOM_Y, BRIDGE_X, MECHA_NEXODO_BALANCE } from '../constants';

interface ArenaProps {
  state: GameState;
  onDeploy: (x: number, y: number) => void;
  dragPreview?: {
    x: number;
    y: number;
    cardRange: number;
    color: string;
    isValid: boolean;
  } | null;
  onBoundsChange?: (rect: DOMRect) => void;
}

const Arena: React.FC<ArenaProps> = ({ state, onDeploy, dragPreview, onBoundsChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSuddenDeath = state.arenaState === 'sudden_death';

  const starField = useMemo(() => {
    return Array.from({ length: 120 }).map(() => ({
      x: Math.random() * ARENA_WIDTH,
      y: Math.random() * ARENA_HEIGHT,
      size: Math.random() * 2,
      speed: 0.02 + Math.random() * 0.05,
      opacity: 0.2 + Math.random() * 0.8,
      hue: Math.random() > 0.8 ? (Math.random() > 0.5 ? 280 : 200) : 0 
    }));
  }, []);

  const glowingHexes = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      id: Math.random(),
      x: Math.random() * ARENA_WIDTH,
      y: Math.random() * ARENA_HEIGHT,
      timer: Math.random() * 2000
    }));
  }, []);

  const drawUnit = (ctx: CanvasRenderingContext2D, unit: GameUnit) => {
    const baseColor = unit.color;
    const teamColor = unit.team === Team.PLAYER ? '#00ccff' : '#ff3366';
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = baseColor;
    ctx.lineWidth = 2;

    const size = unit.isMothership ? 18 : (unit.type === UnitType.AIR ? 12 : 10);
    
    ctx.save();
    ctx.translate(unit.x, unit.y);

    if (unit.isOverclocked) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.rotate(Date.now() / 500);
        ctx.beginPath();
        ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (unit.type === UnitType.AIR) {
        ctx.translate(0, Math.sin(Date.now() / 300) * 5);
    }

    if (unit.isMecha && unit.mechaMode === 'shield' && (unit.mechaHp ?? 0) > 0) {
      const pulse = 0.6 + Math.sin(Date.now() / 180) * 0.4;
      const orbitRadius = size + 12 + pulse * 3;
      ctx.save();
      ctx.strokeStyle = MECHA_NEXODO_BALANCE.shieldColor;
      ctx.lineWidth = 2 + pulse * 1.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = MECHA_NEXODO_BALANCE.shieldColor;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const orbitCount = 6;
      for (let i = 0; i < orbitCount; i++) {
        const angle = Date.now() / 500 + (i * Math.PI * 2) / orbitCount;
        const ox = Math.cos(angle) * orbitRadius;
        const oy = Math.sin(angle) * orbitRadius;
        ctx.beginPath();
        ctx.fillStyle = `${MECHA_NEXODO_BALANCE.shieldColor}cc`;
        ctx.arc(ox, oy, 2 + pulse, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (unit.isMothership) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, size + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const drawBaseShape = () => {
      ctx.beginPath();
      switch (unit.shape) {
        case 'circle': ctx.arc(0, 0, size, 0, Math.PI * 2); break;
        case 'square': ctx.rect(-size, -size, size * 2, size * 2); break;
        case 'triangle':
          ctx.moveTo(0, -size);
          ctx.lineTo(-size, size);
          ctx.lineTo(size, size);
          ctx.closePath();
          break;
        case 'diamond':
          ctx.moveTo(0, -size);
          ctx.lineTo(size, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size, 0);
          ctx.closePath();
          break;
        case 'hexagon':
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            ctx.lineTo(size * Math.cos(angle), size * Math.sin(angle));
          }
          ctx.closePath();
          break;
        case 'cross':
          ctx.rect(-1.5, -size, 3, size * 2);
          ctx.rect(-size, -1.5, size * 2, 3);
          break;
        case 'star':
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) / 180 * Math.PI) * size, -Math.sin((18 + i * 72) / 180 * Math.PI) * size);
            ctx.lineTo(Math.cos((54 + i * 72) / 180 * Math.PI) * (size/2), -Math.sin((54 + i * 72) / 180 * Math.PI) * (size/2));
          }
          ctx.closePath();
          break;
      }
    };

    const drawHumanoidSilhouette = () => {
      ctx.strokeStyle = baseColor;
      ctx.fillStyle = '#0a0a0a';
      drawBaseShape();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = `${baseColor}77`;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.75, Math.PI * 0.1, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();
    };

    const drawAndroidSilhouette = () => {
      ctx.strokeStyle = baseColor;
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.05);
      ctx.lineTo(size * 0.95, -size * 0.35);
      ctx.lineTo(size * 0.75, size * 0.15);
      ctx.lineTo(size * 0.7, size * 0.9);
      ctx.lineTo(0, size * 1.1);
      ctx.lineTo(-size * 0.7, size * 0.9);
      ctx.lineTo(-size * 0.75, size * 0.15);
      ctx.lineTo(-size * 0.95, -size * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = `${baseColor}88`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(-size * 0.85, -size * 0.05);
      ctx.lineTo(size * 0.85, size * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, -size * 0.95);
      ctx.lineTo(-size * 0.35, size * 0.65);
      ctx.moveTo(size * 0.25, -size * 0.9);
      ctx.lineTo(size * 0.35, size * 0.65);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, size * 0.25);
      ctx.lineTo(-size * 0.1, size * 0.55);
      ctx.lineTo(size * 0.45, size * 0.2);
      ctx.stroke();
      ctx.restore();
    };

    const drawAracnidSilhouette = () => {
      ctx.strokeStyle = baseColor;
      ctx.fillStyle = '#060606';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i;
        const radius = i % 2 === 0 ? size * 1.12 : size * 0.62;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = `${baseColor}99`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + Math.PI / 8;
        ctx.beginPath();
        ctx.quadraticCurveTo(
          Math.cos(angle) * size * 0.6,
          Math.sin(angle) * size * 0.6,
          Math.cos(angle + Math.PI / 8) * size * 0.95,
          Math.sin(angle + Math.PI / 8) * size * 0.95
        );
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawHumanoidAlienSilhouette = () => {
      ctx.strokeStyle = baseColor;
      ctx.fillStyle = '#050506';
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.1);
      ctx.bezierCurveTo(size * 0.9, -size * 0.6, size * 0.9, size * 0.2, 0, size * 1.05);
      ctx.bezierCurveTo(-size * 0.9, size * 0.2, -size * 0.9, -size * 0.6, 0, -size * 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = `${baseColor}77`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const offset = -size * 0.45 + i * size * 0.45;
        ctx.beginPath();
        ctx.arc(0, offset, size * (0.85 - i * 0.15), Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawSlimoidSilhouette = () => {
      ctx.strokeStyle = baseColor;
      ctx.fillStyle = '#040605';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.9);
      ctx.quadraticCurveTo(size * 0.95, -size * 0.35, size * 0.7, size * 0.15);
      ctx.quadraticCurveTo(size * 0.5, size * 1.05, 0, size * 1.2);
      ctx.quadraticCurveTo(-size * 0.55, size * 0.95, -size * 0.8, size * 0.15);
      ctx.quadraticCurveTo(-size * 1.05, -size * 0.55, 0, -size * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.fillStyle = `${baseColor}55`;
      for (let i = 0; i < 3; i++) {
        const angle = Math.PI * (0.2 + 0.3 * i);
        const dist = size * (0.7 + 0.1 * i);
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle) * dist * 0.4,
          Math.sin(angle) * dist * 0.2 + size * 0.4,
          size * 0.25,
          size * 0.35,
          angle / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    };

    const drawAlienSilhouette = () => {
      if (unit.alienSubtype === AlienSubtype.ARACNID) return drawAracnidSilhouette();
      if (unit.alienSubtype === AlienSubtype.SLIMOID) return drawSlimoidSilhouette();
      return drawHumanoidAlienSilhouette();
    };

    const drawSpellSilhouette = () => {
      const haloRadius = size * 2.2;
      const gradient = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, haloRadius);
      gradient.addColorStop(0, `${baseColor}66`);
      gradient.addColorStop(1, `${baseColor}00`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2.4;
      ctx.shadowBlur = 24;
      ctx.shadowColor = baseColor;
      const shape = unit.spellShape || 'concentric';

      if (shape === 'concentric') {
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.setLineDash(i === 2 ? [4, 6] : []);
          ctx.lineDashOffset = Date.now() / (180 + i * 60);
          ctx.arc(0, 0, size * (0.8 + i * 0.55), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else if (shape === 'runes') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          ctx.lineTo(Math.cos(angle) * size * 1.4, Math.sin(angle) * size * 1.4);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.save();
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = Math.cos(angle) * size * 1.4;
          const py = Math.sin(angle) * size * 1.4;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px * 0.6, py * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px * 0.9, py * 0.9);
          ctx.lineTo(px * 0.95 + 2, py * 0.95 - 2);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.save();
        const wobble = Math.sin(Date.now() / 220) * 0.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.8, size * (1 + wobble), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * (0.6 + wobble * 0.5), Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-size * 1.6, 0);
        ctx.quadraticCurveTo(0, size * 0.7, size * 1.6, 0);
        ctx.quadraticCurveTo(0, -size * 0.7, -size * 1.6, 0);
        ctx.stroke();
        ctx.restore();
      }
    };

    if (unit.type === UnitType.SPELL) {
      drawSpellSilhouette();
    } else if (unit.visualFamily === 'ciber') {
      drawAndroidSilhouette();
    } else if (unit.visualFamily === 'organico') {
      drawAlienSilhouette();
    } else {
      drawHumanoidSilhouette();
    }

    if (unit.isMecha) {
      ctx.save();
      ctx.strokeStyle = MECHA_NEXODO_BALANCE.frameColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 16;
      ctx.shadowColor = MECHA_NEXODO_BALANCE.frameColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = (size + 6) * Math.cos(angle);
        const hy = (size + 6) * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.fillStyle = teamColor;
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, p: any) => {
    const faction: Faction = p.faction || Faction.HUMAN;
    const style: ProjectileStyle = p.style;
    const isAirOrigin = p.originUnitType === UnitType.AIR;
    const sizeBase = style === 'missile' ? 6 : style === 'beam' ? 3 : 4;
    const wobble = (offset: number, amp: number) => Math.sin(Date.now() / 180 + offset) * amp;

    const renderTrail = () => {
      if (style === 'missile') {
        ctx.save();
        ctx.globalAlpha = 0.5;
        const tailLength = isAirOrigin ? 18 : 14;
        const gradient = ctx.createLinearGradient(p.x, p.y, p.x - tailLength, p.y + wobble(1, 2));
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 3);
        ctx.lineTo(p.x - tailLength, p.y + wobble(2, 1.5) - 5);
        ctx.lineTo(p.x - tailLength * 0.8, p.y + wobble(3, 1.5) + 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (style === 'plasma') {
        ctx.save();
        ctx.globalAlpha = 0.6;
        const pulse = 0.8 + Math.sin(Date.now() / 120) * 0.2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sizeBase * 1.4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}55`;
        ctx.fill();
        ctx.restore();
      }

      if (style === 'beam') {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.targetX, p.targetY);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 3; i++) {
          const phase = Date.now() / 200 + i * 1.7;
          const t = (Math.sin(phase) * 0.5 + 0.5);
          const ix = p.x + (p.targetX - p.x) * t;
          const iy = p.y + (p.targetY - p.y) * t;
          ctx.beginPath();
          ctx.arc(ix, iy, 1 + Math.random() * 1.2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    const renderShape = () => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      const size = sizeBase + (isAirOrigin ? 1 : 0);

      if (style === 'laser') {
        if (faction === Faction.ANDROID) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-32, 0);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff88';
          ctx.beginPath();
          ctx.moveTo(-8, -2);
          ctx.lineTo(-24, 2);
          ctx.stroke();
        } else if (faction === Faction.ALIEN) {
          ctx.beginPath();
          ctx.ellipse(0, 0, size + 2, size * 0.8 + wobble(0, 0.4), 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(-size, wobble(1, 0.8), size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-28, 0);
          ctx.stroke();
        }
      } else if (style === 'missile') {
        if (faction === Faction.ANDROID) {
          ctx.beginPath();
          ctx.moveTo(size + 2, 0);
          ctx.lineTo(-size - 4, -size / 1.8);
          ctx.lineTo(-size - 4, size / 1.8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0ff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-size - 4, -size / 1.2);
          ctx.lineTo(-size - 8, 0);
          ctx.lineTo(-size - 4, size / 1.2);
          ctx.stroke();
        } else if (faction === Faction.ALIEN) {
          ctx.beginPath();
          ctx.moveTo(size + 3, 0);
          ctx.quadraticCurveTo(-size * 0.3, -size * 1.4 + wobble(2, 1.2), -size - 4, 0);
          ctx.quadraticCurveTo(-size * 0.3, size * 1.4 + wobble(3, 1.2), size + 3, 0);
          ctx.fill();
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(-size / 2, wobble(1, 0.6), size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(size, 0);
          ctx.lineTo(-size, -size / 2);
          ctx.lineTo(-size, size / 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff8';
          ctx.stroke();
        }
      } else if (style === 'beam') {
        if (faction === Faction.ANDROID) {
          ctx.fillStyle = p.color;
          ctx.fillRect(-28, -2, 32, 4);
          ctx.fillStyle = '#ffffffaa';
          ctx.fillRect(-18, -1, 14, 2);
        } else if (faction === Faction.ALIEN) {
          ctx.beginPath();
          ctx.ellipse(-10, 0, size * 1.6, size * 0.9 + wobble(0, 0.4), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `${p.color}88`;
          ctx.beginPath();
          ctx.ellipse(4, wobble(1, 0.4), size, size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-24, 0);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#ffffff66';
          ctx.beginPath();
          ctx.moveTo(-6, -1);
          ctx.lineTo(-18, 1);
          ctx.stroke();
        }
      } else {
        if (faction === Faction.ANDROID) {
          ctx.beginPath();
          ctx.rect(-size, -size / 1.4, size * 2.2, size * 1.4);
          ctx.fill();
          ctx.strokeStyle = '#0ff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (faction === Faction.ALIEN) {
          ctx.beginPath();
          ctx.ellipse(0, wobble(0, 0.5), size * 1.2, size, wobble(1, 0.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(-size * 0.4, wobble(2, 0.6), size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    renderTrail();
    renderShape();
    ctx.shadowBlur = 0;
  };

  const drawHexGrid = (ctx: CanvasRenderingContext2D) => {
    const time = Date.now();
    const size = 60;
    const h = size * Math.sqrt(3);
    const w = size * 2;
    
    ctx.save();
    ctx.strokeStyle = '#0a1a2a';
    ctx.lineWidth = 0.5;
    
    ctx.beginPath();
    for (let y = -h; y < ARENA_HEIGHT + h; y += h * 0.5) {
      for (let x = -w; x < ARENA_WIDTH + w; x += w * 0.75) {
        const cx = x + (Math.floor(y/(h*0.5)) % 2 === 0 ? 0 : w * 0.375);
        const cy = y;
        
        ctx.moveTo(cx + size, cy);
        for (let i = 1; i <= 6; i++) {
          const angle = (Math.PI / 3) * i;
          ctx.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
        }
      }
    }
    ctx.stroke();

    glowingHexes.forEach(gh => {
        const opacity = (Math.sin((time + gh.timer) / 1000) * 0.5 + 0.5) * 0.15;
        if (opacity > 0.05) {
            ctx.fillStyle = `rgba(0, 204, 255, ${opacity})`;
            ctx.beginPath();
            const gx = gh.x - (gh.x % (w*0.75));
            const gy = gh.y - (gh.y % (h*0.5));
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                ctx.lineTo(gx + size * Math.cos(angle), gy + size * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
        }
    });
    ctx.restore();
  };

  const drawBridgeAmbience = (ctx: CanvasRenderingContext2D, y: number) => {
    const time = Date.now();
    const centerX = ARENA_WIDTH / 2;
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const seed = i * 2345.6;
      const offX = (Math.sin(time / 1000 + seed) * 45);
      const offY = (Math.cos(time / 1200 + seed) * 55);
      const opacity = (Math.sin(time / 600 + seed) * 0.5 + 0.5) * 0.6;
      const size = Math.random() * 2 + 1;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#00ffff';
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#00ffff';
      ctx.beginPath();
      ctx.arc(centerX + offX, y + offY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawPlasmaBarrier = (ctx: CanvasRenderingContext2D) => {
    const centerX = BRIDGE_X;
    const bridgeGap = BRIDGE_GAP_HALF;
    const topBridgeY = BRIDGE_TOP_Y;
    const botBridgeY = BRIDGE_BOTTOM_Y;
    const time = Date.now();
    const pulse = Math.sin(time / 150) * 0.2 + 0.8;
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    const drawSection = (start: number, end: number) => {
      ctx.beginPath();
      ctx.setLineDash([2, 10]);
      ctx.lineDashOffset = -time / 50;
      ctx.moveTo(centerX, start);
      ctx.lineTo(centerX, end);
      ctx.globalAlpha = 0.05 * pulse;
      ctx.lineWidth = 15;
      ctx.stroke();
      ctx.globalAlpha = 0.4 * pulse;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawSection(0, topBridgeY - bridgeGap);
    drawSection(topBridgeY + bridgeGap, botBridgeY - bridgeGap);
    drawSection(botBridgeY + bridgeGap, ARENA_HEIGHT);
    ctx.setLineDash([]);
    ctx.restore();
    const drawBridge = (y: number) => {
        ctx.save();
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ccff';
        ctx.strokeRect(centerX - 50, y - 60, 100, 120);
        ctx.fillStyle = 'rgba(0, 204, 255, 0.05)';
        ctx.fillRect(centerX - 50, y - 60, 100, 120);
        ctx.beginPath();
        ctx.lineWidth = 0.5;
        ctx.setLineDash([10, 5]);
        ctx.moveTo(centerX - 50, y); ctx.lineTo(centerX + 50, y);
        ctx.moveTo(centerX, y - 60); ctx.lineTo(centerX, y + 60);
        ctx.stroke();
        ctx.setLineDash([]);
        const offset = (time / 20) % 50;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(centerX - 40 + offset, y - 10);
        ctx.lineTo(centerX - 30 + offset, y);
        ctx.lineTo(centerX - 40 + offset, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + 40 - offset, y - 10);
        ctx.lineTo(centerX + 30 - offset, y);
        ctx.lineTo(centerX + 40 - offset, y + 10);
        ctx.stroke();
        ctx.restore();
        drawBridgeAmbience(ctx, y);
    };
    drawBridge(topBridgeY);
    drawBridge(botBridgeY);
  };

  const drawStars = (ctx: CanvasRenderingContext2D) => {
    const time = Date.now();
    starField.forEach((star, i) => {
        const x = (star.x + time * star.speed) % ARENA_WIDTH;
        const twinkle = Math.sin(time / 500 + i) * 0.5 + 0.5;
        ctx.fillStyle = star.hue === 0 
            ? `rgba(255, 255, 255, ${star.opacity * twinkle})`
            : `hsla(${star.hue}, 100%, 70%, ${star.opacity * twinkle})`;
        ctx.beginPath();
        ctx.arc(x, star.y, star.size * (0.8 + twinkle * 0.4), 0, Math.PI * 2);
        ctx.fill();
        if (star.size > 1.5) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
  };

  const drawScanlines = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.02;
    ctx.lineWidth = 1;
    const offset = (Date.now() / 40) % 30;
    for (let y = offset; y < ARENA_HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawTowerAmbience = (ctx: CanvasRenderingContext2D, tower: any) => {
    if (tower.isDead) return;
    const time = Date.now();
    const color = tower.team === Team.PLAYER ? '#00ccff' : '#ff3366';
    const pulse = Math.sin(time / 500) * 0.3 + 0.7;
    const size = tower.type === TowerType.KING ? 42 : 30;
    ctx.save();
    const gradient = ctx.createRadialGradient(tower.x, tower.y, size * 0.5, tower.x, tower.y, size * 2.5);
    gradient.addColorStop(0, color + '44');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (!tower.locked) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, size * 1.8, time / 1000, time / 1000 + Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
  };

  const drawTowerRuin = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    accentColor: string
  ) => {
    const time = Date.now();
    const baseColor = '#1b1716';
    const scorchColor = '#2d2422';
    ctx.save();
    const gradient = ctx.createRadialGradient(x, y, size * 0.2, x, y, size * 1.8);
    gradient.addColorStop(0, `${baseColor}ee`);
    gradient.addColorStop(0.55, `${scorchColor}cc`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${accentColor}55`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(x, y, size * 1.05, time / 1200, time / 1200 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#2a2120';
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.sin(time / 800 + i) * 0.2;
      const dist = size * (0.35 + (i % 2) * 0.25);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
      ctx.lineTo(x + Math.cos(angle + 0.4) * (dist + size * 0.4), y + Math.sin(angle + 0.4) * (dist + size * 0.4));
      ctx.lineTo(x + Math.cos(angle - 0.5) * (dist + size * 0.25), y + Math.sin(angle - 0.5) * (dist + size * 0.25));
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + 0.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * size * 0.2, y + Math.sin(angle) * size * 0.2);
      ctx.lineTo(x + Math.cos(angle) * size * 1.2, y + Math.sin(angle) * size * 1.2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    ctx.fillStyle = '#01050a';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    drawStars(ctx);
    drawHexGrid(ctx);
    drawScanlines(ctx);
    const vignette = ctx.createRadialGradient(ARENA_WIDTH/2, ARENA_HEIGHT/2, 100, ARENA_WIDTH/2, ARENA_HEIGHT/2, ARENA_WIDTH * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    drawPlasmaBarrier(ctx);

    state.towers.forEach(tower => {
      const color = tower.team === Team.PLAYER ? '#00ccff' : '#ff3366';
      const size = tower.type === TowerType.KING ? 42 : 30;
      if (tower.isDead) {
        drawTowerRuin(ctx, tower.x, tower.y, size * 1.1, color);
        return;
      }
      drawTowerAmbience(ctx, tower);
      ctx.shadowBlur = tower.locked ? 5 : 25;
      ctx.shadowColor = color;
      ctx.fillStyle = '#050505';
      ctx.strokeStyle = color;
      ctx.lineWidth = tower.locked ? 1 : 4;
      ctx.save();
      ctx.translate(tower.x, tower.y);
      if (!tower.locked) {
        ctx.rotate(Date.now() / 2500 * (tower.team === Team.PLAYER ? 1 : -1));
      }
      ctx.beginPath();
      if (tower.type === TowerType.KING) {
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, size * 0.7, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI*2); ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now()/200)*0.5; ctx.fill(); ctx.globalAlpha = 1.0;
      } else {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          ctx.lineTo(size * Math.cos(angle), size * Math.sin(angle));
        }
        ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      if (tower.locked) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText('ENCRYPTED', tower.x, tower.y + 4);
      }
      drawHPBar(ctx, tower.x, tower.y - size - 25, size * 2.2, tower.hp, tower.maxHp);
      ctx.shadowBlur = 0;
    });

    state.units.forEach(unit => {
      if (unit.isDead) return;
      drawUnit(ctx, unit);
      drawHPBar(ctx, unit.x, unit.y - 25, 28, unit.hp, unit.maxHp, unit.mechaHp ?? 0, unit.mechaMaxHp ?? 0);
      if (unit.stunTimer > 0) {
        ctx.save(); ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(unit.x, unit.y, 18, Date.now()/100, Date.now()/100 + Math.PI * 1.5); ctx.stroke();
        ctx.restore();
      }
    });

    state.projectiles.forEach(p => drawProjectile(ctx, p));

    state.effects.forEach(ef => {
      // Los futuros estados de arena (clima/bioma) podrían agregar estilos aquí sin modificar la lógica de unidades.
      const opacity = ef.timer / ef.maxTimer;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = ef.color;
      ctx.strokeStyle = ef.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = ef.color;
      
      if (ef.type === 'explosion') {
        const baseRadius = ef.radius || 80;
        ctx.beginPath(); ctx.arc(ef.x, ef.y, (1 - opacity) * baseRadius, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(ef.x, ef.y, (1 - opacity) * (baseRadius * 0.5), 0, Math.PI * 2); ctx.fill();
      } else if (ef.type === 'tower_ruin') {
        const accentColor = ef.sourceFaction === Faction.ANDROID ? '#ff3366' : '#00ccff';
        const size = (ef.radius || 48) * 0.7;
        ctx.globalAlpha = 0.85;
        drawTowerRuin(ctx, ef.x, ef.y, size, accentColor);
      } else if (ef.type === 'shockwave') {
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, (1 - opacity) * (ef.radius || 150), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (ef.type === 'muzzle') {
        const pulse = (1 - opacity);
        const styleHint: ProjectileStyle | undefined = (ef as any).sourceStyle;
        if (styleHint === 'beam' || styleHint === 'laser') {
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ef.x, ef.y, 16 * pulse, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(ef.x, ef.y, 8 * pulse, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(ef.x, ef.y, 22 * pulse, 0, Math.PI*2); ctx.fill();
        }
      } else if (ef.type === 'heal') {
        ctx.font = 'bold 28px monospace'; ctx.fillText('+', ef.x - 8, ef.y - (1 - opacity) * 60);
      } else if (ef.type === 'spark') {
        const variant = (ef as any).variant || ((ef as any).sourceFaction === Faction.ALIEN ? 'bio' : (ef as any).sourceFaction === Faction.ANDROID ? 'ionic' : 'ember');
        if (variant === 'ionic') {
          ctx.save();
          ctx.strokeStyle = ef.color;
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + Date.now() / 200;
            const len = 10 + Math.random() * 6;
            ctx.beginPath();
            ctx.moveTo(ef.x, ef.y);
            ctx.lineTo(ef.x + Math.cos(angle) * len, ef.y + Math.sin(angle) * len);
            ctx.stroke();
          }
          ctx.restore();
        } else if (variant === 'bio') {
          ctx.save();
          ctx.fillStyle = ef.color;
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 2 + Math.random() * 3;
            const dist = 3 + Math.random() * 8;
            ctx.beginPath();
            ctx.ellipse(ef.x + Math.cos(angle) * dist, ef.y + Math.sin(angle) * dist, radius, radius * 1.4, Math.random(), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(ef.x, ef.y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ffffffaa';
          ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const len = 8 + Math.random() * 6;
            ctx.beginPath();
            ctx.moveTo(ef.x, ef.y);
            ctx.lineTo(ef.x + Math.cos(angle) * len, ef.y + Math.sin(angle) * len);
            ctx.stroke();
          }
        }
      } else if (ef.type === 'emp_wave') {
        const radius = ef.radius || 400;
        ctx.beginPath(); ctx.arc(ef.x, ef.y, (1 - opacity) * radius, 0, Math.PI * 2); ctx.lineWidth = 10; ctx.stroke();
      } else if (ef.type === 'healing_field') {
        // Renderizado de la Matriz de Sanación (Verde Lima + Partículas)
        const time = Date.now();
        const radius = ef.radius || 180;
        
        // Circunferencia base neón
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#32cd32';
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -time / 50;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Partículas orbitales verde lima
        for (let i = 0; i < 12; i++) {
          const angle = (time / 1000) + (i * Math.PI * 2 / 12);
          const px = ef.x + Math.cos(angle) * radius;
          const py = ef.y + Math.sin(angle) * radius;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#32cd32';
          ctx.fill();
        }

        // Centro brillante
        ctx.globalAlpha = 0.1 * opacity;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (ef.type === 'laser_beam' && ef.startX !== undefined && ef.startY !== undefined) {
        ctx.lineWidth = 15 * opacity;
        ctx.strokeStyle = ef.color;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.moveTo(ef.startX, ef.startY);
        ctx.lineTo(ef.x, ef.y);
        ctx.stroke();
        
        ctx.lineWidth = 4 * opacity;
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(ef.startX, ef.startY);
        ctx.lineTo(ef.x, ef.y);
        ctx.stroke();
      } else if (ef.type === 'glitch') {
        const jitter = 6 + Math.random() * 12;
        const flicker = 0.15 + opacity * 0.25;
        const scatter = 2 + Math.random() * 4;
        ctx.globalAlpha = flicker;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255, 80, 80, 0.35)';
        for (let i = 0; i < 6; i++) {
          const dx = (Math.random() - 0.5) * jitter;
          const dy = (Math.random() - 0.5) * jitter;
          const size = (ef.radius || 18) * (0.3 + Math.random() * 0.5);
          ctx.fillRect(ef.x + dx, ef.y + dy, size / 2, size / 4);
          ctx.beginPath();
          ctx.arc(ef.x + dx * scatter, ef.y + dy * scatter, size / 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    });

    if (dragPreview) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = dragPreview.isValid ? `${dragPreview.color}33` : 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = dragPreview.isValid ? dragPreview.color : '#ff3366';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(dragPreview.x, dragPreview.y, dragPreview.cardRange, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  };

  const drawHPBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    hp: number,
    max: number,
    mechaHp = 0,
    mechaMaxHp = 0
  ) => {
    ctx.save();
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(x - w / 2, y, w, 5);
    const baseRatio = Math.max(0, hp / max);
    const baseGrad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    if (baseRatio > 0.5) { baseGrad.addColorStop(0, '#00ffcc'); baseGrad.addColorStop(1, '#00ccff'); } 
    else if (baseRatio > 0.2) { baseGrad.addColorStop(0, '#ffcc00'); baseGrad.addColorStop(1, '#ffaa00'); } 
    else { baseGrad.addColorStop(0, '#ff3366'); baseGrad.addColorStop(1, '#ff0000'); }
    const totalMax = max + Math.max(0, mechaMaxHp);
    if (mechaMaxHp > 0 && totalMax > 0) {
      const baseWidth = w * (max / totalMax);
      const mechaWidth = w - baseWidth;
      ctx.fillStyle = baseGrad;
      ctx.fillRect(x - w / 2, y, baseWidth * baseRatio, 5);
      const mechaRatio = Math.max(0, mechaHp / mechaMaxHp);
      ctx.fillStyle = MECHA_NEXODO_BALANCE.shieldColor;
      ctx.fillRect(x - w / 2 + baseWidth, y, mechaWidth * mechaRatio, 5);
    } else {
      ctx.fillStyle = baseGrad;
      ctx.fillRect(x - w / 2, y, w * baseRatio, 5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, 5);
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frameId: number;
    const render = () => { draw(ctx); frameId = requestAnimationFrame(render); };
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [state, dragPreview]);

  useEffect(() => {
    if (!canvasRef.current || !onBoundsChange) return;
    const updateBounds = () => {
      if (canvasRef.current && onBoundsChange) {
        onBoundsChange(canvasRef.current.getBoundingClientRect());
      }
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [onBoundsChange]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (ARENA_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (ARENA_HEIGHT / rect.height);
    onDeploy(x, y);
  };

  return (
    <div className="relative border-4 border-[#1a3a5a] bg-[#020202] shadow-[0_0_150px_rgba(0,204,255,0.15)] rounded-2xl overflow-hidden transition-all duration-700">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] z-10 opacity-40"></div>
      {isSuddenDeath && (
        <div className="absolute inset-0 pointer-events-none bg-red-900/25 mix-blend-screen z-30 animate-pulse" style={{ animationDuration: '2.4s' }}></div>
      )}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-20"></div>
      <canvas ref={canvasRef} width={ARENA_WIDTH} height={ARENA_HEIGHT} onClick={handleCanvasClick} className="w-full h-auto cursor-crosshair block" />
    </div>
  );
};

export default Arena;
