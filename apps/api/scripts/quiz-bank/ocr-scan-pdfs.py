#!/usr/bin/env python3
"""OCR scanned exam PDFs into text mirrors for the QuizBank harvest pipeline.

Usage:
  python apps/api/scripts/quiz-bank/ocr-scan-pdfs.py <source-dir> <output-dir> [--only <substring>] [--force]

Walks <source-dir> for PDFs whose embedded text layer is empty (scanned images),
renders each page with PyMuPDF at ~200 DPI grayscale, runs Tesseract OCR, and
writes <output-dir>/<relative-path>.txt mirrors that import-exam-harvest.mjs
already knows how to route. Existing non-empty outputs are skipped unless --force.
"""
import argparse
import os
import re
import sys

import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

if os.name == "nt":
    default_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default_tesseract):
        pytesseract.pytesseract.tesseract_cmd = default_tesseract


def sanitize_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)


WATERMARK_LINE = re.compile(r"Download this and other FREE materials from", re.IGNORECASE)


def embedded_text_length(pdf_path: str) -> int:
    try:
        with fitz.open(pdf_path) as doc:
            total = 0
            for page in doc:
                text = "\n".join(
                    line for line in page.get_text("text").splitlines()
                    if not WATERMARK_LINE.search(line)
                ).strip()
                total += len(text)
                if total >= 200:
                    break
            return total
    except Exception:
        return -1


def ocr_pdf(pdf_path: str, dpi: int = 200) -> str:
    parts = []
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    with fitz.open(pdf_path) as doc:
        for page in doc:
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csGRAY)
            image = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(image, lang="eng", config="--psm 4")
            parts.append(text.strip())
    return "\n".join(part for part in parts if part)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir")
    parser.add_argument("output_dir")
    parser.add_argument("--only", default=None, help="process paths containing this substring")
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    src_root = os.path.abspath(args.source_dir)
    out_root = os.path.abspath(args.output_dir)
    if not os.path.isdir(src_root):
        print(f"source dir not found: {src_root}")
        return 1

    targets = []
    for dirpath, _dirnames, filenames in os.walk(src_root):
        for filename in sorted(filenames):
            if not filename.lower().endswith(".pdf"):
                continue
            src_path = os.path.join(dirpath, filename)
            rel = os.path.relpath(src_path, src_root)
            if args.only and args.only.lower() not in rel.replace("\\", "/").lower():
                continue
            out_path = os.path.join(out_root, sanitize_name(os.path.dirname(rel)), sanitize_name(filename[:-4]) + ".txt") \
                if os.path.dirname(rel) != "." else os.path.join(out_root, sanitize_name(filename[:-4]) + ".txt")
            has_text = False
            if not args.force and os.path.exists(out_path):
                try:
                    with open(out_path, "r", encoding="utf-8") as handle:
                        has_text = len(handle.read().strip()) > 300
                except OSError:
                    has_text = False
            if has_text:
                continue
            targets.append((src_path, out_path))

    print(f"OCR queue: {len(targets)} scanned PDF(s)")
    ocred = skipped_text_layer = failed = 0
    for index, (src_path, out_path) in enumerate(targets, 1):
        try:
            if embedded_text_length(src_path) >= 200:
                skipped_text_layer += 1
                continue
            text = ocr_pdf(src_path, dpi=args.dpi)
            if len(text.strip()) < 100:
                failed += 1
                print(f"EMPTY {src_path}")
                continue
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path + ".ocr.tmp", "w", encoding="utf-8") as handle:
                handle.write(text)
            os.replace(out_path + ".ocr.tmp", out_path)
            ocred += 1
        except Exception as error:  # noqa: BLE001 - harvest tooling
            failed += 1
            print(f"FAILED {src_path}: {error}")
        if index % 25 == 0 or index == len(targets):
            print(f"progress {index}/{len(targets)} ok={ocred} textLayer={skipped_text_layer} failed={failed}", flush=True)

    print(f"ocr-scan-pdfs: ocr={ocred} skippedTextLayer={skipped_text_layer} failed={failed} -> {out_root}")
    return failed > 0 and ocred == 0


if __name__ == "__main__":
    raise SystemExit(main())
