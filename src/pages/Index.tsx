
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import DiscountUsageSummary from '@/components/reports/DiscountUsageSummary';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">FlowTechs Data Integration Platform</h1>
      
      <div className="mb-8">
        <DiscountUsageSummary />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>Connect to your data sources</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Configure connections to Shopify, APIs, and more.</p>
            <Button onClick={() => navigate('/sources')}>
              Manage Sources
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Datasets</CardTitle>
            <CardDescription>Create and manage datasets</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Build datasets from your connected sources.</p>
            <Button onClick={() => navigate('/datasets')}>
              View Datasets
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Check product inventory levels</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">View and analyze your inventory status.</p>
            <Button variant="outline" onClick={() => navigate('/datasets')}>
              Run Inventory Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
