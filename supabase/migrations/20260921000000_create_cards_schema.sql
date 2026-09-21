CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_card_no TEXT NOT NULL,
    public_token TEXT NOT NULL,
    destination_url TEXT NULL,
    status TEXT NOT NULL DEFAULT 'READY',
    scan_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cards_internal_card_no_key UNIQUE (internal_card_no),
    CONSTRAINT cards_public_token_key UNIQUE (public_token),
    CONSTRAINT cards_scan_count_non_negative CHECK (scan_count >= 0),
    CONSTRAINT cards_status_check CHECK (status IN (
        'READY',
        'DISABLED',
        'DRAFT',
        'LINK_PENDING',
        'PRINTED',
        'DELIVERED',
        'SOLD',
        'ARCHIVED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_cards_public_token ON public.cards (public_token);
CREATE INDEX IF NOT EXISTS idx_cards_public_token_upper ON public.cards (UPPER(public_token));
CREATE INDEX IF NOT EXISTS idx_cards_internal_card_no ON public.cards (internal_card_no);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards (status);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cards_updated_at ON public.cards;
CREATE TRIGGER set_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.resolve_and_increment_scan(token_input TEXT)
RETURNS TABLE (
    id UUID,
    internal_card_no TEXT,
    public_token TEXT,
    destination_url TEXT,
    status TEXT,
    scan_count INTEGER
) AS $$
DECLARE
    cleaned_token TEXT := UPPER(TRIM(token_input));
    target_id UUID;
    target_status TEXT;
    target_url TEXT;
BEGIN
    SELECT c.id, c.status, c.destination_url
    INTO target_id, target_status, target_url
    FROM public.cards c
    WHERE UPPER(c.public_token) = cleaned_token
    FOR UPDATE;

    IF target_id IS NULL THEN
        RETURN;
    END IF;

    IF target_status != 'DISABLED' AND target_url IS NOT NULL AND target_url != '' THEN
        UPDATE public.cards
        SET scan_count = public.cards.scan_count + 1,
            updated_at = now()
        WHERE public.cards.id = target_id;
    END IF;

    RETURN QUERY
    SELECT c.id, c.internal_card_no, c.public_token, c.destination_url, c.status, c.scan_count
    FROM public.cards c
    WHERE c.id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users have full access to cards" ON public.cards;
CREATE POLICY "Authenticated users have full access to cards"
    ON public.cards
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.resolve_and_increment_scan(TEXT) TO anon, authenticated, service_role;

INSERT INTO public.cards (internal_card_no, public_token, destination_url, status, scan_count)
VALUES
    ('CARD-0001', '7KQ4M8X2', 'https://example.com', 'READY', 0),
    ('CARD-0002', '9AB2X7Y1', 'https://google.com', 'READY', 0),
    ('CARD-0003', '3MN8K9P4', NULL, 'READY', 0),
    ('CARD-0004', '5XP1Q9L6', 'https://example.com/disabled-card', 'DISABLED', 0)
ON CONFLICT (public_token) DO UPDATE
SET destination_url = EXCLUDED.destination_url,
    status = EXCLUDED.status;
