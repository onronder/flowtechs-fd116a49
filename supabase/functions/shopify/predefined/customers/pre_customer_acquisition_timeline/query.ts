
interface CustomerData {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  firstOrder?: {
    id: string;
    name: string;
    processedAt: string;
    totalAmount: number;
    currencyCode: string;
  };
}

export class ShopifyClient {
  private storeName: string;
  private accessToken: string;
  private apiVersion: string;
  private endpoint: string;

  constructor(storeName: string, accessToken: string, apiVersion?: string) {
    this.storeName = storeName;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || '2023-01';
    this.endpoint = `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/graphql.json`;
  }

  async executeCustomerAcquisitionQuery(months: number): Promise<any> {
    console.log(`Executing customer acquisition timeline query for ${months} months`);
    
    try {
      // Fetch customer data with pagination
      const customers = await this.fetchAllCustomers(months);
      console.log(`Retrieved ${customers.length} customers`);
      
      // Process the results
      const results = this.processCustomerData(customers);
      return results;
    } catch (error) {
      console.error("Error executing customer acquisition query:", error);
      throw error;
    }
  }

  private async fetchAllCustomers(months: number): Promise<CustomerData[]> {
    // Calculate the date for filtering (n months ago)
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    const isoDate = date.toISOString();
    
    let allCustomers: CustomerData[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    
    // Set up pagination and fetch all customers
    while (hasNextPage) {
      const query = `
        query CustomerAcquisition($cursor: String, $date: DateTime!) {
          customers(first: 100, after: $cursor, query: "created_at:>=$date") {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                displayName
                email
                createdAt
                orders(first: 1, sortKey: PROCESSED_AT) {
                  edges {
                    node {
                      id
                      name
                      processedAt
                      totalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        cursor: cursor,
        date: isoDate
      };

      // Execute the GraphQL query
      const result = await this.executeGraphQL(query, variables);
      
      // Process the response
      const customers = result.data.customers.edges.map((edge: any) => {
        const customer = edge.node;
        const firstOrderEdge = customer.orders.edges[0];
        
        const customerData: CustomerData = {
          id: customer.id,
          displayName: customer.displayName,
          email: customer.email,
          createdAt: customer.createdAt,
        };

        // Add first order data if it exists
        if (firstOrderEdge) {
          const orderNode = firstOrderEdge.node;
          customerData.firstOrder = {
            id: orderNode.id,
            name: orderNode.name,
            processedAt: orderNode.processedAt,
            totalAmount: parseFloat(orderNode.totalPriceSet?.shopMoney?.amount || 0),
            currencyCode: orderNode.totalPriceSet?.shopMoney?.currencyCode || 'USD'
          };
        }

        return customerData;
      });

      // Add to our collection
      allCustomers = [...allCustomers, ...customers];
      
      // Check if there are more pages
      const pageInfo = result.data.customers.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
      
      console.log(`Fetched batch of ${customers.length} customers, total so far: ${allCustomers.length}`);
      
      // Respect rate limits
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return allCustomers;
  }

  private processCustomerData(customers: CustomerData[]): any {
    // Group customers by month
    const monthlyCustomers: Record<string, number> = {};
    const allMonths: string[] = [];
    
    // Count customers with first orders
    let customersWithFirstOrder = 0;
    let totalFirstOrderValue = 0;
    
    for (const customer of customers) {
      // Extract month for timeline (YYYY-MM format)
      const date = new Date(customer.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Track unique months for ordered timeline
      if (!allMonths.includes(monthKey)) {
        allMonths.push(monthKey);
      }
      
      // Count customers per month
      monthlyCustomers[monthKey] = (monthlyCustomers[monthKey] || 0) + 1;
      
      // Process first order metrics
      if (customer.firstOrder) {
        customersWithFirstOrder++;
        totalFirstOrderValue += customer.firstOrder.totalAmount;
      }
    }
    
    // Sort months chronologically
    allMonths.sort();
    
    // Create the timeline array
    const timeline = allMonths.map(month => ({
      month,
      count: monthlyCustomers[month] || 0
    }));
    
    // Calculate metrics
    const totalCustomers = customers.length;
    const customersWithoutFirstOrder = totalCustomers - customersWithFirstOrder;
    const conversionRate = totalCustomers > 0 
      ? (customersWithFirstOrder / totalCustomers) * 100 
      : 0;
    const averageFirstOrderValue = customersWithFirstOrder > 0 
      ? totalFirstOrderValue / customersWithFirstOrder 
      : 0;
    
    // Return the complete response
    return {
      timeline,
      totalCustomers,
      firstOrderMetrics: {
        customersWithFirstOrder,
        customersWithoutFirstOrder,
        conversionRate,
        averageFirstOrderValue
      }
    };
  }

  private async executeGraphQL(query: string, variables: any): Promise<any> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query,
          variables
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error executing GraphQL query:', error);
      throw error;
    }
  }
}
