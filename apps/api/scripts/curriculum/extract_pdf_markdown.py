import json
import sys

PARSER = "source-pdf-markdown-extractor"
PARSER_VERSION = "1"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from pypdf import PdfReader
except Exception as exc:
    print(json.dumps({"error": f"pypdf import failed: {exc}"}))
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: extract_pdf_markdown.py <pdf_path>"}))
        sys.exit(1)

    reader = PdfReader(sys.argv[1])
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            text = f"[PAGE_EXTRACTION_ERROR] {exc}"
        pages.append({"pageNumber": index, "text": text})

    print(
        json.dumps(
            {
                "parser": PARSER,
                "parserVersion": PARSER_VERSION,
                "pageCount": len(reader.pages),
                "pages": pages,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
