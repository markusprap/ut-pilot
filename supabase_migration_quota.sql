-- Create table for daily usage tracking
CREATE TABLE IF NOT EXISTS public.user_daily_usage (
    user_id UUID PRIMARY KEY,
    email TEXT,
    usage_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role can do everything (Backend usage)
CREATE POLICY "Service Role Full Access" ON public.user_daily_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their own usage (Frontend display)
CREATE POLICY "Users can view own usage" ON public.user_daily_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
