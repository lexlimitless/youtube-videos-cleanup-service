-- Add new columns for refresh token and expiry, and rename the existing access_token column.

-- Add the new columns with nullable constraints first
ALTER TABLE public.user_integrations
ADD COLUMN provider_refresh_token TEXT,
ADD COLUMN provider_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Rename the existing access_token column for consistency
ALTER TABLE public.user_integrations
RENAME COLUMN access_token TO provider_access_token;

-- Add a column for Calendly-specific URIs needed for API calls
ALTER TABLE public.user_integrations
ADD COLUMN calendly_organization_uri TEXT,
ADD COLUMN calendly_user_uri TEXT; 