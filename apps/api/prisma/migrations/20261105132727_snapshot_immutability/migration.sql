-- ADR-002: a published (or retired) challenge never changes what the engine sees.
-- Hand-written; Prisma does not manage triggers.
CREATE FUNCTION challenge_snapshot_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('published', 'retired')
     AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot
          OR NEW."snapshotHash" IS DISTINCT FROM OLD."snapshotHash"
          OR NEW."engineVersion" IS DISTINCT FROM OLD."engineVersion") THEN
    RAISE EXCEPTION 'Challenge % is %: snapshot and engineVersion are immutable', OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER challenge_snapshot_immutable
  BEFORE UPDATE ON "Challenge"
  FOR EACH ROW EXECUTE FUNCTION challenge_snapshot_immutable();
