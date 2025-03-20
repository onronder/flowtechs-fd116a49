
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Source error: ${sourceError.message}` 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (source.source_type !== 'shopify') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only Shopify sources are supported for custom queries"
        }),
        { headers: corsHeaders, status: 400 }
      );
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Either a query or resourceType and fields must be provided"
        }),
        { headers: corsHeaders, status: 400 }
      );
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
      return new Response(
        JSON.stringify({
          success: false,
          validation: {
            valid: false,
            error: result.errors[0].message
          },
          query: graphqlQuery
        }),
        { headers: corsHeaders, status: 200 } // Return 200 even for invalid queries
      );
    }

    // If we reach here, the query is valid
    return new Response(
      JSON.stringify({
        success: true,
        validation: {
          valid: true
        },
        query: graphqlQuery,
        generated: generatedQuery,
        sampleData: result.data ? result.data : null
      }),
      { headers: corsHeaders, status: 200 }
    );
    
  } catch (error) {
    console.error("Error in Cust_ValidateQuery:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        validation: {
          valid: false,
          error: error.message
        }
      }),
      { headers: corsHeaders, status: 500 }
    );
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
