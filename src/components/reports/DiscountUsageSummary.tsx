
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createShopifyClient } from '@/utils/shopify/shopifyClient';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface DiscountCodeSummary {
  code: string;
  usageCount: number;
  totalDiscountAmount: string;
  totalOrderValue: string;
  avgDiscountPerOrder: string;
  avgOrderValue: string;
  discountPercentage: string;
  avgPercentageValue: string | null;
  currency: string;
}

interface DiscountSummary {
  totalOrdersWithDiscounts: number;
  totalOrderValue: number;
  totalDiscountValue: number;
  discountCodesSummary: DiscountCodeSummary[];
}

interface DiscountData {
  orders: any[];
  summary: DiscountSummary;
  meta: {
    apiCallCount: number;
    totalOrders: number;
    errors: string[];
  };
}

export default function DiscountUsageSummary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiscountData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscountData();
  }, []);

  const fetchDiscountData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get a source with Shopify config
      const { data: sources, error: sourcesError } = await supabase
        .from('sources')
        .select('*')
        .eq('source_type', 'shopify')
        .limit(1);

      if (sourcesError) {
        throw new Error(`Failed to fetch Shopify source: ${sourcesError.message}`);
      }

      if (!sources || sources.length === 0) {
        setError('No Shopify source found. Please create a Shopify connection first.');
        return;
      }

      const source = sources[0];
      const config = source.config;

      // Call the edge function
      const { data: discountData, error: fnError } = await supabase.functions.invoke(
        'shopify/predefined/orders/pre_discount_usage_summary',
        {
          body: { config, limit: 50 }
        }
      );

      if (fnError) {
        throw new Error(`Edge function error: ${fnError.message}`);
      }

      if (!discountData || !discountData.data) {
        throw new Error('Invalid response from edge function');
      }

      setData(discountData.data);
    } catch (err) {
      console.error('Error fetching discount data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: 'Error',
        description: 'Failed to load discount usage data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency || 'USD' 
    }).format(parseFloat(value));
  };

  const handleRefresh = () => {
    fetchDiscountData();
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discount Usage Summary</CardTitle>
          <CardDescription>Loading discount data from Shopify...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading discount data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discount Usage Summary</CardTitle>
          <CardDescription>There was an error loading the discount data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/15 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Error loading discount data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discount Usage Summary</CardTitle>
          <CardDescription>No discount data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            There is no discount usage data available. Please try refreshing or check if your Shopify store has discount codes.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;
  const currency = summary.discountCodesSummary[0]?.currency || 'USD';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Discount Usage Summary</CardTitle>
          <CardDescription>Analysis of discount codes across your orders</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Orders with Discounts</h3>
            <p className="text-2xl font-bold">{summary.totalOrdersWithDiscounts}</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Order Value</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalOrderValue.toString(), currency)}
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Discount Value</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalDiscountValue.toString(), currency)}
            </p>
          </div>
        </div>

        <Separator className="my-4" />
        
        <h3 className="text-lg font-medium mb-3">Discount Code Performance</h3>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Usage Count</TableHead>
                <TableHead className="text-right">Total Discount</TableHead>
                <TableHead className="text-right">Total Order Value</TableHead>
                <TableHead className="text-right">Discount %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.discountCodesSummary.map((discount, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{discount.code}</TableCell>
                  <TableCell className="text-right">{discount.usageCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(discount.totalDiscountAmount, discount.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(discount.totalOrderValue, discount.currency)}</TableCell>
                  <TableCell className="text-right">{discount.discountPercentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>Data from the last {data.meta.totalOrders} orders • {data.meta.apiCallCount} API calls made</p>
        </div>
      </CardContent>
    </Card>
  );
}
