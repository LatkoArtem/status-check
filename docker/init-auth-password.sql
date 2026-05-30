-- Set password for supabase_auth_admin so GoTrue can connect via SCRAM/MD5 auth
ALTER USER supabase_auth_admin WITH PASSWORD 'postgres';
