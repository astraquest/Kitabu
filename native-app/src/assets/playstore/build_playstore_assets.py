from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import shutil


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "native-app" / "src" / "assets" / "playstore"
SOURCE = OUT / "source"
PHONE = OUT / "phone"
TABLET_7 = OUT / "tablet-7-inch"
TABLET_10 = OUT / "tablet-10-inch"
FEATURE = OUT / "feature-graphic"
ICON = OUT / "icon"

for folder in (SOURCE, PHONE, TABLET_7, TABLET_10, FEATURE, ICON):
    folder.mkdir(parents=True, exist_ok=True)


BRAND = {
    "navy": (10, 18, 35),
    "blue": (37, 99, 235),
    "orange": (255, 105, 24),
    "green": (22, 148, 72),
    "ink": (17, 24, 39),
    "muted": (95, 108, 130),
    "paper": (250, 248, 242),
    "white": (255, 255, 255),
}

FONT_REGULAR = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    iw, ih = image.size
    tw, th = size
    scale = max(tw / iw, th / ih)
    resized = image.resize((round(iw * scale), round(ih * scale)), Image.Resampling.LANCZOS)
    x = (resized.width - tw) // 2
    y = (resized.height - th) // 2
    return resized.crop((x, y, x + tw, y + th))


def contain_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    iw, ih = image.size
    tw, th = size
    scale = min(tw / iw, th / ih)
    return image.resize((round(iw * scale), round(ih * scale)), Image.Resampling.LANCZOS)


def round_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def shadowed_card(canvas: Image.Image, card: Image.Image, xy: tuple[int, int], radius: int, shadow=24) -> None:
    x, y = xy
    mask = round_mask(card.size, radius)
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rounded_rectangle(
        (x, y + 16, x + card.width, y + 16 + card.height),
        radius=radius,
        fill=(13, 27, 49, 52),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow))
    canvas.alpha_composite(shadow_layer)
    canvas.paste(card, xy, mask)


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], width: int, fnt, fill, line_gap=10):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        probe = f"{current} {word}".strip()
        if draw.textbbox((0, 0), probe, font=fnt)[2] <= width or not current:
            current = probe
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += draw.textbbox((0, 0), line, font=fnt)[3] + line_gap
    return y


def make_gradient(size: tuple[int, int], accent=(255, 105, 24)) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, BRAND["paper"])
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / max(1, w - 1)) * 0.55 + (y / max(1, h - 1)) * 0.45
            base = (
                int(248 - 18 * t),
                int(249 - 25 * t),
                int(252 - 34 * t),
            )
            warm = (
                int(base[0] * 0.92 + accent[0] * 0.08 * (1 - t)),
                int(base[1] * 0.94 + accent[1] * 0.06 * (1 - t)),
                int(base[2] * 0.96 + accent[2] * 0.04 * (1 - t)),
            )
            px[x, y] = warm
    return img


def draw_brand_marks(canvas: Image.Image, accent=BRAND["orange"]):
    draw = ImageDraw.Draw(canvas, "RGBA")
    w, h = canvas.size
    draw.ellipse((-w * 0.18, -h * 0.10, w * 0.20, h * 0.12), fill=accent + (28,))
    draw.ellipse((w * 0.82, h * 0.73, w * 1.20, h * 1.04), fill=BRAND["blue"] + (22,))
    draw.ellipse((w * 0.88, -h * 0.07, w * 1.16, h * 0.12), fill=BRAND["navy"] + (16,))
    draw.rounded_rectangle((w * 0.08, h * 0.91, w * 0.45, h * 0.94), radius=14, fill=accent + (42,))


def logo_wordmark(draw: ImageDraw.ImageDraw, x: int, y: int, scale=1.0):
    draw.text((x, y), "KITABU", font=font(round(38 * scale), True), fill=BRAND["ink"])
    offset = draw.textbbox((x, y), "KITABU", font=font(round(38 * scale), True))[2] - x + round(4 * scale)
    draw.text((x + offset, y), ".AI", font=font(round(38 * scale), True), fill=(226, 22, 36))


def make_phone_asset(source: Path, out: Path, headline: str, subhead: str, accent=BRAND["orange"]):
    size = (1080, 1920)
    canvas = make_gradient(size, accent).convert("RGBA")
    draw_brand_marks(canvas, accent)
    draw = ImageDraw.Draw(canvas)

    logo_wordmark(draw, 84, 72, 1.0)
    y = draw_wrapped(draw, headline, (84, 172), 760, font(58, True), BRAND["ink"], 12)
    draw_wrapped(draw, subhead, (84, y + 12), 760, font(30), BRAND["muted"], 8)

    src = Image.open(source).convert("RGB")
    crop = cover_resize(src, (852, 1310))
    card = Image.new("RGBA", (900, 1358), BRAND["white"] + (255,))
    inner = Image.new("RGBA", crop.size, (255, 255, 255, 255))
    inner.paste(crop, (0, 0))
    card.alpha_composite(inner, (24, 24))
    shadowed_card(canvas, card, (90, 500), 58, 28)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((84, 1806, 996, 1844), radius=19, fill=accent)
    canvas.convert("RGB").save(out, "PNG", optimize=True)


def make_tablet_asset(source: Path, out: Path, size: tuple[int, int], headline: str, subhead: str, accent=BRAND["orange"]):
    canvas = make_gradient(size, accent).convert("RGBA")
    draw_brand_marks(canvas, accent)
    draw = ImageDraw.Draw(canvas)
    margin = round(size[0] * 0.07)
    logo_wordmark(draw, margin, round(size[1] * 0.045), 1.05)
    y = draw_wrapped(draw, headline, (margin, round(size[1] * 0.14)), round(size[0] * 0.70), font(round(size[0] * 0.052), True), BRAND["ink"], 12)
    draw_wrapped(draw, subhead, (margin, y + 16), round(size[0] * 0.68), font(round(size[0] * 0.027)), BRAND["muted"], 8)

    src = Image.open(source).convert("RGB")
    max_w = round(size[0] * 0.72)
    max_h = round(size[1] * 0.64)
    shot = contain_resize(src, (max_w, max_h))
    card = Image.new("RGBA", (shot.width + 54, shot.height + 54), BRAND["white"] + (255,))
    card.alpha_composite(shot.convert("RGBA"), (27, 27))
    x = (size[0] - card.width) // 2
    y = size[1] - card.height - round(size[1] * 0.07)
    shadowed_card(canvas, card, (x, y), round(size[0] * 0.04), 32)
    canvas.convert("RGB").save(out, "PNG", optimize=True)


def make_feature(sources: list[Path], backdrop: Path, out: Path):
    size = (1024, 500)
    bg = cover_resize(Image.open(backdrop).convert("RGB"), size).convert("RGBA")
    overlay = Image.new("RGBA", size, (255, 255, 255, 136))
    bg.alpha_composite(overlay)
    draw = ImageDraw.Draw(bg)
    logo_wordmark(draw, 56, 52, 1.0)
    draw_wrapped(draw, "CBC learning, AI tutoring, and progress insights", (56, 130), 430, font(42, True), BRAND["ink"], 8)
    draw_wrapped(draw, "For learners, parents, and teachers.", (58, 302), 430, font(25), BRAND["muted"], 7)
    draw.rounded_rectangle((56, 384, 338, 428), radius=22, fill=BRAND["orange"])
    draw.text((78, 392), "Built for everyday study", font=font(19, True), fill=BRAND["white"])

    x = 532
    for idx, source in enumerate(sources[:3]):
        src = Image.open(source).convert("RGB")
        shot = cover_resize(src, (178, 316))
        card = Image.new("RGBA", (196, 334), BRAND["white"] + (255,))
        card.alpha_composite(shot.convert("RGBA"), (9, 9))
        y = 80 + idx * 28
        shadowed_card(bg, card, (x + idx * 118, y), 24, 18)
    bg.convert("RGB").save(out, "PNG", optimize=True)


def main():
    generated_backdrop = Path("C:/Users/NDIZIFLIX/.codex/generated_images/019f393f-fdb6-71b0-b5e8-9ff7e9f25372/ig_0f15c499c9c8f20f016a4cc46ead24819182f5a9ccc25789ee.png")
    backdrop_target = SOURCE / "kitabu-playstore-brand-backdrop-imagegen.png"
    if generated_backdrop.exists():
        shutil.copy2(generated_backdrop, backdrop_target)

    icon_source = ROOT / "apps" / "web" / "assets" / "kitabu-icon-bold-512.png"
    shutil.copy2(icon_source, ICON / "kitabu-playstore-icon-512.png")

    screenshots = {
        "onboarding": ROOT / "artifacts" / "play-screenshots" / "play-upload" / "phone-01-onboarding.png",
        "library": ROOT / "artifacts" / "play-screenshots" / "play-upload" / "phone-03-kitabu-library.png",
        "rafiki": ROOT / "artifacts" / "play-screenshots" / "play-upload" / "phone-05-ask-rafiki.png",
        "teacher": ROOT / "artifacts" / "play-screenshots" / "play-upload" / "phone-06-teacher-students.png",
    }

    make_phone_asset(
        screenshots["library"],
        PHONE / "phone-01-kitabu-library.png",
        "Interactive books for every learner",
        "Grade-by-grade Kitabu Quest materials for daily CBC revision.",
        BRAND["blue"],
    )
    make_phone_asset(
        screenshots["rafiki"],
        PHONE / "phone-02-ask-rafiki.png",
        "Ask Rafiki for clear study help",
        "Parents and learners get focused prompts for home support.",
        BRAND["orange"],
    )
    make_phone_asset(
        screenshots["teacher"],
        PHONE / "phone-03-teacher-progress.png",
        "Teachers track class progress",
        "See student averages, active learners, and support needs quickly.",
        BRAND["green"],
    )
    make_phone_asset(
        screenshots["onboarding"],
        PHONE / "phone-04-start-learning.png",
        "Start with a guided learning path",
        "A simple entry point for learners, parents, and teachers.",
        BRAND["orange"],
    )

    tablet_specs = [
        (TABLET_7, (1200, 1920), "7in"),
        (TABLET_10, (1600, 2560), "10in"),
    ]
    for folder, size, label in tablet_specs:
        make_tablet_asset(
            screenshots["library"],
            folder / f"{label}-01-kitabu-library.png",
            size,
            "A full learning library in one place",
            "CBC-aligned books and subjects presented for quick revision.",
            BRAND["blue"],
        )
        make_tablet_asset(
            screenshots["rafiki"],
            folder / f"{label}-02-ask-rafiki.png",
            size,
            "Guided AI support for home learning",
            "Ask focused questions about a learner's progress and next practice.",
            BRAND["orange"],
        )
        make_tablet_asset(
            screenshots["teacher"],
            folder / f"{label}-03-teacher-progress.png",
            size,
            "Teacher visibility across the class",
            "Quickly spot strong performance and learners who need support.",
            BRAND["green"],
        )

    make_feature(
        [screenshots["library"], screenshots["rafiki"], screenshots["teacher"]],
        backdrop_target,
        FEATURE / "kitabu-feature-graphic-1024x500.png",
    )

    # Include conservative, no-overlay originals for review fallback.
    fallback = OUT / "phone-original-fallback"
    fallback.mkdir(exist_ok=True)
    for name, source in screenshots.items():
        shutil.copy2(source, fallback / f"fallback-{name}.png")


if __name__ == "__main__":
    main()
