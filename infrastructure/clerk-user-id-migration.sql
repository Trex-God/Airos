BEGIN;

-- STEP 1: Remove policies and dependent objects before changing user ID types.
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'users',
              'tasks',
              'memory_items',
              'revenue_records',
              'agent_execution_logs',
              'webhook_events'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_task(
    UUID,
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    TIMESTAMPTZ
);
DROP FUNCTION IF EXISTS public.complete_task(
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
);
DROP FUNCTION IF EXISTS public.process_checkout_completion(
    UUID,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
);
DROP FUNCTION IF EXISTS public.match_memories(VECTOR, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.match_memories(VECTOR, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.process_checkout_completion(
    TEXT,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT
);

ALTER TABLE IF EXISTS public.tasks
    DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE IF EXISTS public.memory_items
    DROP CONSTRAINT IF EXISTS memory_items_user_id_fkey;
ALTER TABLE IF EXISTS public.revenue_records
    DROP CONSTRAINT IF EXISTS revenue_records_user_id_fkey;
ALTER TABLE IF EXISTS public.agent_execution_logs
    DROP CONSTRAINT IF EXISTS agent_execution_logs_user_id_fkey;

-- STEP 2: Convert users.id to Clerk-compatible TEXT and retain a unique Clerk ID alias.
ALTER TABLE IF EXISTS public.users
    DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'users'
             AND column_name = 'id'
             AND data_type <> 'text'
       ) THEN
        ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.users
            ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF to_regclass('public.users') IS NOT NULL THEN
        UPDATE public.users
        SET clerk_user_id = id
        WHERE clerk_user_id IS NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.users'::REGCLASS
             AND contype = 'p'
       ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    END IF;

    IF to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.users'::REGCLASS
             AND contype = 'u'
             AND conname = 'users_clerk_user_id_key'
       ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);
    END IF;
END;
$$;

-- STEP 3: Convert tasks.user_id to TEXT and restore its users foreign key.
DO $$
BEGIN
    IF to_regclass('public.tasks') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'tasks'
             AND column_name = 'user_id'
             AND data_type <> 'text'
       ) THEN
        ALTER TABLE public.tasks
            ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;

    IF to_regclass('public.tasks') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.tasks'::REGCLASS
             AND conname = 'tasks_user_id_fkey'
       ) THEN
        ALTER TABLE public.tasks
            ADD CONSTRAINT tasks_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- STEP 4: Convert memory_items.user_id to TEXT and restore its users foreign key.
DO $$
BEGIN
    IF to_regclass('public.memory_items') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'memory_items'
             AND column_name = 'user_id'
             AND data_type <> 'text'
       ) THEN
        ALTER TABLE public.memory_items
            ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;

    IF to_regclass('public.memory_items') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.memory_items'::REGCLASS
             AND conname = 'memory_items_user_id_fkey'
       ) THEN
        ALTER TABLE public.memory_items
            ADD CONSTRAINT memory_items_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- STEP 5: Convert revenue_records.user_id to TEXT and restore its users foreign key.
DO $$
BEGIN
    IF to_regclass('public.revenue_records') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'revenue_records'
             AND column_name = 'user_id'
             AND data_type <> 'text'
       ) THEN
        ALTER TABLE public.revenue_records
            ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;

    IF to_regclass('public.revenue_records') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.revenue_records'::REGCLASS
             AND conname = 'revenue_records_user_id_fkey'
       ) THEN
        ALTER TABLE public.revenue_records
            ADD CONSTRAINT revenue_records_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id);
    END IF;
END;
$$;

-- STEP 6: Convert agent_execution_logs.user_id to TEXT and restore its users foreign key.
DO $$
BEGIN
    IF to_regclass('public.agent_execution_logs') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'agent_execution_logs'
             AND column_name = 'user_id'
             AND data_type <> 'text'
       ) THEN
        ALTER TABLE public.agent_execution_logs
            ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;

    IF to_regclass('public.agent_execution_logs') IS NOT NULL
       AND to_regclass('public.users') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conrelid = 'public.agent_execution_logs'::REGCLASS
             AND conname = 'agent_execution_logs_user_id_fkey'
       ) THEN
        ALTER TABLE public.agent_execution_logs
            ADD CONSTRAINT agent_execution_logs_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.users(id);
    END IF;
END;
$$;

-- STEP 7: Keep RLS enabled and allow access only to the server-side service role.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users',
        'tasks',
        'memory_items',
        'revenue_records',
        'agent_execution_logs',
        'webhook_events'
    ]
    LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
                table_name
            );

            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
               AND NOT EXISTS (
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
        END IF;
    END LOOP;
END;
$$;

-- STEP 8: Recreate server-side RPC functions with TEXT Clerk user IDs.
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
            stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id)
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
            stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
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
REVOKE ALL ON FUNCTION public.match_memories(
    VECTOR,
    TEXT,
    INTEGER
) FROM PUBLIC;
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

-- STEP 9: Keep uuid-ossp enabled because non-user primary keys remain UUID values.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMIT;
