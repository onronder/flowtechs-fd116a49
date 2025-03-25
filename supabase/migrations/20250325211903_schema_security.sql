-- Function to get execution raw data by its ID
CREATE OR REPLACE FUNCTION public.get_execution_raw_data(p_execution_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data jsonb;
BEGIN
  -- Check if execution exists and belongs to the user
  SELECT data INTO v_data
  FROM dataset_executions
  WHERE id = p_execution_id AND user_id = p_user_id;
  
  -- Return the data (will be null if not found)
  RETURN v_data;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error retrieving execution data: %', SQLERRM;
END;
$$;

-- Create Dev_Logs table for comprehensive error and warning logging
CREATE TABLE IF NOT EXISTS public.dev_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
  component TEXT NOT NULL,
  function TEXT,
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  source_id UUID REFERENCES public.sources(id),
  dataset_id UUID REFERENCES public.user_datasets(id),
  execution_id UUID REFERENCES public.dataset_executions(id),
  request_data JSONB,
  response_data JSONB,
  stack_trace TEXT,
  tags TEXT[],
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_dev_logs_timestamp ON public.dev_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dev_logs_level ON public.dev_logs (level);
CREATE INDEX IF NOT EXISTS idx_dev_logs_component ON public.dev_logs (component);
CREATE INDEX IF NOT EXISTS idx_dev_logs_user_id ON public.dev_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_dev_logs_source_id ON public.dev_logs (source_id);
CREATE INDEX IF NOT EXISTS idx_dev_logs_dataset_id ON public.dev_logs (dataset_id);
CREATE INDEX IF NOT EXISTS idx_dev_logs_execution_id ON public.dev_logs (execution_id);
CREATE INDEX IF NOT EXISTS idx_dev_logs_resolved ON public.dev_logs (resolved);

-- Add RLS policies to dev_logs table
ALTER TABLE public.dev_logs ENABLE ROW LEVEL SECURITY;

-- Only allow administrators to see all logs
CREATE POLICY admin_all_access_dev_logs
  ON public.dev_logs
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Regular users can only see their own logs
CREATE POLICY user_own_logs
  ON public.dev_logs
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Function to add a new log entry
CREATE OR REPLACE FUNCTION public.add_log_entry(
  p_level TEXT,
  p_component TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT NULL,
  p_function TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_dataset_id UUID DEFAULT NULL,
  p_execution_id UUID DEFAULT NULL,
  p_request_data JSONB DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.dev_logs (
    level,
    component,
    function,
    message,
    details,
    user_id,
    source_id,
    dataset_id,
    execution_id,
    request_data,
    response_data,
    stack_trace,
    tags
  )
  VALUES (
    p_level,
    p_component,
    p_function,
    p_message,
    p_details,
    p_user_id,
    p_source_id,
    p_dataset_id,
    p_execution_id,
    p_request_data,
    p_response_data,
    p_stack_trace,
    p_tags
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to logging to PostgREST logs if we can't log to our table
    RAISE WARNING 'Error adding log entry: %, Log Level: %, Message: %', SQLERRM, p_level, p_message;
    RETURN NULL;
END;
$$;

-- Schema caching optimization and security: Version 2.0

-- Create user roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'schema_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Add index for user role lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Add RLS policies to user_roles table
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage roles
CREATE POLICY admin_manage_roles
  ON user_roles
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Users can see their own roles
CREATE POLICY user_view_own_roles
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Alter the source_schemas table to add new fields for versioning, caching and security
ALTER TABLE IF EXISTS source_schemas 
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_level VARCHAR DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public')),
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS security_metadata JSONB;

-- Create a more complete source_schemas table if it doesn't exist
CREATE TABLE IF NOT EXISTS source_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  api_version VARCHAR NOT NULL,
  schema_version INTEGER DEFAULT 1,
  schema JSONB,
  processed_schema JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  owner_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  access_level VARCHAR DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public')),
  is_sensitive BOOLEAN DEFAULT FALSE,
  security_metadata JSONB
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_source_schemas_source_id ON source_schemas(source_id);
CREATE INDEX IF NOT EXISTS idx_source_schemas_api_version ON source_schemas(api_version);
CREATE INDEX IF NOT EXISTS idx_source_schemas_version ON source_schemas(schema_version);
CREATE INDEX IF NOT EXISTS idx_source_schemas_owner ON source_schemas(owner_id);
CREATE INDEX IF NOT EXISTS idx_source_schemas_access ON source_schemas(access_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_schemas_unique_version ON source_schemas(source_id, api_version, schema_version);

-- Enable Row Level Security on source_schemas
ALTER TABLE IF EXISTS source_schemas ENABLE ROW LEVEL SECURITY;

-- Add RLS policies to source_schemas table
-- Admins can do anything
CREATE POLICY admin_all_schemas
  ON source_schemas
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'schema_admin')));

-- Schema owners can do anything with their schemas
CREATE POLICY owner_manage_schemas
  ON source_schemas
  USING (auth.uid() = owner_id);

-- Editors can read and update non-sensitive schemas
CREATE POLICY editor_use_schemas
  ON source_schemas
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'editor') 
    AND (is_sensitive = FALSE OR access_level IN ('shared', 'public'))
  );

-- Viewers can only view non-sensitive schemas
CREATE POLICY viewer_read_schemas
  ON source_schemas
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'viewer')
    AND is_sensitive = FALSE
    AND access_level IN ('shared', 'public')
  );

-- Shared schemas can be accessed by users who have access to the source
CREATE POLICY shared_schemas_access
  ON source_schemas
  FOR SELECT
  USING (
    access_level IN ('shared', 'public')
    AND source_id IN (
      SELECT s.id FROM sources s
      JOIN user_sources us ON s.id = us.source_id
      WHERE us.user_id = auth.uid()
    )
  );

-- Create schema_access_logs table for audit logging
CREATE TABLE IF NOT EXISTS schema_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  schema_id UUID REFERENCES source_schemas(id),
  source_id UUID REFERENCES sources(id),
  action VARCHAR NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'export')),
  ip_address VARCHAR,
  user_agent VARCHAR,
  request_details JSONB,
  success BOOLEAN DEFAULT TRUE
);

-- Add indexes for efficient querying of logs
CREATE INDEX IF NOT EXISTS idx_schema_access_logs_user ON schema_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_schema_access_logs_schema ON schema_access_logs(schema_id);
CREATE INDEX IF NOT EXISTS idx_schema_access_logs_source ON schema_access_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_schema_access_logs_action ON schema_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_schema_access_logs_timestamp ON schema_access_logs(timestamp);

-- Enable Row Level Security on schema_access_logs
ALTER TABLE IF NOT EXISTS schema_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see all access logs
CREATE POLICY admin_view_all_logs
  ON schema_access_logs
  FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'schema_admin')));

-- Users can see logs for their own actions
CREATE POLICY users_view_own_logs
  ON schema_access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to log schema access
CREATE OR REPLACE FUNCTION log_schema_access(
  p_schema_id UUID,
  p_source_id UUID,
  p_action VARCHAR,
  p_request_details JSONB DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO schema_access_logs (
    user_id,
    schema_id,
    source_id,
    action,
    ip_address,
    user_agent,
    request_details
  )
  VALUES (
    auth.uid(),
    p_schema_id,
    p_source_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_request_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add a view for the latest schema versions with security filtering
CREATE OR REPLACE VIEW latest_source_schemas AS
SELECT DISTINCT ON (source_id, api_version) 
  id, source_id, api_version, schema_version, created_at, last_accessed_at, last_validated_at, 
  (metadata->>'schema_hash') as schema_hash,
  (metadata->>'type_count')::INTEGER as type_count,
  (metadata->>'root_resource_count')::INTEGER as root_resource_count,
  owner_id,
  access_level,
  is_sensitive,
  security_metadata->>'classification' as classification
FROM source_schemas
WHERE 
  (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'schema_admin')))
  OR (auth.uid() = owner_id)
  OR (access_level IN ('shared', 'public') AND is_sensitive = FALSE)
  OR (auth.uid() IN (SELECT us.user_id FROM user_sources us WHERE us.source_id = source_schemas.source_id))
ORDER BY source_id, api_version, schema_version DESC;

-- Create a user_sources junction table for managing source access
CREATE TABLE IF NOT EXISTS user_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  access_level VARCHAR NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, source_id)
);

-- Add indexes for user_sources
CREATE INDEX IF NOT EXISTS idx_user_sources_user ON user_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_source ON user_sources(source_id);

-- Enable RLS on user_sources
ALTER TABLE IF NOT EXISTS user_sources ENABLE ROW LEVEL SECURITY;

-- Admins can manage all source access
CREATE POLICY admin_manage_source_access
  ON user_sources
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Users can see their own source access
CREATE POLICY user_view_own_source_access
  ON user_sources
  FOR SELECT
  USING (auth.uid() = user_id);

-- Source admins can manage access to their sources
CREATE POLICY source_admin_manage_access
  ON user_sources
  USING (
    source_id IN (
      SELECT us.source_id 
      FROM user_sources us 
      WHERE us.user_id = auth.uid() AND us.access_level = 'admin'
    )
  );

-- Function to check schema permissions
CREATE OR REPLACE FUNCTION check_schema_permissions(p_schema_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_role text;
  v_is_owner boolean;
  v_is_admin boolean;
  v_is_editor boolean;
  v_schema_sensitive boolean;
BEGIN
  -- Check user roles
  SELECT role INTO v_role
  FROM user_roles 
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE 
      WHEN role = 'admin' THEN 1
      WHEN role = 'schema_admin' THEN 2
      WHEN role = 'editor' THEN 3
      ELSE 4
    END
  LIMIT 1;
  
  v_is_admin := v_role IN ('admin', 'schema_admin');
  v_is_editor := v_role = 'editor';
  
  -- Check if user is schema owner
  SELECT (owner_id = auth.uid()) INTO v_is_owner
  FROM source_schemas
  WHERE id = p_schema_id;
  
  -- Check if schema is sensitive
  SELECT is_sensitive INTO v_schema_sensitive
  FROM source_schemas
  WHERE id = p_schema_id;
  
  -- Build permissions object
  v_result := jsonb_build_object(
    'canView', true, -- If they can execute this function, they can view
    'canEdit', (v_is_owner OR v_is_admin OR (v_is_editor AND NOT v_schema_sensitive)),
    'canDelete', (v_is_owner OR v_is_admin),
    'canShare', (v_is_owner OR v_is_admin),
    'isOwner', v_is_owner,
    'role', v_role
  );
  
  -- Log the permission check
  PERFORM log_schema_access(
    p_schema_id,
    (SELECT source_id FROM source_schemas WHERE id = p_schema_id),
    'view',
    jsonb_build_object('permission_check', true, 'result', v_result)
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error checking schema permissions: %', SQLERRM;
    RETURN jsonb_build_object(
      'canView', true,
      'canEdit', false,
      'canDelete', false,
      'canShare', false,
      'isOwner', false,
      'error', SQLERRM
    );
END;
$$;