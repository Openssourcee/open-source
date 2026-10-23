"""Renders the $OS profile picture, banner and explainer video into marca/salida/.

Run from the repo root:
    python marca/render.py stills
    python marca/render.py video
Needs: playwright (chromium), pillow, numpy, ffmpeg on PATH.
"""
import base64
import functools
import http.server
import io
import json
import subprocess
import sys
import threading
import wave
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "marca" / "salida"
PORT = 8791
FPS = 30
SR = 44100


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def grab(page, selector):
    data = page.evaluate(f"document.querySelector('{selector}').toDataURL('image/png')")
    return Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1])))


def stills(page):
    page.goto(f"http://127.0.0.1:{PORT}/marca/stills.html")
    page.wait_for_function("window.done === true", timeout=30000)
    pfp = grab(page, "#pfp").convert("RGB")
    pfp.save(OUT / "pfp_1000.png")
    pfp.resize((400, 400), Image.LANCZOS).save(OUT / "pfp_400.png")
    grab(page, "#banner").convert("RGB").save(OUT / "banner_1500x500.png")
    grab(page, "#post1").convert("RGB").save(OUT / "post_everyone_is_the_dev.png")
    grab(page, "#post2").convert("RGB").save(OUT / "post_fees_to_open_source.png")
    print("stills ok")


# ---------- sound: small chiptune blips and a soft loop, all generated here ----------
def tone(freq, dur, kind="square", vol=0.5, duty=0.25, attack=0.004, decay=None, slide=None):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = np.full(n, float(freq)) if slide is None else np.linspace(freq, slide, n)
    phase = np.cumsum(f) / SR
    if kind == "square":
        w = np.where((phase % 1) < duty, 1.0, -1.0)
    elif kind == "tri":
        w = 4 * np.abs((phase % 1) - 0.5) - 1
    elif kind == "noise":
        w = np.random.default_rng(int(freq)).uniform(-1, 1, n)
    else:
        w = np.sin(2 * np.pi * phase)
    env = np.minimum(1, t / attack) if attack else np.ones(n)
    env *= np.exp(-t / decay) if decay else np.clip(1 - t / dur, 0, 1)
    return w * env * vol


def sfx(name):
    if name == "type":
        return tone(1900, 0.03, "square", 0.18, 0.5, decay=0.008)
    if name == "pop":
        return tone(520, 0.09, "square", 0.28, 0.25, slide=1040, decay=0.04)
    if name == "zap":
        return np.concatenate([tone(880, 0.05, "square", 0.22, 0.5, slide=1320), tone(1320, 0.06, "square", 0.18, 0.5, decay=0.03)])
    if name == "down":
        return tone(660, 0.6, "square", 0.25, 0.5, slide=110, decay=0.3)
    if name == "thud":
        body = tone(150, 0.35, "sine", 0.9, slide=45, decay=0.12)
        body[: int(SR * 0.08)] += tone(90, 0.08, "noise", 0.15, decay=0.02)[: int(SR * 0.08)]
        return body
    if name == "swipe":
        return tone(4000, 0.22, "noise", 0.08, decay=0.09)
    if name == "check":
        return np.concatenate([tone(988, 0.05, "square", 0.2, 0.25), tone(1480, 0.1, "square", 0.2, 0.25, decay=0.05)])
    if name == "chime":
        notes = [523.25, 659.25, 783.99, 1046.5]
        return np.concatenate([tone(f, 0.09, "square", 0.22, 0.25, decay=0.07) for f in notes[:-1]] + [tone(notes[-1], 0.6, "square", 0.22, 0.25, decay=0.25)])
    if name == "whoosh":
        return tone(2000, 0.35, "noise", 0.07, attack=0.15, decay=0.12)
    raise ValueError(name)


def music(duration, mutes, fade_from):
    """A soft loop: triangle bass and a quiet pulse arpeggio. A minor, F, C, G."""
    bpm = 112
    beat = 60 / bpm
    n = int(SR * duration)
    out = np.zeros(n)
    chords = [(220.0, [440, 523.25, 659.25]), (174.61, [349.23, 440, 523.25]), (130.81, [392, 523.25, 659.25]), (196.0, [392, 493.88, 587.33])]
    step = beat / 2
    i = 0
    while i * step < duration:
        start = i * step
        bar = int(start // (beat * 4)) % 4
        root, arp = chords[bar]
        s = int(start * SR)
        b = tone(root / 2, step * 0.95, "tri", 0.30, decay=step * 0.8)
        a = tone(arp[i % 3] * (2 if (i // 3) % 2 else 1), step * 0.9, "square", 0.045, 0.125, decay=step * 0.4)
        seg = b.copy(); seg[: len(a)] += a
        e = min(n, s + len(seg))
        out[s:e] += seg[: e - s]
        i += 1
    t = np.arange(n) / SR
    gain = np.ones(n)
    for a, b in mutes:
        gain[(t >= a) & (t < b)] = 0
        k = (t >= b) & (t < b + 0.05)
        gain[k] = (t[k] - b) / 0.05
    gain *= np.clip(1 - (t - fade_from) / (duration - fade_from), 0, 1)
    gain[t < 0.6] *= t[t < 0.6] / 0.6
    return out * gain


def mix(duration, events, mutes, fade_from, end_chord):
    n = int(SR * (duration + 0.5))
    track = np.zeros(n)
    bed = music(duration, mutes, fade_from)
    track[: len(bed)] += bed
    for at, name in events:
        s = sfx(name)
        i = int(at * SR)
        e = min(n, i + len(s))
        track[i:e] += s[: e - i]
    if end_chord is not None:
        i = int(end_chord * SR)
        chord = sum(tone(f, 3.2, "tri", 0.22, decay=1.2) for f in (261.63, 329.63, 392.0, 523.25))
        e = min(n, i + len(chord))
        track[i:e] += chord[: e - i]
    track = track[: int(SR * duration)]
    track /= max(1e-9, np.abs(track).max()) / 0.89
    return (track * 32767).astype(np.int16)


def video(page):
    page.goto(f"http://127.0.0.1:{PORT}/marca/video.html#render")
    page.wait_for_function("window.ready === true", timeout=30000)
    meta = page.evaluate("({d: DURATION, sfx: SFX, mutes: MUTES, fade: FADE_FROM, chord: END_CHORD})")
    dur = meta["d"]
    wav = OUT / "explainer_audio.wav"
    pcm = mix(dur, meta["sfx"], meta["mutes"], meta["fade"], meta["chord"])
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    mp4 = OUT / "explainer_1080.mp4"
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
        "-i", str(wav), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(mp4),
    ], stdin=subprocess.PIPE)
    frames = int(round(dur * FPS))
    for f in range(frames):
        data = page.evaluate(f"renderAt({f / FPS}), document.getElementById('c').toDataURL('image/png')")
        ff.stdin.write(base64.b64decode(data.split(",", 1)[1]))
        if f % 150 == 0:
            print(f"frame {f}/{frames}", flush=True)
    ff.stdin.close()
    ff.wait()
    wav.unlink()
    print("video ok", mp4)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "stills"
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = serve()
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1600, "height": 1200})
        page.on("console", lambda m: print("console:", m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: print("pageerror:", e))
        if what in ("stills", "all"):
            stills(page)
        if what in ("video", "all"):
            video(page)
        b.close()
    httpd.shutdown()
