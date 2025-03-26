
export const load = `
query TopProductsByRevenue($first: Int!) {
  products(first: $first, sortKey: TOTAL_SALES) {
    edges {
      node {
        id
        title
        handle
        vendor
        productType
        totalInventory
        totalVariants
        publishedAt
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
      }
    }
  }
}
`;
