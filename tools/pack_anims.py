#!/usr/bin/env python3
"""PixelLab 결과 프레임을 게임용 아틀라스(js/char-anims.js)로 묶는다.

입력 폴더 구조:  <in_dir>/<캐릭터>/<동작>/<방향>/<번호>.png
  캐릭터: gizmo monkey frog dark   (config.js의 CHARACTERS key와 같아야 함)
  동작:   rot(정지 회전) idle walk act happy hurt
  방향:   e se s sw w nw n ne      (없는 방향은 게임이 좌우 반전/가까운 방향으로 대체)

사용:  python3 tools/pack_anims.py <in_dir> js/char-anims.js [--body 46] [--no-align]
  --body     : 게임 화면에서 캐릭터 키(논리 px). 지금 그림이 약 46px.
  --no-align : 발 줄 맞추기를 끈다 (기본은 켬)

발 줄 맞추기: PixelLab은 동작마다 캔버스 크기(예: 남쪽 걷기만 72px)와 그림 위치가 조금씩 달라서
그대로 묶으면 서 있다가 걸을 때 몸이 떠 보인다. 그래서 동작·방향마다 클립 전체의 가장 낮은 발 줄을
같은 방향 정지 그림(rot)의 발 줄에 맞춘다. 클립 전체를 같은 만큼만 옮기므로 걷기 출렁임·점프처럼
동작 안의 움직임은 그대로 남는다. 입력 폴더의 PNG는 건드리지 않는다.
"""
import argparse, base64, hashlib, io, json, math, os, sys
from PIL import Image

FPS = {'rot': 1, 'idle': 6, 'walk': 10, 'act': 12, 'happy': 10, 'hurt': 12}
HOLD = {'happy': 0.25, 'hurt': 0.1}
DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']
ANIMS = ['rot', 'idle', 'walk', 'act', 'happy', 'hurt']


def scan(char_dir):
    out = {}
    for anim in ANIMS:
        ap = os.path.join(char_dir, anim)
        if not os.path.isdir(ap):
            continue
        dirs = {}
        for d in DIRS:
            dp = os.path.join(ap, d)
            if not os.path.isdir(dp):
                continue
            files = sorted(f for f in os.listdir(dp) if f.lower().endswith('.png'))
            if files:
                dirs[d] = [os.path.join(dp, f) for f in files]
        if dirs:
            out[anim] = dirs
    return out


def alpha_bbox(im):
    return im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()


def foot_of(im):
    """발 기준점: 불투명 영역의 맨 아래 줄, 아래쪽 몇 줄의 가로 중심."""
    bb = alpha_bbox(im)
    if not bb:
        return im.width / 2, im.height - 1, 0
    x0, y0, x1, y1 = bb
    a = im.getchannel('A').load()
    xs = [x for y in range(max(y0, y1 - 4), y1) for x in range(x0, x1) if a[x, y] > 24]
    cx = (min(xs) + max(xs) + 1) / 2 if xs else (x0 + x1) / 2
    return cx, y1, y1 - y0


def ground_of(im):
    bb = alpha_bbox(im)
    return bb[3] if bb else None


def align_ground(anims, imgs, cell):
    """동작·방향별로 클립의 가장 낮은 발 줄을 같은 방향 rot(없으면 s)의 발 줄에 맞춘다. 반환: {'walk/s': dy, ...}"""
    rot = anims.get('rot', {})
    shifts = {}
    for anim, dirs in anims.items():
        if anim == 'rot':
            continue
        for d, files in dirs.items():
            ref = rot.get(d) or rot.get('s')
            if not ref:
                continue
            gy_ref = ground_of(imgs[ref[0]])
            boxes = [alpha_bbox(imgs[f]) for f in files]
            boxes = [b for b in boxes if b]
            if gy_ref is None or not boxes:
                continue
            dy = gy_ref - max(b[3] for b in boxes)
            dy = max(dy, -min(b[1] for b in boxes))          # 위로 잘리지 않게
            dy = min(dy, cell - max(b[3] for b in boxes))    # 아래로 잘리지 않게
            if dy:
                for f in files:
                    imgs[f] = imgs[f].crop((0, -dy, cell, cell - dy))   # 바깥은 투명으로 채워짐
            shifts[f'{anim}/{d}'] = dy
    return shifts


def pack_char(key, char_dir, body_target, align=True):
    anims = scan(char_dir)
    if not anims:
        return None
    imgs, cell = {}, 0
    for anim, dirs in anims.items():
        for d, files in dirs.items():
            for f in files:
                im = Image.open(f).convert('RGBA')
                imgs[f] = im
                cell = max(cell, im.width, im.height)
    # 크기가 다른 프레임은 아래 가운데 기준으로 정사각 셀에 맞춘다
    for f, im in imgs.items():
        if im.size != (cell, cell):
            c = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
            c.alpha_composite(im, ((cell - im.width) // 2, cell - im.height))
            imgs[f] = c
    shifts = align_ground(anims, imgs, cell) if align else {}
    ref_anim = next(a for a in ['rot', 'idle', 'walk'] if a in anims) if any(a in anims for a in ['rot', 'idle', 'walk']) else next(iter(anims))
    ref_dir = 's' if 's' in anims[ref_anim] else next(iter(anims[ref_anim]))
    fx, fy, body_h = foot_of(imgs[anims[ref_anim][ref_dir][0]])
    ratio = body_target / max(1, body_h)
    if 0.94 <= ratio <= 1.06:             # 거의 1:1이면 정수 배율로 선명하게
        draw, smooth = cell, False
    elif 1.88 <= ratio <= 2.12:
        draw, smooth = cell * 2, False
    else:
        draw, smooth = round(cell * ratio, 2), True
    # 중복 프레임 제거 + 아틀라스 배치
    uniq, index, frames = [], {}, {}
    for anim, dirs in anims.items():
        frames[anim] = {}
        for d, files in dirs.items():
            ids = []
            for f in files:
                h = hashlib.sha1(imgs[f].tobytes()).hexdigest()
                if h not in index:
                    index[h] = len(uniq)
                    uniq.append(imgs[f])
                ids.append(index[h])
            frames[anim][d] = ids
    cols = max(1, math.ceil(math.sqrt(len(uniq))))
    rows = math.ceil(len(uniq) / cols)
    atlas = Image.new('RGBA', (cols * cell, rows * cell), (0, 0, 0, 0))
    for i, im in enumerate(uniq):
        atlas.alpha_composite(im, ((i % cols) * cell, (i // cols) * cell))
    buf = io.BytesIO()
    colors = atlas.getcolors(257)
    if colors is not None:                 # 256색 이하면 무손실 팔레트 PNG로 (용량 절약)
        atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(buf, 'PNG', optimize=True)
        test = Image.open(io.BytesIO(buf.getvalue())).convert('RGBA')
        if test.tobytes() != atlas.tobytes():
            buf = io.BytesIO(); atlas.save(buf, 'PNG', optimize=True)
    else:
        atlas.save(buf, 'PNG', optimize=True)
    src = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    data = {
        'cell': cell, 'cols': cols, 'draw': draw, 'smooth': smooth,
        'foot': [round(fx, 1), fy],
        'anims': {a: {'fps': FPS.get(a, 8), **({'hold': HOLD[a]} if a in HOLD else {}), 'dirs': frames[a]} for a in frames},
    }
    info = f"{key}: cell {cell}px, {len(uniq)} frames, atlas {atlas.width}x{atlas.height}, {len(buf.getvalue())//1024}KB, draw {draw} ({'smooth' if smooth else 'crisp'})"
    if shifts:
        info += '\n  발 줄 맞춤(아래로 +px): ' + ' '.join(f'{k}{v:+d}' for k, v in shifts.items())
    return data, src, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('in_dir'); ap.add_argument('out_js')
    ap.add_argument('--body', type=float, default=46)
    ap.add_argument('--no-align', action='store_true', help='발 줄 맞추기 끄기')
    a = ap.parse_args()
    lines = ["/* ============ 삼분의숲 — char-anims (자동 생성 파일) ============",
             "   tools/pack_anims.py가 PixelLab 결과로 만든다. 직접 고치지 말 것.",
             "   비어 있으면 캐릭터는 기존 한 장짜리 그림으로 그려진다. */",
             "'use strict';", "const CHAR_ANIMS = {"]
    for key in sorted(os.listdir(a.in_dir)):
        cd = os.path.join(a.in_dir, key)
        if not os.path.isdir(cd):
            continue
        r = pack_char(key, cd, a.body, align=not a.no_align)
        if not r:
            continue
        data, src, info = r
        print(info)
        body = json.dumps(data, separators=(',', ':'))
        lines.append(f"  {key}: Object.assign({body}, {{ src: '{src}' }}),")
    lines.append("};")
    with open(a.out_js, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('wrote', a.out_js, os.path.getsize(a.out_js) // 1024, 'KB')


if __name__ == '__main__':
    main()
