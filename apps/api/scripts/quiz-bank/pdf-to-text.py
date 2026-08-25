#!/usr/bin/env python3
"""Convert harvested exam PDFs to plain-text mirrors for the exam harvest pipeline.

Usage:
  python apps/api/scripts/quiz-bank/pdf-to-text.py <source-dir> <output-dir>

Mirrors <source-dir>/**/<name>.pdf to <output-dir>/<relative-path>/<name>.txt
using pypdf text extraction. Skips PDFs whose text layer is empty/scanned.
"""
import sys
import os
import re

from pypdf import PdfReader


def sanitize_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    src_root = os.path.abspath(sys.argv[1])
    out_root = os.path.abspath(sys.argv[2])
    if not os.path.isdir(src_root):
        print(f"source dir not found: {src_root}")
        return 1

    converted = empty = failed = skipped_non_pdf = 0
    for dirpath, _dirnames, filenames in os.walk(src_root):
        for filename in sorted(filenames):
            if not filename.lower().endswith(".pdf"):
                skipped_non_pdf += 1
                continue
            src_path = os.path.join(dirpath, filename)
            rel_dir = os.path.relpath(dirpath, src_root)
            out_dir = out_root if rel_dir == "." else os.path.join(out_root, sanitize_name(rel_dir))
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, sanitize_name(filename[:-4]) + ".txt")
            try:
                reader = PdfReader(src_path)
                pages = [(page.extract_text() or "") for page in reader.pages]
                text = "\n".join(pages).strip()
                if len(text) < 200:
                    empty += 1
                    continue
                with open(out_path, "w", encoding="utf-8") as handle:
                    handle.write(text)
                converted += 1
            except Exception as error:  # noqa: BLE001 - harvest tooling
                print(f"FAILED {src_path}: {error}")
                failed += 1
    print(
        f"pdf-to-text: converted={converted} scannedOrEmpty={empty} "
        f"failed={failed} nonPdf={skipped_non_pdf} -> {out_root}"
    )
    return failed > 0


if __name__ == "__main__":
    raise SystemExit(main())
