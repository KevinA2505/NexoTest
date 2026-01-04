import { CARD_DISTRIBUTION_SCHEMA, CARD_LIBRARY } from '../constants.ts';
import { Faction, UnitType } from '../types.ts';

type RoleCounts = { melee: number; shooters: number; tank: number; structures: number; spells: number };

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const findDuplicates = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return true;
    seen.add(item.id);
    return false;
  });
};

const validateAlienSubtypes = () => {
  const invalid = CARD_LIBRARY.filter(
    card => card.faction === Faction.ALIEN && card.alienSubtype === undefined
  );

  assert(invalid.length === 0, `Cartas alienígenas sin alienSubtype: ${invalid.map(c => c.id).join(', ')}`);
};

const validateDuplicates = () => {
  const duplicates = findDuplicates(CARD_LIBRARY);
  assert(duplicates.length === 0, `IDs duplicados detectados: ${duplicates.map(c => c.id).join(', ')}`);
};

const assignRoles = (groupCards: typeof CARD_LIBRARY) => {
  const counts: RoleCounts = { melee: 0, shooters: 0, tank: 0, structures: 0, spells: 0 };
  const structures = groupCards.filter(card => card.type === UnitType.BUILDING);
  const spells = groupCards.filter(card => card.type === UnitType.SPELL);
  const units = groupCards.filter(
    card => card.type === UnitType.GROUND || card.type === UnitType.AIR
  );

  assert(units.length >= 6, 'Cada grupo debe tener al menos seis unidades jugables para asignar roles.');

  const tankCard = units.reduce((prev, current) => (current.hp > prev.hp ? current : prev));
  const shooterCandidates = units
    .filter(card => card.id !== tankCard.id)
    .sort((a, b) => b.range - a.range)
    .slice(0, 2)
    .map(card => card.id);

  units.forEach(card => {
    if (card.id === tankCard.id) counts.tank += 1;
    else if (shooterCandidates.includes(card.id)) counts.shooters += 1;
    else counts.melee += 1;
  });

  counts.structures = structures.length;
  counts.spells = spells.length;

  return counts;
};

const validateGroups = () => {
  CARD_DISTRIBUTION_SCHEMA.forEach(schema => {
    const groupCards = CARD_LIBRARY.filter(card => {
      if (card.faction !== schema.faction) return false;
      if ('subtype' in schema && schema.subtype) return card.alienSubtype === schema.subtype;
      return true;
    });

    assert(
      groupCards.length === 10,
      `El grupo "${schema.group}" tiene ${groupCards.length} cartas (esperado: 10).`
    );

    const counts = assignRoles(groupCards);
    const mismatches = Object.entries(schema.slots).filter(
      ([role, required]) => counts[role as keyof RoleCounts] !== required
    );

    assert(
      mismatches.length === 0,
      `Distribución inválida en "${schema.group}": ${mismatches
        .map(([role, required]) => `${role} -> ${counts[role as keyof RoleCounts]}/${required}`)
        .join(', ')}`
    );
  });
};

const run = () => {
  assert(CARD_LIBRARY.length === 50, `CARD_LIBRARY contiene ${CARD_LIBRARY.length} entradas (esperado: 50).`);
  validateDuplicates();
  validateAlienSubtypes();
  validateGroups();
  console.log('✅ Validación de CARD_LIBRARY completada con éxito.');
};

run();
