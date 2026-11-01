-- Apply after 001_schema.sql in Supabase SQL editor as the table owner.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.jude_chunks
  ADD COLUMN IF NOT EXISTS embedding_vector extensions.vector(1536);

CREATE OR REPLACE FUNCTION public.jude_sync_embedding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  IF NEW.embedding IS NOT NULL AND json_typeof(NEW.embedding) = 'array' THEN
    IF json_array_length(NEW.embedding) <> 1536 THEN
      RAISE EXCEPTION 'Jude embeddings must contain 1536 dimensions';
    END IF;
    NEW.embedding_vector := NEW.embedding::text::extensions.vector(1536);
  ELSE
    NEW.embedding_vector := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jude_embedding_sync ON public.jude_chunks;
CREATE TRIGGER jude_embedding_sync BEFORE INSERT OR UPDATE OF embedding
  ON public.jude_chunks FOR EACH ROW EXECUTE FUNCTION public.jude_sync_embedding();
UPDATE public.jude_chunks SET embedding = embedding;
CREATE INDEX IF NOT EXISTS jude_chunks_embedding_hnsw
  ON public.jude_chunks USING hnsw (embedding_vector extensions.vector_cosine_ops);

-- App-owned sessions do not map to auth.uid(). Browser roles have no table policies.
-- Originals are fetched through SvelteKit's owner-checked routes using a backend key.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('jude-documents', 'jude-documents', false, 6291456)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 6291456;
COMMIT;
