#!/usr/bin/env python3
"""Validate encoded audio offline with ffprobe; no browser required."""
import json, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'voice/manifest.json').read_text())
total_bytes = 0; total_duration = 0
rows = []
for cid, info in manifest.items():
    path = root / 'voice' / f'{cid}.mp3'
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    stream = probe['streams'][0]
    assert stream['codec_name'] == 'mp3' and stream['channels'] == 1
    assert stream['sample_rate'] == '24000' and stream['bit_rate'] == '32000'
    duration = float(probe['format']['duration'])
    assert abs(duration - info['dur']) < .25, cid
    total_bytes += path.stat().st_size; total_duration += duration
    rows.append(f'{cid}.mp3\t{duration:.3f} s\t{path.stat().st_size} bytes')
print('\n'.join(rows))
print(f'TOTAL: {len(manifest)} clips, {total_bytes} bytes, {total_duration:.3f} seconds (encoded durations include MP3 padding)')
