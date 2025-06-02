CREATE OR REPLACE FUNCTION set_clerk_user_id(user_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.clerk_user_id', user_id, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 