import { AttackKind, Card, GameUnit, Projectile, ProjectileStyle } from '../../types';

export const SPORE_CARD_PATTERN = /(spore|spora|venom|venen|poison|toxin)/i;

export const inferAttackKindFromStyle = (style?: ProjectileStyle): AttackKind => {
  if (style === 'none') return 'melee';
  if (style === 'laser' || style === 'beam') return 'laser';
  return 'damage';
};

export const inferAttackKindFromCard = (card: Card): AttackKind => {
  if (card.damage < 0) return 'heal';
  if (SPORE_CARD_PATTERN.test(card.id)) return 'spore';
  return inferAttackKindFromStyle(card.projectileType);
};

export const inferAttackKindFromUnit = (unit: GameUnit): AttackKind => {
  if (unit.onHitEffect === 'heal') return 'heal';
  if (unit.onHitEffect === 'poison' || SPORE_CARD_PATTERN.test(unit.cardId)) return 'spore';
  return inferAttackKindFromStyle(unit.projectileType);
};

export const inferAttackKindFromProjectile = (projectile: Projectile): AttackKind => {
  if (projectile.onHitEffect === 'heal') return 'heal';
  if (projectile.onHitEffect === 'poison' || SPORE_CARD_PATTERN.test(projectile.sourceCardId ?? '')) return 'spore';
  return inferAttackKindFromStyle(projectile.style);
};
