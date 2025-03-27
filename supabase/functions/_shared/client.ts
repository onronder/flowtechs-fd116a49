
/**
 * Base Shopify GraphQL client for Edge Functions
 */
export class BaseShopifyClient {
  protected storeName: string;
  protected accessToken: string;
  protected apiVersion: string;
  protected endpoint: string;
  
  constructor(storeName: string, accessToken: string, apiVersion?: string) {
    this.storeName = storeName;
    this.accessToken = accessToken;
    
    // If API version is not provided, we'll detect it or use a fallback
    if (!apiVersion) {
      // We'll detect the latest version or use a recent version as fallback
      console.log("No API version provided, will detect during execution");
      this.apiVersion = "detect"; // This will be updated during execution
    } else {
      this.apiVersion = apiVersion;
      console.log(`Using provided API version: ${this.apiVersion}`);
    }
    
    // The endpoint will be properly initialized before use
    this.endpoint = "";
  }
  
  /**
   * Initialize API endpoint with proper version
   * This will detect the latest version if none was provided
   */
  protected async initializeEndpoint(): Promise<void> {
    if (this.apiVersion === "detect") {
      try {
        this.apiVersion = await this.detectLatestApiVersion();
        console.log(`Detected latest Shopify API version: ${this.apiVersion}`);
      } catch (error) {
        console.error("Error detecting API version:", error);
        this.apiVersion = "2023-10"; // Use a recent version as fallback
        console.log(`Using fallback API version: ${this.apiVersion}`);
      }
    }
    
    this.endpoint = `https://${this.storeName}.myshopify.com/admin/api/${this.apiVersion}/graphql.json`;
    console.log(`Initialized Shopify API endpoint: ${this.endpoint}`);
  }
  
  /**
   * Detect the latest available Shopify API version
   */
  protected async detectLatestApiVersion(): Promise<string> {
    console.log(`Detecting latest API version for store: ${this.storeName}`);
    
    const versionEndpoint = `https://${this.storeName}.myshopify.com/admin/api/versions`;
    
    const response = await fetch(versionEndpoint, {
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch API versions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.supported_versions || !data.supported_versions.length) {
      throw new Error("No supported API versions found");
    }
    
    // Sort versions to find the latest one
    const sortedVersions = [...data.supported_versions].sort((a, b) => {
      return b.handle.localeCompare(a.handle);
    });
    
    return sortedVersions[0].handle;
  }

  /**
   * Load query from the .graphql file
   */
  protected async loadGraphQLQuery(path: string): Promise<string> {
    try {
      const response = await fetch(new URL(path, import.meta.url).href);
      if (!response.ok) {
        throw new Error(`Failed to load GraphQL query: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error loading GraphQL query:', error);
      throw new Error(`Failed to load GraphQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a GraphQL query
   */
  protected async executeQuery<T>(queryString: string, variables: Record<string, any> = {}): Promise<T> {
    // Initialize endpoint with proper API version before executing query
    await this.initializeEndpoint();
    
    try {
      console.log(`Executing Shopify GraphQL query with variables:`, JSON.stringify(variables));
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken
        },
        body: JSON.stringify({
          query: queryString,
          variables
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }
      
      return result.data as T;
    } catch (error) {
      console.error('Error executing Shopify GraphQL query:', error);
      throw error;
    }
  }
}
