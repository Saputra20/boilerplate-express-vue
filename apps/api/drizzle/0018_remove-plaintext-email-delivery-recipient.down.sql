DO $$
BEGIN
  RAISE EXCEPTION 'Migration 0018 is intentionally irreversible: reverting would restore plaintext recipient PII';
END $$;
