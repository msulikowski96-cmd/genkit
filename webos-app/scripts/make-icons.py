"""Generate the webOS launcher icons (icon.png 80x80, largeIcon.png 130x130).

Usage: python3 scripts/make-icons.py   (needs Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

APP_DIR = Path(__file__).resolve().parent.parent / "app"
SCALE = 8  # draw large, then downsample for smooth edges


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def draw_icon(size: int) -> Image.Image:
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Diagonal violet gradient background.
    top, bottom = (124, 92, 255), (36, 24, 102)
    grad = Image.new("RGBA", (s, s))
    px = grad.load()
    for y in range(s):
        for x in range(s):
            px[x, y] = lerp(top, bottom, (x + y) / (2 * s)) + (255,)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=s // 5, fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)

    # Speech bubble.
    m = s * 0.2
    bubble = (m, m * 1.05, s - m, s - m * 1.45)
    d.rounded_rectangle(bubble, radius=s * 0.13, fill=(255, 255, 255, 255))
    tail_x = s * 0.34
    d.polygon(
        [(tail_x, bubble[3] - 2), (tail_x + s * 0.14, bubble[3] - 2), (tail_x - s * 0.02, s - m * 0.85)],
        fill=(255, 255, 255, 255),
    )

    # Four-point sparkle inside the bubble.
    cx = (bubble[0] + bubble[2]) / 2
    cy = (bubble[1] + bubble[3]) / 2
    r, w = s * 0.17, s * 0.045
    d.polygon(
        [(cx, cy - r), (cx + w, cy - w), (cx + r, cy), (cx + w, cy + w),
         (cx, cy + r), (cx - w, cy + w), (cx - r, cy), (cx - w, cy - w)],
        fill=(109, 74, 255, 255),
    )

    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    draw_icon(80).save(APP_DIR / "icon.png")
    draw_icon(130).save(APP_DIR / "largeIcon.png")
    print("Icons written to", APP_DIR)
