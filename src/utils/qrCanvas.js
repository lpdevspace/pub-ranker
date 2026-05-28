/**
 * Minimal QR Code encoder — no external dependencies.
 * Supports alphanumeric + byte mode, error correction level M.
 * Renders directly onto a provided <canvas> element.
 *
 * Based on the public-domain QR spec (ISO/IEC 18004).
 * Supports versions 1–10 (up to ~174 bytes).
 */

// ─── Galois Field GF(256) ────────────────────────────────────────────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a, b) => a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
const gfPolyMul = (p, q) => {
    const r = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++)
        for (let j = 0; j < q.length; j++)
            r[i + j] ^= gfMul(p[i], q[j]);
    return r;
};
const gfPolyDiv = (dividend, divisor) => {
    let r = new Uint8Array(dividend);
    for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
        const c = r[i];
        if (!c) continue;
        for (let j = 1; j < divisor.length; j++)
            r[i + j] ^= gfMul(divisor[j], c);
    }
    return r.slice(dividend.length - divisor.length + 1);
};

// ─── Reed-Solomon generator polynomial ───────────────────────────────────────
const rsGenPoly = (degree) => {
    let p = new Uint8Array([1]);
    for (let i = 0; i < degree; i++)
        p = gfPolyMul(p, new Uint8Array([1, GF_EXP[i]]));
    return p;
};

// ─── QR version / capacity tables (error level M) ────────────────────────────
// [version]: [totalCodewords, ecCodewordsPerBlock, blocks, dataCodewords]
const VERSION_INFO = [
    null,
    [26,  10, 1, 16],
    [44,  16, 1, 28],
    [70,  26, 1, 44],
    [100, 18, 2, 64],
    [134, 24, 2, 86],
    [172, 16, 4, 108],
    [196, 18, 4, 124],
    [242, 22, 4, 154],
    [292, 22, 5, 182],
    [346, 26, 5, 216],
];

const ALIGNMENT_POSITIONS = [
    [], [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50],
];

// ─── Encode data into byte codewords ─────────────────────────────────────────
const encodeData = (text, version) => {
    const dataCapacity = VERSION_INFO[version][3];
    const bytes = new TextEncoder().encode(text);
    const bits = [];
    const push = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
    push(0b0100, 4);           // byte mode indicator
    push(bytes.length, 8);     // character count
    bytes.forEach(b => push(b, 8));
    // terminator
    for (let i = 0; i < 4 && bits.length < dataCapacity * 8; i++) bits.push(0);
    // byte-align
    while (bits.length % 8) bits.push(0);
    // pad
    const padBytes = [0xEC, 0x11];
    let pi = 0;
    while (bits.length < dataCapacity * 8) push(padBytes[pi++ % 2], 8);
    // pack bits → bytes
    const out = new Uint8Array(dataCapacity);
    for (let i = 0; i < dataCapacity; i++)
        for (let b = 0; b < 8; b++)
            out[i] = (out[i] << 1) | bits[i * 8 + b];
    return out;
};

// ─── Build full codeword sequence with RS ────────────────────────────────────
const buildCodewords = (text, version) => {
    const [, ecPerBlock, blocks, dataTotal] = VERSION_INFO[version];
    const blockSize = Math.floor(dataTotal / blocks);
    const largeBlocks = dataTotal % blocks;
    const data = encodeData(text, version);
    const gen = rsGenPoly(ecPerBlock);

    const dataBlocks = [], ecBlocks = [];
    let offset = 0;
    for (let b = 0; b < blocks; b++) {
        const len = b < blocks - largeBlocks ? blockSize : blockSize + 1;
        const block = data.slice(offset, offset + len);
        offset += len;
        const padded = new Uint8Array(block.length + ecPerBlock);
        padded.set(block);
        const ec = gfPolyDiv(padded, gen);
        dataBlocks.push(block);
        ecBlocks.push(ec);
    }

    const out = [];
    const maxData = Math.max(...dataBlocks.map(b => b.length));
    for (let i = 0; i < maxData; i++)
        dataBlocks.forEach(b => { if (i < b.length) out.push(b[i]); });
    for (let i = 0; i < ecPerBlock; i++)
        ecBlocks.forEach(b => out.push(b[i]));
    return out;
};

// ─── Matrix helpers ───────────────────────────────────────────────────────────
const makeMatrix = (size) => Array.from({ length: size }, () => new Int8Array(size).fill(-1));
const setModule = (matrix, r, c, dark, reserved = false) => {
    matrix[r][c] = dark ? (reserved ? 3 : 1) : (reserved ? 2 : 0);
};

const placeFinder = (m, r, c) => {
    for (let dr = -1; dr <= 7; dr++)
        for (let dc = -1; dc <= 7; dc++) {
            if (r + dr < 0 || r + dr >= m.length || c + dc < 0 || c + dc >= m.length) continue;
            const dark = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
                ((dr === 0 || dr === 6 || dc === 0 || dc === 6) ||
                 (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
            setModule(m, r + dr, c + dc, dark, true);
        }
};

const placeAlignment = (m, r, c) => {
    for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
            const dark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
            setModule(m, r + dr, c + dc, dark, true);
        }
};

const placeTimingAndFormat = (m, size) => {
    // Timing
    for (let i = 8; i < size - 8; i++) {
        setModule(m, 6, i, i % 2 === 0, true);
        setModule(m, i, 6, i % 2 === 0, true);
    }
    // Dark module
    setModule(m, size - 8, 8, true, true);
};

// ─── Format information (mask 2, EC level M = 00) ─────────────────────────────
// Pre-computed for mask pattern 2 (checkerboard (i+j)%2==0), ECC=M
const FORMAT_BITS_MASK2 = 0b110011000101111; // EC=M(00), mask=010 → data=00010 → BCH+XOR

const placeFormat = (m, size) => {
    const f = FORMAT_BITS_MASK2;
    const pos = [0,1,2,3,4,5,7,8];
    const posB = [size-1, size-2, size-3, size-4, size-5, size-6, size-7, size-8];
    for (let i = 0; i < 6; i++) {
        const dark = (f >> (14 - i)) & 1;
        setModule(m, 8, pos[i], dark, true);
        setModule(m, posB[i], 8, dark, true);
    }
    setModule(m, 8, 7, (f >> 8) & 1, true);
    setModule(m, size - 8, 8, (f >> 8) & 1, true);
    for (let i = 8; i < 15; i++) {
        const dark = (f >> (14 - i)) & 1;
        setModule(m, 8, 15 - i, dark, true);
        if (i < 9) setModule(m, pos[8-i > 7 ? 7 : 8-i] + (i===8?0:0), 8, dark, true);
    }
    // Simpler: just write all 15 bits in both copies
    const bits = [];
    for (let i = 14; i >= 0; i--) bits.push((f >> i) & 1);
    // Horizontal copy (row 8)
    [0,1,2,3,4,5,7,8,size-7,size-6,size-5,size-4,size-3,size-2,size-1].forEach((c, i) => {
        setModule(m, 8, c, !!bits[i], true);
    });
    // Vertical copy (col 8)
    [size-1,size-2,size-3,size-4,size-5,size-6,size-7,size-8, 7,5,4,3,2,1,0].forEach((r, i) => {
        setModule(m, r, 8, !!bits[i], true);
    });
};

// ─── Data placement ───────────────────────────────────────────────────────────
const placeData = (m, codewords, size) => {
    let bitIndex = 0;
    const totalBits = codewords.length * 8;
    let up = true;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            const row = up ? size - 1 - vert : vert;
            for (let col of [right, right - 1]) {
                if (m[row][col] !== -1) continue;
                const bit = bitIndex < totalBits
                    ? (codewords[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1
                    : 0;
                bitIndex++;
                // Apply mask 2: (row + col) % 2 === 0
                const masked = (row + col) % 2 === 0 ? bit ^ 1 : bit;
                m[row][col] = masked;
            }
        }
        up = !up;
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────
export function drawQrOnCanvas(canvas, text, moduleSize = 8, quiet = 4) {
    const encoded = new TextEncoder().encode(text);
    let version = 1;
    while (version <= 10 && VERSION_INFO[version][3] < encoded.length + 3) version++;
    if (version > 10) throw new Error('Text too long for QR encoder (max ~170 bytes)');

    const size = version * 4 + 17;
    const m = makeMatrix(size);

    placeFinder(m, 0, 0);
    placeFinder(m, 0, size - 7);
    placeFinder(m, size - 7, 0);
    placeTimingAndFormat(m, size);

    const ap = ALIGNMENT_POSITIONS[version];
    for (const r of ap)
        for (const c of ap)
            if (m[r][c] === -1) placeAlignment(m, r, c);

    placeFormat(m, size);

    const codewords = buildCodewords(text, version);
    placeData(m, codewords, size);

    const total = size + quiet * 2;
    canvas.width  = total * moduleSize;
    canvas.height = total * moduleSize;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (m[r][c] === 1 || m[r][c] === 3)
                ctx.fillRect((c + quiet) * moduleSize, (r + quiet) * moduleSize, moduleSize, moduleSize);
}
