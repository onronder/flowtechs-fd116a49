
-- Execute SQL Query function (for use in dataset preview function)
CREATE OR REPLACE FUNCTION public.execute_sql_query(query text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Execute the query and return results as JSON
    RETURN QUERY EXECUTE query;
END;
$$;

-- Grant execution privileges to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql_query(text) TO authenticated;

-- Add comment with important note
COMMENT ON FUNCTION public.execute_sql_query(text) IS 
'SECURITY WARNING: This function should only be used with properly validated and sanitized inputs, as it executes arbitrary SQL.';
