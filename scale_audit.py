#!/usr/bin/env python3

import re
import os

ROOMS_DIR = os.path.dirname(os.path.abspath(__file__))

REFERENCE_SCALE = 2.0
REFERENCE_FP_EYE = 0.65
EYE_RATIO = REFERENCE_FP_EYE / REFERENCE_SCALE

CHAR_SCALE_PATTERNS = [
    re.compile(r'mesh\.scale\.set\(\s*([\d.]+)\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)'),
    re.compile(r'charMesh\.scale\.set\(\s*([\d.]+)\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)'),
    re.compile(r'const\s+CHARACTER_SCALE\s*=\s*([\d.]+)'),
    re.compile(r'CHARACTER_SCALE\s*,\s*CHARACTER_SCALE\s*,\s*CHARACTER_SCALE'),
]

FP_EYE_PATTERN = re.compile(
    r'(camera\.position\.copy|headPos\s*=.*position.*clone\(\)|headPos\s*=.*copy).*?(?:add|Vector3)\s*\(.*?0\s*,\s*([\d.]+)\s*,\s*0'
)

HTML_FILES = [f for f in os.listdir(ROOMS_DIR) if f.endswith('.html')]

print("=" * 70)
print(f"  Character Scale Audit  |  EYE_RATIO = {EYE_RATIO:.4f}  (lobby reference)")
print("=" * 70)
print(f"{'File':<20} {'Char Scale':<15} {'Current Eye':<15} {'Correct Eye':<15} {'Match?'}")
print("-" * 70)

for fname in sorted(HTML_FILES):
    fpath = os.path.join(ROOMS_DIR, fname)
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()

    char_scale = None
    char_scale_line = None

    const_match = re.search(r'const\s+CHARACTER_SCALE\s*=\s*([\d.]+)', content)
    if const_match:
        char_scale = float(const_match.group(1))
        for i, line in enumerate(lines, 1):
            if 'CHARACTER_SCALE' in line and '=' in line and 'const' in line:
                char_scale_line = i
                break

    if char_scale is None:
        direct_match = re.search(r'mesh\.scale\.set\(([\d.]+)\s*,\s*[\d.]+\s*,\s*[\d.]+\)', content)
        if direct_match:
            char_scale = float(direct_match.group(1))
            for i, line in enumerate(lines, 1):
                if 'mesh.scale.set' in line and direct_match.group(0) in line:
                    char_scale_line = i
                    break

    fp_eye = None
    eye_match = re.search(
        r'(?:camera\.position\.copy\(p\.mesh\.position\)|headPos\s*=.*?mesh\.position).*?(?:add|Vector3)\s*\(\s*0\s*,\s*([\d.]+)\s*,\s*0',
        content, re.DOTALL
    )
    if not eye_match:
        eye_match = re.search(
            r'new THREE\.Vector3\(\s*0\s*,\s*([\d.]+)\s*,\s*0\s*\)',
            content
        )
    if eye_match:
        fp_eye = float(eye_match.group(1))

    if char_scale is None:
        print(f"{fname:<20} {'N/A':<15} {'N/A':<15} {'N/A':<15} —")
        continue

    correct_eye = round(char_scale * EYE_RATIO, 4)
    eye_str = f"{fp_eye:.4f}" if fp_eye is not None else "N/A"
    match = "✓" if fp_eye is not None and abs(fp_eye - correct_eye) < 0.01 else "✗"

    print(f"{fname:<20} {char_scale:<15} {eye_str:<15} {correct_eye:<15} {match}")

print("-" * 70)
print()
print("Formula:  correct_fp_eye_height = character_scale * {:.4f}".format(EYE_RATIO))
print()

print("Recommended fixes:")
for fname in sorted(HTML_FILES):
    fpath = os.path.join(ROOMS_DIR, fname)
    with open(fpath, encoding='utf-8') as f:
        content = f.read()

    char_scale = None
    const_match = re.search(r'const\s+CHARACTER_SCALE\s*=\s*([\d.]+)', content)
    if const_match:
        char_scale = float(const_match.group(1))
    if char_scale is None:
        direct_match = re.search(r'mesh\.scale\.set\(([\d.]+)\s*,\s*[\d.]+\s*,\s*[\d.]+\)', content)
        if direct_match:
            char_scale = float(direct_match.group(1))

    eye_match = re.search(
        r'(?:camera\.position\.copy\(p\.mesh\.position\)|headPos\s*=.*?mesh\.position).*?(?:add|Vector3)\s*\(\s*0\s*,\s*([\d.]+)\s*,\s*0',
        content, re.DOTALL
    )
    if not eye_match:
        eye_match = re.search(r'new THREE\.Vector3\(\s*0\s*,\s*([\d.]+)\s*,\s*0\s*\)', content)

    if char_scale is None:
        continue

    correct_eye = round(char_scale * EYE_RATIO, 4)
    fp_eye = float(eye_match.group(1)) if eye_match else None

    if fp_eye is not None and abs(fp_eye - correct_eye) >= 0.01:
        print(f"  {fname}: change FP eye offset  {fp_eye} → {correct_eye}")
    elif fp_eye is None:
        print(f"  {fname}: could not detect FP eye offset (char scale={char_scale})")
