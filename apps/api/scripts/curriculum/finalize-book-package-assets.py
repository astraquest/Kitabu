import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


COVER_SIZE = (1200, 1600)
MARGIN = 72


def load_font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


TITLE_FONT = load_font(118, True)
SUBJECT_FONT = load_font(70, True)
GRADE_FONT = load_font(44, True)
BODY_FONT = load_font(30)
SMALL_FONT = load_font(24, True)


def hex_to_rgb(value):
    value = (value or "#047857").lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    try:
        return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
    except ValueError:
        return (4, 120, 87)


def clamp(value):
    return max(0, min(255, value))


def shade(rgb, amount):
    return tuple(clamp(channel + amount) for channel in rgb)


def text_width(draw, text, font):
    return draw.textbbox((0, 0), text, font=font)[2]


def draw_centered(draw, text, y, font, fill, max_width, line_height):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        attempt = f"{current} {word}".strip()
        if text_width(draw, attempt, font) <= max_width or not current:
            current = attempt
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        width = text_width(draw, line, font)
        draw.text(((COVER_SIZE[0] - width) / 2, y), line, font=font, fill=fill)
        y += line_height
    return y


def draw_centered_in_box(draw, text, box, font, fill, line_height):
    left, top, right, bottom = box
    max_width = right - left - 24
    words = text.split()
    lines = []
    current = ""
    for word in words:
        attempt = f"{current} {word}".strip()
        if text_width(draw, attempt, font) <= max_width or not current:
            current = attempt
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    total_height = len(lines) * line_height
    y = top + ((bottom - top - total_height) / 2)
    for line in lines:
        width = text_width(draw, line, font)
        draw.text((left + ((right - left - width) / 2), y), line, font=font, fill=fill)
        y += line_height


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_record(package_dir, relative_path, mime_type):
    path = package_dir / relative_path
    if not path.exists():
        return None
    return {
        "path": str(relative_path).replace("\\", "/"),
        "mimeType": mime_type,
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def fit_cover(image, size):
    source = image.convert("RGB")
    scale = max(size[0] / source.width, size[1] / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def draw_shadowed_center(draw, text, y, font, fill, max_width, line_height, shadow=(0, 0, 0)):
    for dx, dy in [(4, 5), (2, 3)]:
        draw_centered(draw, text, y + dy, font, shadow, max_width, line_height)
    return draw_centered(draw, text, y, font, fill, max_width, line_height)


def draw_art_cover(package_dir, manifest, art_path):
    subject_color = hex_to_rgb(manifest.get("subjectColor"))
    dark = shade(subject_color, -58)
    grade = str(manifest.get("grade") or "")
    subject = str(manifest.get("subject") or "")
    country = str(manifest.get("country") or "")
    curriculum = str(manifest.get("curriculum") or "")

    image = fit_cover(Image.open(art_path), COVER_SIZE)
    overlay = Image.new("RGBA", COVER_SIZE, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle((0, 0, COVER_SIZE[0], 520), fill=(255, 255, 255, 214))
    overlay_draw.rectangle((0, 1220, COVER_SIZE[0], COVER_SIZE[1]), fill=(0, 72, 42, 150))
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((38, 38, COVER_SIZE[0] - 38, COVER_SIZE[1] - 38), radius=34, outline=(255, 255, 255), width=8)
    draw_shadowed_center(draw, "KITABU", 82, TITLE_FONT, dark, COVER_SIZE[0] - 2 * MARGIN, 100, shadow=(255, 255, 255))
    draw_shadowed_center(draw, "QUEST", 182, TITLE_FONT, (245, 185, 28), COVER_SIZE[0] - 2 * MARGIN, 100, shadow=dark)

    draw.rounded_rectangle((330, 320, 870, 396), radius=28, fill=dark)
    draw_centered_in_box(draw, grade, (330, 320, 870, 396), GRADE_FONT, (255, 255, 255), 52)

    draw.rounded_rectangle((MARGIN, 430, COVER_SIZE[0] - MARGIN, 552), radius=26, fill=(255, 255, 255), outline=dark, width=4)
    draw_centered(draw, subject.upper(), 450, SUBJECT_FONT, dark, COVER_SIZE[0] - 2 * MARGIN - 32, 72)

    callouts = ["Clear lessons", "Worked examples", "Fun activities", "Real-life problems"]
    y = 1240
    for callout in callouts:
        draw.rounded_rectangle((MARGIN, y, 506, y + 56), radius=24, fill=(255, 255, 255))
        draw.ellipse((MARGIN + 18, y + 14, MARGIN + 46, y + 42), fill=(245, 185, 28))
        draw.text((MARGIN + 62, y + 13), callout, font=SMALL_FONT, fill=dark)
        y += 66

    draw.rounded_rectangle((790, 1210, 1115, 1536), radius=162, fill=(245, 185, 28), outline=(255, 255, 255), width=10)
    draw_centered_in_box(draw, "GRADE", (822, 1270, 1083, 1328), GRADE_FONT, dark, 52)
    grade_number = "".join(ch for ch in grade if ch.isdigit()) or grade[-2:]
    draw_centered_in_box(draw, grade_number, (822, 1338, 1083, 1476), load_font(132, True), dark, 132)

    draw.text((MARGIN, COVER_SIZE[1] - 96), f"{country} {curriculum} aligned draft", font=SMALL_FONT, fill=(255, 255, 255))
    assets_dir = package_dir / "assets"
    cover_path = assets_dir / "cover.png"
    image.save(cover_path)
    return cover_path


def draw_cover(package_dir, manifest):
    art_path = package_dir / "assets" / "cover-art.png"
    if art_path.exists():
        return draw_art_cover(package_dir, manifest, art_path)

    subject_color = hex_to_rgb(manifest.get("subjectColor"))
    dark = shade(subject_color, -48)
    light = shade(subject_color, 58)
    image = Image.new("RGB", COVER_SIZE, light)
    draw = ImageDraw.Draw(image)

    for y in range(COVER_SIZE[1]):
        t = y / COVER_SIZE[1]
        rgb = tuple(int(light[i] * (1 - t) + dark[i] * t) for i in range(3))
        draw.line((0, y, COVER_SIZE[0], y), fill=rgb)

    draw.rounded_rectangle((38, 38, COVER_SIZE[0] - 38, COVER_SIZE[1] - 38), radius=34, outline=(255, 255, 255), width=8)
    draw.pieslice((-280, 160, 760, 1200), 245, 75, fill=shade(subject_color, 30))
    draw.pieslice((520, 420, 1480, 1460), 90, 280, fill=shade(subject_color, -20))

    mascot = manifest.get("mascot") or {}
    species = str(mascot.get("species") or "mascot").title()
    scene = ((manifest.get("cover") or {}).get("scene") or "").strip()
    grade = str(manifest.get("grade") or "")
    subject = str(manifest.get("subject") or "")
    country = str(manifest.get("country") or "")
    curriculum = str(manifest.get("curriculum") or "")

    draw.rounded_rectangle((MARGIN, 86, COVER_SIZE[0] - MARGIN, 258), radius=30, fill=(255, 255, 255))
    draw_centered(draw, "KITABU", 100, TITLE_FONT, dark, COVER_SIZE[0] - 2 * MARGIN, 100)
    draw_centered(draw, "QUEST", 198, TITLE_FONT, (245, 185, 28), COVER_SIZE[0] - 2 * MARGIN, 100)

    draw.rounded_rectangle((330, 330, 870, 406), radius=28, fill=dark)
    draw_centered_in_box(draw, grade, (330, 330, 870, 406), GRADE_FONT, (255, 255, 255), 52)

    draw.rounded_rectangle((MARGIN, 450, COVER_SIZE[0] - MARGIN, 572), radius=26, fill=(255, 255, 255))
    draw_centered(draw, subject.upper(), 470, SUBJECT_FONT, dark, COVER_SIZE[0] - 2 * MARGIN - 32, 72)

    mascot_box = (MARGIN, 640, COVER_SIZE[0] - MARGIN, 925)
    draw.rounded_rectangle(mascot_box, radius=30, fill=(255, 255, 255))
    draw.ellipse((MARGIN + 36, 680, MARGIN + 224, 868), fill=shade(subject_color, 70), outline=dark, width=6)
    draw_centered_in_box(draw, species, (MARGIN + 42, 686, MARGIN + 218, 862), SMALL_FONT, dark, 30)
    draw.text((MARGIN + 260, 684), "Cover scene", font=SMALL_FONT, fill=dark)
    scene_text = scene[:210] + ("..." if len(scene) > 210 else "")
    y = 728
    for line in wrap_text(draw, scene_text, BODY_FONT, COVER_SIZE[0] - 2 * MARGIN - 300):
        draw.text((MARGIN + 260, y), line, font=BODY_FONT, fill=(31, 41, 55))
        y += 38

    callouts = ["Clear lessons", "Worked examples", "Fun activities", "Real-life problems"]
    y = 1015
    for callout in callouts:
        draw.rounded_rectangle((MARGIN, y, 510, y + 56), radius=24, fill=(255, 255, 255))
        draw.ellipse((MARGIN + 18, y + 14, MARGIN + 46, y + 42), fill=(245, 185, 28))
        draw.text((MARGIN + 62, y + 13), callout, font=SMALL_FONT, fill=dark)
        y += 74

    draw.rounded_rectangle((790, 1112, 1115, 1438), radius=162, fill=(245, 185, 28), outline=(255, 255, 255), width=10)
    draw_centered_in_box(draw, "GRADE", (822, 1172, 1083, 1230), GRADE_FONT, dark, 52)
    grade_number = "".join(ch for ch in grade if ch.isdigit()) or grade[-2:]
    draw_centered_in_box(draw, grade_number, (822, 1240, 1083, 1378), load_font(132, True), dark, 132)

    draw.text((MARGIN, COVER_SIZE[1] - 130), f"{country} {curriculum} aligned draft", font=SMALL_FONT, fill=(255, 255, 255))
    draw.text((MARGIN, COVER_SIZE[1] - 92), "Think - Explore - Achieve", font=BODY_FONT, fill=(255, 255, 255))

    assets_dir = package_dir / "assets"
    assets_dir.mkdir(exist_ok=True)
    cover_path = assets_dir / "cover.png"
    image.save(cover_path)
    return cover_path


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        attempt = f"{current} {word}".strip()
        if text_width(draw, attempt, font) <= max_width or not current:
            current = attempt
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def finalize_package(package_dir):
    manifest_path = package_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    cover_path = draw_cover(package_dir, manifest)

    downloads = manifest.get("downloads") or {}
    download_files = {}
    candidates = {
        "markdown": (downloads.get("markdown"), "text/markdown; charset=utf-8"),
        "pagesJson": (downloads.get("pagesJson") or "pages.json", "application/json; charset=utf-8"),
        "sourceMap": (downloads.get("sourceMap") or "source-map.json", "application/json; charset=utf-8"),
        "pdf": (downloads.get("pdf") or f"{manifest['bookId']}.pdf", "application/pdf"),
    }
    for key, (relative_path, mime_type) in candidates.items():
        record = file_record(package_dir, relative_path, mime_type)
        if record:
            download_files[key] = record

    cover_record = file_record(package_dir, cover_path.relative_to(package_dir), "image/png")
    assets = [
        {
            **cover_record,
            "kind": "cover",
            "altText": f"{manifest.get('title')} cover with {manifest.get('mascot', {}).get('species', 'subject mascot')}",
            "generation": "imagegen-composition" if (package_dir / "assets" / "cover-art.png").exists() else "deterministic-cover-composition",
        }
    ]
    cover_art_record = file_record(package_dir, Path("assets") / "cover-art.png", "image/png")
    if cover_art_record:
        assets.append({
            **cover_art_record,
            "kind": "cover-artwork-source",
            "altText": f"Imagegen artwork background for {manifest.get('title')}",
            "generation": "imagegen",
        })
    manifest["assets"] = assets
    manifest["coverImage"] = cover_record
    manifest["downloadFiles"] = download_files
    manifest["packageChecksum"] = hashlib.sha256(
        "".join(sorted(record["sha256"] for record in [*download_files.values(), cover_record] if record)).encode("utf-8")
    ).hexdigest()
    manifest_path.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    return manifest["bookId"]


def iter_packages(root):
    for manifest_path in root.rglob("manifest.json"):
        yield manifest_path.parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="apps/api/data/books")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    root = Path(args.root)
    processed = []
    for index, package_dir in enumerate(iter_packages(root)):
        if args.limit is not None and index >= args.limit:
            break
        processed.append(finalize_package(package_dir))

    print(json.dumps({"processed": len(processed), "sample": processed[:5]}, indent=2))


if __name__ == "__main__":
    main()
