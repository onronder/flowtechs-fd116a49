
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
