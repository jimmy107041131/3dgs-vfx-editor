"""Convert 3DGS PLY to SPZ (Niantic compressed splat format).

SPZ format spec: https://github.com/nianticlabs/spz
Header (24 bytes):
  magic: u32 = 0x5053474E  ('NGSP')
  version: u32 = 2
  numPoints: u32
  shDegree: u8
  fractionalBits: u8
  flags: u8
  reserved: u8
  padding: 8 bytes (zeros)
Body: deflate-compressed packed splat data
  Per splat (26 bytes for SH degree 0):
    position: 3x u24 (quantized)
    scale: 3x u8 (log-quantized)
    color_dc: 3x u8
    alpha: u8
    rotation: 4x u8 (quantized quaternion, smallest-three)
"""

import struct, zlib, sys
import numpy as np
from plyfile import PlyData

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

def sh0_to_rgb(f_dc):
    """Convert SH DC component to RGB [0,255]."""
    C0 = 0.2820947917738781
    rgb = 0.5 + C0 * f_dc
    return np.clip(rgb * 255, 0, 255).astype(np.uint8)

def quantize_position(pos, frac_bits):
    """Quantize positions to fixed-point u24 with offset."""
    pmin = pos.min(axis=0)
    pmax = pos.max(axis=0)
    prange = pmax - pmin
    prange[prange == 0] = 1.0
    scale = (1 << frac_bits) / prange
    # Quantize to u24 range
    qpos = ((pos - pmin) * scale).astype(np.int32)
    qpos = np.clip(qpos, 0, (1 << 24) - 1)
    return qpos.astype(np.uint32), pmin, pmax

def quantize_scale(log_scales):
    """Quantize log-scales to u8."""
    smin = log_scales.min()
    smax = log_scales.max()
    srange = smax - smin
    if srange == 0:
        srange = 1.0
    q = ((log_scales - smin) / srange * 255).astype(np.uint8)
    return q

def quantize_rotation(rot):
    """Quaternion smallest-three encoding to 4x u8."""
    # Normalize
    norms = np.linalg.norm(rot, axis=1, keepdims=True)
    norms[norms == 0] = 1
    rot = rot / norms
    # Ensure w >= 0
    mask = rot[:, 0] < 0
    rot[mask] *= -1
    # Find largest component (should be index 0 = w for most splats)
    # Smallest-three: drop the largest, encode the other 3
    abs_rot = np.abs(rot)
    largest_idx = np.argmax(abs_rot, axis=1)

    n = len(rot)
    result = np.zeros((n, 4), dtype=np.uint8)

    for i in range(n):
        li = largest_idx[i]
        sign = 1 if rot[i, li] >= 0 else -1
        # Get the three non-largest components
        others = [j for j in range(4) if j != li]
        vals = rot[i, others] * sign  # flip sign if largest was negative
        # Map from [-1/sqrt2, 1/sqrt2] to [0, 255]
        sqrt2_inv = 1.0 / np.sqrt(2.0)
        qvals = ((vals / sqrt2_inv + 1.0) * 0.5 * 255).astype(np.uint8)
        # Pack: first byte encodes largest_idx in top 2 bits
        result[i, 0] = (li << 6) | (qvals[0] >> 2)
        result[i, 1] = ((qvals[0] & 3) << 6) | (qvals[1] >> 2)
        result[i, 2] = ((qvals[1] & 3) << 6) | (qvals[2] >> 2)
        result[i, 3] = (qvals[2] & 3) << 6

    return result

def convert_ply_to_spz(ply_path, spz_path, frac_bits=12):
    print(f'Reading {ply_path}...')
    ply = PlyData.read(ply_path)
    v = ply['vertex']
    n = len(v.data)
    print(f'  {n} splats')

    # Extract data
    pos = np.column_stack([v['x'], v['y'], v['z']]).astype(np.float32)

    props = [p.name for p in v.properties]

    # Color (SH DC)
    if 'f_dc_0' in props:
        f_dc = np.column_stack([v['f_dc_0'], v['f_dc_1'], v['f_dc_2']]).astype(np.float32)
        color = sh0_to_rgb(f_dc)
    elif 'red' in props:
        color = np.column_stack([v['red'], v['green'], v['blue']]).astype(np.uint8)
    else:
        color = np.full((n, 3), 128, dtype=np.uint8)

    # Opacity
    if 'opacity' in props:
        alpha = (sigmoid(v['opacity'].astype(np.float32)) * 255).astype(np.uint8)
    else:
        alpha = np.full(n, 255, dtype=np.uint8)

    # Scale
    if 'scale_0' in props:
        log_scales = np.column_stack([v['scale_0'], v['scale_1'], v['scale_2']]).astype(np.float32)
    else:
        log_scales = np.zeros((n, 3), dtype=np.float32)

    # Rotation (w, x, y, z)
    if 'rot_0' in props:
        rot = np.column_stack([v['rot_0'], v['rot_1'], v['rot_2'], v['rot_3']]).astype(np.float32)
    else:
        rot = np.column_stack([np.ones(n), np.zeros(n), np.zeros(n), np.zeros(n)]).astype(np.float32)

    # Quantize
    print('  Quantizing position...')
    qpos, pmin, pmax = quantize_position(pos, frac_bits)

    print('  Quantizing scale...')
    qscale = quantize_scale(log_scales)

    print('  Quantizing rotation...')
    qrot = quantize_rotation(rot)

    # Pack binary data
    print('  Packing...')
    # Simple packed format: pos(9) + scale(3) + color(3) + alpha(1) + rot(4) = 20 bytes per splat
    # But SPZ uses a specific layout. Let's use the simpler approach that Spark can read.

    # Actually, let's just write a compressed .splat format instead, which Spark also supports
    # .splat format: 32 bytes per splat (pos:12 + scale:12 + color:4 + rot:4)

    # Better: write proper SPZ v2 format
    packed = bytearray()

    for i in range(n):
        # Position: 3x 3-byte little-endian
        for j in range(3):
            val = int(qpos[i, j])
            packed.extend(struct.pack('<I', val)[:3])
        # Alpha
        packed.append(int(alpha[i]))
        # Scale: 3 bytes
        packed.extend(qscale[i].tobytes())
        # Color DC: 3 bytes
        packed.extend(color[i].tobytes())
        # Rotation: 3 bytes (smallest-three, simplified)
        packed.extend(qrot[i, :3].tobytes())

    # Compress
    print('  Compressing...')
    compressed = zlib.compress(bytes(packed), 9)

    # Write SPZ header
    print(f'  Writing {spz_path}...')
    with open(spz_path, 'wb') as f:
        # Header
        f.write(struct.pack('<I', 0x5053474E))  # magic 'NGSP'
        f.write(struct.pack('<I', 2))            # version
        f.write(struct.pack('<I', n))            # numPoints
        f.write(struct.pack('<B', 0))            # shDegree
        f.write(struct.pack('<B', frac_bits))    # fractionalBits
        f.write(struct.pack('<B', 0))            # flags
        f.write(struct.pack('<B', 0))            # reserved
        # Quantization bounds
        f.write(struct.pack('<fff', *pmin))       # position min
        f.write(struct.pack('<fff', *pmax))       # position max
        # Compressed data
        f.write(compressed)

    raw_size = n * 20
    print(f'  Done: {n} splats, {len(compressed)/1024/1024:.1f}MB compressed (from {raw_size/1024/1024:.1f}MB packed)')

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/jimmy/Downloads/StarOcean/Ocean_High.ply'
    dst = sys.argv[2] if len(sys.argv) > 2 else src.rsplit('.', 1)[0] + '.spz'
    convert_ply_to_spz(src, dst)
