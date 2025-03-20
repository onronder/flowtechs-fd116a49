
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, errorResponse, successResponse } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const { sourceId, query, resourceType, fields } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get source details
    const { data: source, error: sourceError } = await supabaseClient
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) {
      return errorResponse(`Source error: ${sourceError.message}`, 400);
    }

    if (source.source_type !== 'shopify') {
      return errorResponse("Only Shopify sources are supported for custom queries", 400);
    }

    // We have two possible ways to validate:
    // 1. If a query is provided directly, validate it
    // 2. If resourceType and fields are provided, build and validate a query

    let graphqlQuery = query;
    let generatedQuery = false;

    // If no direct query but we have resourceType and fields, generate the query
    if (!graphqlQuery && resourceType && fields && fields.length > 0) {
      graphqlQuery = generateGraphQLQuery(resourceType, fields);
      generatedQuery = true;
    }

    if (!graphqlQuery) {
      return errorResponse("Either a query or resourceType and fields must be provided", 400);
    }

    // Validate the query against Shopify GraphQL API
    const shopifyConfig = source.config;
    const apiVersion = shopifyConfig.api_version;
    const endpoint = `https://${shopifyConfig.storeName}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
    
    // Add variables with pagination for validation
    const variables = {
      first: 1,  // Just get one record for validation
      after: null
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyConfig.accessToken
      },
      body: JSON.stringify({ 
        query: graphqlQuery,
        variables 
      })
    });

    const result = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      return successResponse({
        success: false,
        validation: {
          valid: false,
          error: result.errors[0].message
        },
        query: graphqlQuery
      });
    }

    // If we reach here, the query is valid
    return successResponse({
      success: true,
      validation: {
        valid: true
      },
      query: graphqlQuery,
      generated: generatedQuery,
      sampleData: result.data ? result.data : null
    });
    
  } catch (error) {
    console.error("Error in Cust_ValidateQuery:", error);
    return errorResponse(error.message, 500);
  }
});

// Generate a GraphQL query from resource type and fields
function generateGraphQLQuery(resourceType: string, fields: string[]): string {
  // Build the query with pagination
  const query = `
    query Get${capitalizeFirstLetter(resourceType)}($first: Int!, $after: String) {
      ${resourceType}(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            ${fields.join('\n            ')}
          }
        }
      }
    }
  `;
  
  return query;
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
