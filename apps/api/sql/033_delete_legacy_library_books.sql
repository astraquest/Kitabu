-- Generated book packages are now the source of truth for library content.
-- Legacy library_books rows are metadata-only and can open unreadable reader entries.
DELETE FROM library_books;
