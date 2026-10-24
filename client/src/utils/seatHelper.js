/**
 * iMovies Client Seat Key & Format Helper
 * Resolves seat collisions across tiers/sections by enforcing globally unique composite identifiers.
 * Standard format: `${tierId}-${row}-${seatNumber}` (e.g. 'balcony-A-1', 'middle-B-5', 'lower-A-1')
 */

export const toCompositeSeatId = (tier, row, col) => {
  const cleanTier = String(tier || 'middle').toLowerCase().trim();
  const cleanRow = String(row).toUpperCase().trim();
  const cleanCol = String(col).trim();
  return `${cleanTier}-${cleanRow}-${cleanCol}`;
};

export const parseSeatIdentifier = (seatInput) => {
  if (!seatInput) {
    return {
      id: 'middle-A-1',
      seatId: 'middle-A-1',
      tierId: 'middle',
      sectionId: 'middle',
      tier: 'middle',
      row: 'A',
      seatNumber: '1',
      number: '1',
      col: '1',
      label: 'A1',
      price: 0
    };
  }

  // If already a structured object
  if (typeof seatInput === 'object' && seatInput !== null) {
    const tier = String(
      seatInput.tierId || seatInput.sectionId || seatInput.tier || seatInput.section || 'middle'
    )
      .toLowerCase()
      .trim();
    const row = String(seatInput.row).toUpperCase().trim();
    const seatNumber = String(
      seatInput.seatNumber || seatInput.number || seatInput.col || '1'
    ).trim();
    const seatId = toCompositeSeatId(tier, row, seatNumber);
    const label = seatInput.label || `${row}${seatNumber}`;
    const price = Number(seatInput.price) || 0;

    return {
      id: seatId,
      seatId,
      tierId: tier,
      sectionId: tier,
      tier,
      row,
      seatNumber,
      number: seatNumber,
      col: seatNumber,
      label,
      price
    };
  }

  const str = String(seatInput).trim();

  // If formatted with hyphen "${tier}-${row}-${number}" (e.g. "balcony-A-1" or "lower-A-1")
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      const tier = parts[0].toLowerCase().trim();
      const row = parts[1].toUpperCase().trim();
      const seatNumber = parts[2].trim();
      const seatId = `${tier}-${row}-${seatNumber}`;
      return {
        id: seatId,
        seatId,
        tierId: tier,
        sectionId: tier,
        tier,
        row,
        seatNumber,
        number: seatNumber,
        col: seatNumber,
        label: `${row}${seatNumber}`
      };
    } else if (parts.length === 2) {
      // e.g. "lower-A1"
      const tier = parts[0].toLowerCase().trim();
      const row = parts[1][0].toUpperCase();
      const seatNumber = parts[1].slice(1).trim();
      const seatId = `${tier}-${row}-${seatNumber}`;
      return {
        id: seatId,
        seatId,
        tierId: tier,
        sectionId: tier,
        tier,
        row,
        seatNumber,
        number: seatNumber,
        col: seatNumber,
        label: `${row}${seatNumber}`
      };
    }
  }

  // If formatted with colon "${tier}:${row}:${number}" (e.g. "balcony:A:1")
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      const tier = parts[0].toLowerCase().trim();
      const row = parts[1].toUpperCase().trim();
      const seatNumber = parts[2].trim();
      const seatId = `${tier}-${row}-${seatNumber}`;
      return {
        id: seatId,
        seatId,
        tierId: tier,
        sectionId: tier,
        tier,
        row,
        seatNumber,
        number: seatNumber,
        col: seatNumber,
        label: `${row}${seatNumber}`
      };
    } else if (parts.length === 2) {
      // e.g. "lower:A1"
      const tier = parts[0].toLowerCase().trim();
      const row = parts[1][0].toUpperCase();
      const seatNumber = parts[1].slice(1).trim();
      const seatId = `${tier}-${row}-${seatNumber}`;
      return {
        id: seatId,
        seatId,
        tierId: tier,
        sectionId: tier,
        tier,
        row,
        seatNumber,
        number: seatNumber,
        col: seatNumber,
        label: `${row}${seatNumber}`
      };
    }
  }

  // Fallback for legacy format "A1" where tier was omitted
  const row = str[0].toUpperCase();
  const seatNumber = str.slice(1).trim();
  const tier = 'middle';
  const seatId = `${tier}-${row}-${seatNumber}`;

  return {
    id: seatId,
    seatId,
    tierId: tier,
    sectionId: tier,
    tier,
    row,
    seatNumber,
    number: seatNumber,
    col: seatNumber,
    label: `${row}${seatNumber}`
  };
};

export const formatSeatDisplay = (seatInput) => {
  const parsed = parseSeatIdentifier(seatInput);
  const tierName = parsed.tier.charAt(0).toUpperCase() + parsed.tier.slice(1);
  return `${parsed.label} (${tierName} Tier)`;
};
