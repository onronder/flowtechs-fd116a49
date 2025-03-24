
-- Function to get a template by its ID (works across query_templates and dependent_query_templates)
CREATE OR REPLACE FUNCTION public.get_template_by_id(template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_data jsonb;
BEGIN
  -- First try query_templates
  SELECT row_to_json(qt)::jsonb INTO template_data
  FROM query_templates qt
  WHERE qt.id = template_id;
  
  -- If not found, try dependent_query_templates
  IF template_data IS NULL THEN
    SELECT row_to_json(dqt)::jsonb INTO template_data
    FROM dependent_query_templates dqt
    WHERE dqt.id = template_id;
  END IF;
  
  RETURN template_data;
END;
$$;

-- Function to get execution data (including large data field) safely
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
