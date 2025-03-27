
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface CustomQueryBuilderProps {
  source: any;
  onComplete: (queryData: any) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function CustomQueryBuilder({ 
  source, 
  onComplete, 
  onBack, 
  isLoading = false 
}: CustomQueryBuilderProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Query Builder</CardTitle>
          <CardDescription>
            This feature is currently under development. You'll be able to create custom GraphQL queries
            for your data sources soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p>We're working on building a powerful custom query interface.</p>
            <p className="mt-2">Check back soon for updates!</p>
          </div>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onBack} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
