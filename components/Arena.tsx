
import React, { useRef, useEffect, useMemo } from 'react';
import { GameState, Team, TowerType, UnitType } from '../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants';

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

  const drawUnit = (ctx: CanvasRenderingContext2D, unit: any) => {
    const baseColor = unit.color;
    const teamColor = unit.team === Team.PLAYER ? '#00ccff' : '#ff3366';
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = baseColor;
    ctx.lineWidth = 2;

    const size = unit.type === UnitType.AIR ? 12 : 10;
    
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

    ctx.beginPath();
    ctx.strokeStyle = baseColor;
    ctx.fillStyle = '#0a0a0a';

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
    
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = teamColor;
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, p: any) => {
    ctx.shadowBlur = 12;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;

    if (p.style === 'laser') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
      ctx.lineTo(p.x - Math.cos(angle) * 40, p.y - Math.sin(angle) * 40);
      ctx.stroke();
    } else if (p.style === 'missile') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(p.x - (Math.random() * 10), p.y - (Math.random() * 10), 3, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    } else if (p.style === 'beam') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = p.color;
      ctx.setLineDash([2, 2]); 
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.targetX, p.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const centerX = ARENA_WIDTH / 2;
    const bridgeGap = 100;
    const topBridgeY = ARENA_HEIGHT / 2 - 190;
    const botBridgeY = ARENA_HEIGHT / 2 + 190;
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
      if (tower.isDead) return;
      drawTowerAmbience(ctx, tower);
      const color = tower.team === Team.PLAYER ? '#00ccff' : '#ff3366';
      ctx.shadowBlur = tower.locked ? 5 : 25;
      ctx.shadowColor = color;
      ctx.fillStyle = '#050505';
      ctx.strokeStyle = color;
      ctx.lineWidth = tower.locked ? 1 : 4;
      const size = tower.type === TowerType.KING ? 42 : 30;
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
      drawHPBar(ctx, unit.x, unit.y - 25, 28, unit.hp, unit.maxHp);
      if (unit.stunTimer > 0) {
        ctx.save(); ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(unit.x, unit.y, 18, Date.now()/100, Date.now()/100 + Math.PI * 1.5); ctx.stroke();
        ctx.restore();
      }
    });

    state.projectiles.forEach(p => drawProjectile(ctx, p));

    state.effects.forEach(ef => {
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
      } else if (ef.type === 'shockwave') {
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, (1 - opacity) * (ef.radius || 150), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (ef.type === 'muzzle') {
        ctx.beginPath(); ctx.arc(ef.x, ef.y, 22 * (1-opacity), 0, Math.PI*2); ctx.fill();
      } else if (ef.type === 'heal') {
        ctx.font = 'bold 28px monospace'; ctx.fillText('+', ef.x - 8, ef.y - (1 - opacity) * 60);
      } else if (ef.type === 'spark') {
        ctx.beginPath(); ctx.arc(ef.x, ef.y, 4, 0, Math.PI * 2); ctx.fill();
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

  const drawHPBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, max: number) => {
    ctx.save();
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(x - w / 2, y, w, 5);
    const ratio = Math.max(0, hp / max);
    const grad = ctx.createLinearGradient(x - w/2, 0, x + w/2, 0);
    if (ratio > 0.5) { grad.addColorStop(0, '#00ffcc'); grad.addColorStop(1, '#00ccff'); } 
    else if (ratio > 0.2) { grad.addColorStop(0, '#ffcc00'); grad.addColorStop(1, '#ffaa00'); } 
    else { grad.addColorStop(0, '#ff3366'); grad.addColorStop(1, '#ff0000'); }
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, y, w * ratio, 5);
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
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-20"></div>
      <canvas ref={canvasRef} width={ARENA_WIDTH} height={ARENA_HEIGHT} onClick={handleCanvasClick} className="w-full h-auto cursor-crosshair block" />
    </div>
  );
};

export default Arena;
