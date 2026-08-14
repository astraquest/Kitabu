ALTER TABLE quiz_bank_questions
  ADD COLUMN IF NOT EXISTS image_key TEXT;

ALTER TABLE quiz_bank_questions
  DROP CONSTRAINT IF EXISTS quiz_bank_questions_image_key_check;

ALTER TABLE quiz_bank_questions
  ADD CONSTRAINT quiz_bank_questions_image_key_check
  CHECK (image_key IS NULL OR image_key ~ '^image-library/v1/[a-z0-9]+(?:-[a-z0-9]+)*\\.png$');
