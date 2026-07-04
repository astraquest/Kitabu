#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[4]
BOOK_ROOT = REPO_ROOT / "apps" / "api" / "data" / "books"
REPORT_DIR = REPO_ROOT / "tmp" / "book-agent-notes"
RELEASE_ID = "phase1-testing-release-2026-07-04"

SUBJECT_COLOURS = {
    "Agriculture": "#15803D",
    "Creative Arts": "#DB2777",
    "English": "#2563EB",
    "Kiswahili": "#C2410C",
    "Mathematics": "#047857",
    "Science and Technology": "#7C3AED",
    "Social Studies": "#BE123C",
    "General Science": "#7C3AED",
    "Physics": "#5B21B6",
    "Chemistry": "#0891B2",
    "Biology": "#16A34A",
    "Geography": "#0E7490",
    "History and Political Education": "#BE123C",
    "ICT": "#4338CA",
    "Information Technology": "#4338CA",
    "Entrepreneurship": "#B45309",
    "French": "#1D4ED8",
    "Kinyarwanda": "#C2410C",
}

DEFAULT_MASCOTS = {
    "Agriculture": "honeybee",
    "Creative Arts": "lilac-breasted roller",
    "English": "hare",
    "Kiswahili": "hare",
    "Kinyarwanda": "hare",
    "French": "hare",
    "Mathematics": "lion",
    "Science and Technology": "chameleon",
    "General Science": "chameleon",
    "Physics": "chameleon",
    "Chemistry": "chameleon",
    "Biology": "chameleon",
    "Social Studies": "giraffe",
    "Geography": "giraffe",
    "History and Political Education": "giraffe",
    "ICT": "grey crowned crane",
    "Information Technology": "gelada",
    "Entrepreneurship": "Ankole longhorn cow",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("/usr/share/fonts/truetype/dejavu") / name,
        Path("/Library/Fonts") / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


FONT_BLACK = font("arialbd.ttf", 94)
FONT_BOLD = font("arialbd.ttf", 56)
FONT_MEDIUM = font("arial.ttf", 42)
FONT_SMALL = font("arial.ttf", 30)
FONT_TINY_BOLD = font("arialbd.ttf", 24)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = (value or "#0F766E").strip().lstrip("#")
    if len(value) != 6:
        value = "0F766E"
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textbbox((0, 0), trial, font=font_obj)[2] <= max_width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_centered(draw: ImageDraw.ImageDraw, y: int, text: str, font_obj, fill, max_width: int, line_gap: int = 12) -> int:
    lines = wrap_text(draw, text, font_obj, max_width)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj)
        x = (1600 - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def cover_scene(draw: ImageDraw.ImageDraw, subject: str, colour: tuple[int, int, int]) -> None:
    light = blend(colour, (255, 255, 255), 0.82)
    mid = blend(colour, (255, 255, 255), 0.45)
    dark = blend(colour, (0, 0, 0), 0.18)
    draw.rectangle((0, 0, 1600, 2000), fill=light)
    for i in range(0, 2000, 12):
        t = i / 2000
        shade = blend(light, mid, t)
        draw.line((0, i, 1600, i), fill=shade)

    draw.rounded_rectangle((110, 1180, 1490, 1770), radius=54, fill=(255, 255, 255), outline=blend(colour, (0, 0, 0), 0.1), width=6)
    draw.rectangle((0, 1670, 1600, 2000), fill=blend(colour, (255, 255, 255), 0.72))

    if "Math" in subject:
        for idx, label in enumerate(["+", "=", "x", "%", "7"]):
            x = 220 + idx * 250
            y = 1260 + (idx % 2) * 145
            draw.rounded_rectangle((x, y, x + 145, y + 145), radius=22, fill=blend(colour, (255, 255, 255), 0.62))
            draw.text((x + 45, y + 32), label, font=FONT_BOLD, fill=dark)
    elif any(key in subject for key in ["Science", "Biology", "Physics", "Chemistry"]):
        draw.ellipse((245, 1290, 520, 1565), outline=dark, width=10)
        draw.line((520, 1565, 650, 1695), fill=dark, width=18)
        draw.rounded_rectangle((800, 1260, 1180, 1510), radius=34, outline=dark, width=10)
        draw.line((865, 1328, 1115, 1328), fill=dark, width=8)
        draw.line((865, 1408, 1115, 1408), fill=dark, width=8)
    elif "Agriculture" in subject:
        for x in range(210, 1350, 160):
            draw.line((x, 1700, x + 110, 1260), fill=blend(colour, (0, 0, 0), 0.05), width=16)
            draw.ellipse((x - 35, 1360, x + 75, 1450), fill=blend(colour, (255, 255, 255), 0.2))
    elif any(key in subject for key in ["English", "Kiswahili", "French", "Kinyarwanda"]):
        for x in [260, 585, 910]:
            draw.rounded_rectangle((x, 1260, x + 230, 1580), radius=24, fill=blend(colour, (255, 255, 255), 0.6), outline=dark, width=7)
            draw.line((x + 55, 1360, x + 175, 1360), fill=dark, width=7)
            draw.line((x + 55, 1435, x + 175, 1435), fill=dark, width=7)
    elif any(key in subject for key in ["Social", "Geography", "History"]):
        draw.rounded_rectangle((270, 1265, 1185, 1580), radius=32, fill=blend(colour, (255, 255, 255), 0.56), outline=dark, width=8)
        for x in [470, 690, 910]:
            draw.line((x, 1265, x - 40, 1580), fill=dark, width=5)
        draw.line((310, 1420, 1140, 1350), fill=dark, width=5)
        draw.ellipse((720, 1370, 790, 1440), fill=dark)
    elif "Creative" in subject:
        for idx, colour_spot in enumerate([(239, 68, 68), (245, 158, 11), (34, 197, 94), (59, 130, 246), (168, 85, 247)]):
            x = 270 + idx * 200
            draw.ellipse((x, 1300, x + 155, 1455), fill=colour_spot)
        draw.rounded_rectangle((320, 1535, 1080, 1605), radius=30, fill=dark)
    else:
        for x in [260, 590, 920]:
            draw.rounded_rectangle((x, 1280, x + 210, 1570), radius=24, fill=blend(colour, (255, 255, 255), 0.55), outline=dark, width=7)


def render_cover(manifest: dict, cover_path: Path) -> None:
    subject = manifest.get("subject", "Subject")
    colour = hex_to_rgb(manifest.get("subjectColor") or SUBJECT_COLOURS.get(subject))
    dark = blend(colour, (0, 0, 0), 0.35)
    image = Image.new("RGB", (1600, 2000), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    cover_scene(draw, subject, colour)

    draw.rectangle((0, 0, 1600, 1120), fill=dark)
    draw.rectangle((0, 1090, 1600, 1135), fill=colour)
    draw.text((130, 120), "KITABU QUEST", font=FONT_TINY_BOLD, fill=(255, 255, 255))
    draw.text((130, 168), f"{manifest.get('country', '')} | {manifest.get('curriculum', '')}", font=FONT_SMALL, fill=(235, 244, 255))
    draw.rounded_rectangle((1090, 112, 1470, 210), radius=36, fill=blend(colour, (255, 255, 255), 0.18), outline=(255, 255, 255), width=3)
    grade = str(manifest.get("grade", "")).upper()
    badge = draw.textbbox((0, 0), grade, font=FONT_SMALL)
    draw.text((1280 - (badge[2] - badge[0]) // 2, 139), grade, font=FONT_SMALL, fill=(255, 255, 255))

    y = 365
    y = draw_centered(draw, y, subject, FONT_BLACK, (255, 255, 255), 1260, 18)
    y += 30
    subtitle = str(manifest.get("title", "")).replace("KITABU QUEST", "").strip()
    draw_centered(draw, y, subtitle, FONT_MEDIUM, (235, 244, 255), 1120, 10)

    mascot = manifest.get("mascot") or {}
    species = mascot.get("species") or DEFAULT_MASCOTS.get(subject, "study guide")
    draw.rounded_rectangle((425, 820, 1175, 955), radius=44, fill=blend(colour, (255, 255, 255), 0.18), outline=(255, 255, 255), width=3)
    mascot_line = f"{species.title()} learning guide"
    draw_centered(draw, 858, mascot_line, FONT_MEDIUM, (255, 255, 255), 660, 8)

    draw.text((130, 1835), "PHASE 1 TESTING EDITION", font=FONT_TINY_BOLD, fill=dark)
    draw.text((130, 1882), "Content review and enhancement continues in Phase 2.", font=FONT_SMALL, fill=blend(dark, (255, 255, 255), 0.2))
    draw.text((1188, 1835), "KITABU.AI", font=FONT_TINY_BOLD, fill=dark)

    cover_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(cover_path, "PNG", optimize=True)


def pages_count(package_dir: Path) -> int:
    pages_path = package_dir / "pages.json"
    if not pages_path.exists():
        return 0
    payload = read_json(pages_path)
    pages = payload if isinstance(payload, list) else payload.get("pages", [])
    return len(pages) if isinstance(pages, list) else 0


def is_package_readable(package_dir: Path, manifest: dict) -> bool:
    if pages_count(package_dir) <= 0:
        return False
    pdf_name = (manifest.get("downloads") or {}).get("pdf") or f"{manifest.get('bookId')}.pdf"
    return (package_dir / "source-map.json").is_file() and (package_dir / pdf_name).is_file()


def phase1_publish(dry_run: bool = False) -> dict:
    manifest_paths = sorted(BOOK_ROOT.rglob("manifest.json"))
    report = {
        "releaseId": RELEASE_ID,
        "generatedAt": now_iso(),
        "dryRun": dry_run,
        "totalManifests": len(manifest_paths),
        "publishedForTesting": 0,
        "skippedUnreadable": 0,
        "coversGenerated": 0,
        "coversPreserved": 0,
        "coverPointersUpdated": 0,
        "byCountry": {},
        "warnings": [],
    }

    for manifest_path in manifest_paths:
        package_dir = manifest_path.parent
        manifest = read_json(manifest_path)
        country = manifest.get("country") or package_dir.parts[-4]
        report["byCountry"].setdefault(country, {"published": 0, "coversGenerated": 0, "coversPreserved": 0})

        if not is_package_readable(package_dir, manifest):
            report["skippedUnreadable"] += 1
            report["warnings"].append(f"Skipped unreadable package: {manifest_path.relative_to(REPO_ROOT)}")
            continue

        cover_path = package_dir / "assets" / "cover.png"
        if cover_path.exists():
            report["coversPreserved"] += 1
            report["byCountry"][country]["coversPreserved"] += 1
        else:
            report["coversGenerated"] += 1
            report["byCountry"][country]["coversGenerated"] += 1
            if not dry_run:
                render_cover(manifest, cover_path)

        if not cover_path.exists() and dry_run:
            size = 0
            digest = "dry-run"
        else:
            size = cover_path.stat().st_size
            digest = sha256_file(cover_path)

        cover_asset = {
            "path": "assets/cover.png",
            "mimeType": "image/png",
            "sizeBytes": size,
            "sha256": digest,
            "kind": "cover",
            "altText": f"{manifest.get('title', 'KITABU QUEST book')} cover",
            "generation": manifest.get("coverAssetStatus") or "phase1-testing-deterministic-cover-composition",
        }

        existing_assets = [asset for asset in manifest.get("assets", []) if not (isinstance(asset, dict) and asset.get("kind") == "cover")]
        manifest["assets"] = existing_assets + [cover_asset]
        manifest["coverImage"] = {key: cover_asset[key] for key in ["path", "mimeType", "sizeBytes", "sha256"]}
        manifest["coverStatus"] = "phase1-testing-cover-attached"
        manifest["coverAssetStatus"] = "phase1-testing-cover-ready"
        manifest["status"] = "published-for-testing"
        manifest["publicationStatus"] = "published-for-testing"
        manifest["testingRelease"] = {
            "id": RELEASE_ID,
            "publishedAt": report["generatedAt"],
            "scope": "manual testing snapshot",
            "contentReviewPaused": True,
            "phase2Required": True,
            "contentStatusPreserved": manifest.get("contentStatus"),
            "note": "Published for app testing only. Content review and enhancement remain open."
        }
        manifest["reviewStatus"] = manifest.get("reviewStatus") or "phase2-content-enhancement-required"

        report["publishedForTesting"] += 1
        report["coverPointersUpdated"] += 1
        report["byCountry"][country]["published"] += 1

        if not dry_run:
            write_json(manifest_path, manifest)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"{RELEASE_ID}.json"
    if not dry_run:
        write_json(report_path, report)
    report["reportPath"] = str(report_path.relative_to(REPO_ROOT))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish generated KITABU QUEST packages for Phase 1 testing.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    report = phase1_publish(dry_run=args.dry_run)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
