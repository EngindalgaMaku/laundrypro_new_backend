/**
 * Zero-dependency ISO/IEC 18004 QR Code & Code-128B Barcode Generator
 * Produces crisp SVG matrices/bars for thermal receipts, carpet tags, and handheld/camera scanners.
 */

// ==========================================
// 1. CODE-128 (SUBSET B) 1D BARCODE GENERATOR
// ==========================================

const CODE128_PATTERNS: string[] = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];

/**
 * Encodes an ASCII string into a Code-128B bit string ("1" = bar, "0" = space).
 */
export function encodeCode128B(text: string): string {
  const sanitized = text.replace(/[^\x20-\x7E]/g, "");
  if (!sanitized) return "";

  const startCode = 104; // Start Code B
  let checksum = startCode;
  let bits = "0000000000" + CODE128_PATTERNS[startCode];

  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i) - 32;
    checksum += code * (i + 1);
    bits += CODE128_PATTERNS[code];
  }

  const checkSymbol = checksum % 103;
  bits += CODE128_PATTERNS[checkSymbol];
  bits += CODE128_PATTERNS[106]; // Stop pattern (13 modules)
  bits += "0000000000"; // Quiet zone

  return bits;
}

// ==========================================
// 2. ISO/IEC 18004 QR CODE MATRIX GENERATOR
// ==========================================

// Version 1..6 capacities (Byte mode, ECC Level L)
const QR_VERSION_INFO: Array<{
  version: number;
  size: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  alignmentCenters: number[];
}> = [
  { version: 1, size: 21, totalDataCodewords: 19, ecCodewordsPerBlock: 7, alignmentCenters: [] },
  { version: 2, size: 25, totalDataCodewords: 34, ecCodewordsPerBlock: 10, alignmentCenters: [6, 18] },
  { version: 3, size: 29, totalDataCodewords: 55, ecCodewordsPerBlock: 15, alignmentCenters: [6, 22] },
  { version: 4, size: 33, totalDataCodewords: 80, ecCodewordsPerBlock: 20, alignmentCenters: [6, 26] },
  { version: 5, size: 37, totalDataCodewords: 108, ecCodewordsPerBlock: 26, alignmentCenters: [6, 30] },
  { version: 6, size: 41, totalDataCodewords: 136, ecCodewordsPerBlock: 18, alignmentCenters: [6, 34] }, // 2 blocks of (68 data, 18 ec)
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getReedSolomonGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonEC(data: Uint8Array, ecLength: number): Uint8Array {
  const gen = getReedSolomonGeneratorPoly(ecLength);
  const remainder = new Uint8Array(ecLength);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[ecLength - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLength; j++) {
        remainder[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return remainder;
}

function getBCHFormatInfo(maskPattern: number): number {
  // ECC Level L = 01
  const data = (0b01 << 3) | maskPattern;
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

/**
 * Generates a 2D boolean matrix (true = dark module, false = light module) for the given text.
 */
export function generateQRMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text);

  // Pick smallest version that fits utf8Bytes + 2 bytes header
  const versionSpec =
    QR_VERSION_INFO.find((v) => v.totalDataCodewords - 2 >= utf8Bytes.length) ||
    QR_VERSION_INFO[QR_VERSION_INFO.length - 1];

  const payload = utf8Bytes.slice(0, versionSpec.totalDataCodewords - 2);
  const bits: number[] = [];

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1..9)
  pushBits(payload.length, 8);
  // Payload bytes
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const maxDataBits = versionSpec.totalDataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < maxDataBits; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad codewords (0xEC, 0x11)
  let padToggle = 0;
  while (bits.length < maxDataBits) {
    pushBits(padToggle % 2 === 0 ? 0xec : 0x11, 8);
    padToggle++;
  }

  const dataCodewords = new Uint8Array(versionSpec.totalDataCodewords);
  for (let i = 0; i < dataCodewords.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  // Interleave blocks (Version 6 uses 2 blocks, Versions 1..5 use 1 block at ECC L)
  let finalCodewords: Uint8Array;
  if (versionSpec.version === 6) {
    const b1Data = dataCodewords.slice(0, 68);
    const b2Data = dataCodewords.slice(68, 136);
    const b1Ec = computeReedSolomonEC(b1Data, versionSpec.ecCodewordsPerBlock);
    const b2Ec = computeReedSolomonEC(b2Data, versionSpec.ecCodewordsPerBlock);
    finalCodewords = new Uint8Array(136 + 36);
    for (let i = 0; i < 68; i++) {
      finalCodewords[i * 2] = b1Data[i];
      finalCodewords[i * 2 + 1] = b2Data[i];
    }
    for (let i = 0; i < 18; i++) {
      finalCodewords[136 + i * 2] = b1Ec[i];
      finalCodewords[136 + i * 2 + 1] = b2Ec[i];
    }
  } else {
    const ec = computeReedSolomonEC(dataCodewords, versionSpec.ecCodewordsPerBlock);
    finalCodewords = new Uint8Array(dataCodewords.length + ec.length);
    finalCodewords.set(dataCodewords, 0);
    finalCodewords.set(ec, dataCodewords.length);
  }

  const size = versionSpec.size;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = dark;
      reserved[r][c] = true;
    }
  };

  // Finder patterns + separators
  const placeFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        const isSeparator = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        setFunctionModule(r, c, !isSeparator && (isBorder || isInner));
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment patterns
  const centers = versionSpec.alignmentCenters;
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const cr = centers[i];
      const cc = centers[j];
      if (reserved[cr][cc]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark =
            Math.abs(dr) === 2 ||
            Math.abs(dc) === 2 ||
            (dr === 0 && dc === 0);
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setFunctionModule(6, i, i % 2 === 0);
    if (!reserved[i][6]) setFunctionModule(i, 6, i % 2 === 0);
  }

  // Dark module & reserve format info areas
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) setFunctionModule(8, i, false);
    if (!reserved[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!reserved[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!reserved[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark =
              ((finalCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          matrix[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Write Format Information for Mask 0
  const formatBits = getBCHFormatInfo(0);
  for (let i = 0; i <= 5; i++) {
    matrix[8][i] = ((formatBits >> (14 - i)) & 1) === 1;
  }
  matrix[8][7] = ((formatBits >> 8) & 1) === 1;
  matrix[8][8] = ((formatBits >> 7) & 1) === 1;
  matrix[7][8] = ((formatBits >> 6) & 1) === 1;
  for (let i = 9; i < 15; i++) {
    matrix[14 - i][8] = ((formatBits >> (14 - i)) & 1) === 1;
  }

  for (let i = 0; i < 8; i++) {
    matrix[8][size - 1 - i] = ((formatBits >> i) & 1) === 1;
  }
  for (let i = 8; i < 15; i++) {
    matrix[size - 15 + i][8] = ((formatBits >> i) & 1) === 1;
  }

  return matrix;
}
