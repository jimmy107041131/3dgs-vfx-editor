"""Convert 3DGS PLY to .splat format (32 bytes per splat).

Layout per splat:
  float32 x, y, z        (position, 12 bytes)
  float32 sx, sy, sz      (scale as exp, 12 bytes)
  uint8   r, g, b, a      (color + opacity, 4 bytes)
  uint8   qw, qx, qy, qz (quaternion, 4 bytes)
Total: 32 bytes
"""

import struct, sys
import numpy as np
from plyfile import PlyData

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))

def sh0_to_rgb(f_dc):
    C0 = 0.2820947917738781
    rgb = 0.5 + C0 * f_dc
    return np.clip(rgb * 255, 0, 255).astype(np.uint8)

def encode_quat(rot):
    """Encode quaternion (w,x,y,z) to 4x uint8 via (val * 128 + 128)."""
    norms = np.linalg.norm(rot, axis=1, keepdims=True)
    norms[norms == 0] = 1
    rot = rot / norms
    # Ensure consistent sign (w >= 0)
    mask = rot[:, 0] < 0
    rot[mask] *= -1
    return np.clip(rot * 128 + 128, 0, 255).astype(np.uint8)

def convert(ply_path, splat_path):
    print(f'Reading {ply_path}...')
    ply = PlyData.read(ply_path)
    v = ply['vertex']
    n = len(v.data)
    props = [p.name for p in v.properties]
    print(f'  {n} splats, properties: {props}')

    # Position
    pos = np.column_stack([v['x'], v['y'], v['z']]).astype(np.float32)

    # Scale (keep as log-space float32, Spark reads them as-is)
    if 'scale_0' in props:
        scale = np.column_stack([v['scale_0'], v['scale_1'], v['scale_2']]).astype(np.float32)
    else:
        scale = np.zeros((n, 3), dtype=np.float32)

    # Color
    if 'f_dc_0' in props:
        f_dc = np.column_stack([v['f_dc_0'], v['f_dc_1'], v['f_dc_2']]).astype(np.float32)
        rgb = sh0_to_rgb(f_dc)
    elif 'red' in props:
        rgb = np.column_stack([v['red'], v['green'], v['blue']]).astype(np.uint8)
    else:
        rgb = np.full((n, 3), 128, dtype=np.uint8)

    # Opacity
    if 'opacity' in props:
        alpha = (sigmoid(v['opacity'].astype(np.float32)) * 255).astype(np.uint8)
    else:
        alpha = np.full(n, 255, dtype=np.uint8)

    # Quaternion (w, x, y, z)
    if 'rot_0' in props:
        rot = np.column_stack([v['rot_0'], v['rot_1'], v['rot_2'], v['rot_3']]).astype(np.float32)
    else:
        rot = np.column_stack([np.ones(n), np.zeros(n), np.zeros(n), np.zeros(n)]).astype(np.float32)

    quat = encode_quat(rot)

    # Pack to 32 bytes per splat
    print('  Packing...')
    buf = bytearray(n * 32)
    for i in range(n):
        offset = i * 32
        struct.pack_into('<3f', buf, offset, pos[i, 0], pos[i, 1], pos[i, 2])
        struct.pack_into('<3f', buf, offset + 12, scale[i, 0], scale[i, 1], scale[i, 2])
        buf[offset + 24] = rgb[i, 0]
        buf[offset + 25] = rgb[i, 1]
        buf[offset + 26] = rgb[i, 2]
        buf[offset + 27] = alpha[i]
        buf[offset + 28] = quat[i, 0]  # w
        buf[offset + 29] = quat[i, 1]  # x
        buf[offset + 30] = quat[i, 2]  # y
        buf[offset + 31] = quat[i, 3]  # z

    print(f'  Writing {splat_path}...')
    with open(splat_path, 'wb') as f:
        f.write(buf)

    size_mb = len(buf) / 1024 / 1024
    orig_mb = ply.comments  # just for info
    print(f'  Done: {n} splats, {size_mb:.1f}MB .splat file')

if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/jimmy/Downloads/StarOcean/Ocean_High.ply'
    dst = sys.argv[2] if len(sys.argv) > 2 else src.rsplit('.', 1)[0] + '.splat'
    convert(src, dst)
