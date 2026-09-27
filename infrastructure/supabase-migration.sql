BEGIN;

-- STEP 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    clerk_user_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    subscription_tier TEXT DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'starter', 'pro', 'agency')),
    subscription_status TEXT DEFAULT 'inactive'
        CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'cancelled')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    quota_remaining INTEGER DEFAULT 5,
    quota_reset_at TIMESTAMPTZ,
    user_type TEXT DEFAULT 'freelancer'
        CHECK (user_type IN ('freelancer', 'founder', 'creator')),
    is_related_party BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON public.users (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier
    ON public.users (subscription_tier);

-- STEP 3: Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    task_type TEXT NOT NULL,
    agent_used TEXT NOT NULL,
    user_type TEXT NOT NULL,
    output_text TEXT,
    file_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'processing'
        CHECK (status IN ('processing', 'complete', 'partial', 'failed')),
    error_message TEXT,
    gemini_calls INTEGER DEFAULT 0,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id
    ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_desc
    ON public.tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON public.tasks (status);

-- STEP 4: Memory items table
CREATE TABLE IF NOT EXISTS public.memory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL
        CHECK (category IN ('client', 'project', 'preference', 'finance', 'general', 'decision')),
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    embedding VECTOR(768),
    tags TEXT[] DEFAULT '{}',
    importance FLOAT DEFAULT 0.5
        CHECK (importance BETWEEN 0 AND 1),
    source_task_id UUID REFERENCES public.tasks(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_items_embedding
    ON public.memory_items
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_memory_items_user_id_category
    ON public.memory_items (user_id, category);

-- STEP 5: Revenue records table
CREATE TABLE IF NOT EXISTS public.revenue_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(id),
    amount_usd NUMERIC(10, 2) NOT NULL,
    stripe_payment_id TEXT UNIQUE NOT NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    plan_type TEXT NOT NULL
        CHECK (
            plan_type IN (
                'pay_task',
                'starter',
                'pro',
                'agency',
                'starter_annual',
                'pro_annual',
                'agency_annual'
            )
        ),
    billing_period TEXT NOT NULL
        CHECK (billing_period IN ('monthly', 'annual', 'one_time')),
    calendar_month TEXT NOT NULL,
    is_related_party BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_records_calendar_month
    ON public.revenue_records (calendar_month);
CREATE INDEX IF NOT EXISTS idx_revenue_records_user_id
    ON public.revenue_records (user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_stripe_event_id
    ON public.revenue_records (stripe_event_id);

-- STEP 6: Agent execution logs table
CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id),
    agent_id TEXT NOT NULL,
    model_used TEXT DEFAULT 'gemini-1.5-pro',
    workflow_name TEXT NOT NULL,
    node_name TEXT NOT NULL,
    action TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_task_id
    ON public.agent_execution_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_created_at_desc
    ON public.agent_execution_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_agent_id
    ON public.agent_execution_logs (agent_id);

-- STEP 7: Webhook events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL
        CHECK (provider IN ('stripe', 'n8n')),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT webhook_events_provider_event_id_key UNIQUE (provider, event_id)
);

-- STEP 8: Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- STEP 9: Service-role-only RLS policies
DO $$
DECLARE
    table_name TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        FOREACH table_name IN ARRAY ARRAY[
            'users',
            'tasks',
            'memory_items',
            'revenue_records',
            'agent_execution_logs',
            'webhook_events'
        ]
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = table_name
                  AND policyname = 'Service role full access'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                    'Service role full access',
                    table_name
                );
            END IF;
        END LOOP;
    END IF;
END;
$$;

-- STEP 10: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_users_updated_at'
          AND tgrelid = 'public.users'::REGCLASS
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER set_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_memory_items_updated_at'
          AND tgrelid = 'public.memory_items'::REGCLASS
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER set_memory_items_updated_at
            BEFORE UPDATE ON public.memory_items
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;

-- Retrieve the most relevant memories for a Clerk user ID.
CREATE OR REPLACE FUNCTION public.match_memories(
    query_embedding VECTOR(768),
    match_user_id TEXT,
    match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    category TEXT,
    importance FLOAT,
    similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        memory.id,
        memory.content,
        memory.category,
        memory.importance,
        1 - (memory.embedding <=> query_embedding) AS similarity
    FROM public.memory_items AS memory
    WHERE memory.user_id = match_user_id
    ORDER BY memory.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_memories(
    VECTOR,
    TEXT,
    INTEGER
) FROM PUBLIC;

-- Complete a task and consume quota in one transaction.
CREATE OR REPLACE FUNCTION public.complete_task(
    p_task_id UUID,
    p_user_id TEXT,
    p_input_text TEXT,
    p_task_type TEXT,
    p_agent_used TEXT,
    p_user_type TEXT,
    p_output_text TEXT,
    p_file_url TEXT,
    p_status TEXT,
    p_duration_ms INTEGER,
    p_completed_at TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    remaining_quota INTEGER;
BEGIN
    UPDATE public.users
    SET quota_remaining = quota_remaining - 1
    WHERE id = p_user_id
      AND quota_remaining > 0
    RETURNING quota_remaining INTO remaining_quota;

    IF remaining_quota IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.tasks (
        id,
        user_id,
        input_text,
        task_type,
        agent_used,
        user_type,
        output_text,
        file_url,
        status,
        duration_ms,
        completed_at
    )
    VALUES (
        p_task_id,
        p_user_id,
        p_input_text,
        p_task_type,
        p_agent_used,
        p_user_type,
        p_output_text,
        p_file_url,
        p_status,
        p_duration_ms,
        p_completed_at
    );

    RETURN remaining_quota;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_task(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TIMESTAMPTZ
) FROM PUBLIC;

-- Record revenue and apply the matching entitlement atomically.
CREATE OR REPLACE FUNCTION public.process_checkout_completion(
    p_user_id TEXT,
    p_amount_usd NUMERIC,
    p_stripe_payment_id TEXT,
    p_stripe_event_id TEXT,
    p_plan_type TEXT,
    p_billing_period TEXT,
    p_calendar_month TEXT,
    p_stripe_customer_id TEXT,
    p_stripe_subscription_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    resulting_quota INTEGER;
BEGIN
    INSERT INTO public.revenue_records (
        user_id,
        amount_usd,
        stripe_payment_id,
        stripe_event_id,
        plan_type,
        billing_period,
        calendar_month
    )
    VALUES (
        p_user_id,
        p_amount_usd,
        p_stripe_payment_id,
        p_stripe_event_id,
        p_plan_type,
        p_billing_period,
        p_calendar_month
    );

    IF p_plan_type = 'pay_task' THEN
        UPDATE public.users
        SET quota_remaining = COALESCE(quota_remaining, 0) + 10,
            stripe_customer_id = COALESCE(
                p_stripe_customer_id,
                stripe_customer_id
            )
        WHERE id = p_user_id
        RETURNING quota_remaining INTO resulting_quota;
    ELSE
        UPDATE public.users
        SET subscription_tier = REPLACE(p_plan_type, '_annual', ''),
            subscription_status = 'active',
            quota_remaining = CASE
                WHEN p_plan_type IN ('starter', 'starter_annual') THEN 100
                WHEN p_plan_type IN ('pro', 'pro_annual') THEN 300
                WHEN p_plan_type = 'agency' THEN 500
                ELSE quota_remaining
            END,
            stripe_customer_id = COALESCE(
                p_stripe_customer_id,
                stripe_customer_id
            ),
            stripe_subscription_id = COALESCE(
                p_stripe_subscription_id,
                stripe_subscription_id
            )
        WHERE id = p_user_id
        RETURNING quota_remaining INTO resulting_quota;
    END IF;

    IF resulting_quota IS NULL THEN
        RAISE EXCEPTION 'Billing user not found';
    END IF;

    RETURN resulting_quota;
END;
$$;

REVOKE ALL ON FUNCTION public.process_checkout_completion(
    TEXT,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.match_memories(
            VECTOR,
            TEXT,
            INTEGER
        ) TO service_role;

        GRANT EXECUTE ON FUNCTION public.complete_task(
            UUID,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            INTEGER,
            TIMESTAMPTZ
        ) TO service_role;

        GRANT EXECUTE ON FUNCTION public.process_checkout_completion(
            TEXT,
            NUMERIC,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT,
            TEXT
        ) TO service_role;
    END IF;
END;
$$;

COMMIT;
