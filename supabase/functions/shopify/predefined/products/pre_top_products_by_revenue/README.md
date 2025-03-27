
# Top Products by Revenue

This Edge Function fetches the top-selling products from a Shopify store, ordered by total sales.

## Input Parameters

- `credentials`: Object containing Shopify API credentials
  - `storeName`: The Shopify store name (without .myshopify.com)
  - `accessToken`: The access token for the Shopify Admin API
  - `api_version`: (Optional) The API version to use, will detect latest if not provided
- `limit`: (Optional) Number of products to return, defaults to 10

## Output Format

Returns a JSON response with an array of products containing:
- Product ID, title, handle, vendor, and type
- Inventory information
- Price range details
- Primary image information

## Usage Example

```javascript
const response = await supabase.functions.invoke("shopify/predefined/products/pre_top_products_by_revenue", {
  body: {
    credentials: {
      storeName: "your-store",
      accessToken: "your-access-token"
    },
    limit: 20
  }
});

const { data } = response;
```
