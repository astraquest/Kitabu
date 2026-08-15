ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_mascot_key_check;

ALTER TABLE users
  ADD CONSTRAINT users_mascot_key_check
  CHECK (mascot_key IN ('rabbit', 'lion', 'elephant', 'panda'));
