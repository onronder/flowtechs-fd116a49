
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const formSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  clientId: z.string().min(1, "Client ID is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  accessToken: z.string().min(1, "Access token is required"),
});

interface ShopifyCredentialsFormProps {
  initialData?: {
    storeName?: string;
    clientId?: string;
    apiSecret?: string;
    accessToken?: string;
  };
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function ShopifyCredentialsForm({ 
  initialData = {}, 
  onSubmit, 
  onBack, 
  isSubmitting = false 
}: ShopifyCredentialsFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: initialData.storeName || "",
      clientId: initialData.clientId || "",
      apiSecret: initialData.apiSecret || "",
      accessToken: initialData.accessToken || "",
    },
  });
  
  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    if (!isSubmitting) {
      onSubmit(data);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Shopify API Credentials</h3>
          <p className="text-sm text-muted-foreground mb-2">
            To connect to your Shopify store, you need to create a private app in your Shopify admin.
          </p>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="instructions">
              <AccordionTrigger className="text-sm font-medium">
                How to create a Shopify Private App
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal text-sm pl-5 space-y-2">
                  <li>Go to your Shopify admin dashboard</li>
                  <li>Navigate to Apps &gt; App and sales channel settings</li>
                  <li>Scroll down to the bottom and click "Develop apps"</li>
                  <li>Click "Create an app"</li>
                  <li>Enter a name for your app (e.g., "FlowTechs Integration")</li>
                  <li>Select "Admin API integration"</li>
                  <li>Click "Create app"</li>
                  <li>In the "Configuration" tab, add the required scopes:
                    <ul className="list-disc pl-5 mt-1">
                      <li>read_products, write_products</li>
                      <li>read_customers, write_customers</li>
                      <li>read_orders, write_orders</li>
                      <li>read_inventory, write_inventory</li>
                    </ul>
                  </li>
                  <li>Click "Save" to apply the scopes</li>
                  <li>Go to the "API credentials" tab</li>
                  <li>Copy the "Admin API access token" to use as the Access Token</li>
                  <li>Copy the "API key" to use as the Client ID</li>
                  <li>Copy the "API secret key" to use as the API Secret</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        
        <FormField
          control={form.control}
          name="storeName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store Name</FormLabel>
              <FormControl>
                <Input placeholder="your-store" {...field} />
              </FormControl>
              <FormDescription>
                Enter your Shopify store name without .myshopify.com
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key / Client ID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                Your Shopify Private App API key
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="apiSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Secret</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                Your Private App's API secret key
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="accessToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access Token</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                Your Private App's Admin API access token
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Validate Connection"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
