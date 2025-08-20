import { supabaseConfig } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Key, AlertTriangle } from 'lucide-react';

export function DebugInfo() {
  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
          <Settings className="w-4 h-4" />
          Debug Information (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>Supabase Status:</span>
          </div>
          <Badge 
            variant={supabaseConfig.isConfigured ? "default" : "destructive"}
            className={supabaseConfig.isConfigured ? "bg-green-500" : ""}
          >
            {supabaseConfig.isConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span>API Key:</span>
          </div>
          <Badge variant={supabaseConfig.hasValidKey ? "default" : "destructive"}>
            {supabaseConfig.hasValidKey ? "Valid Length" : "Invalid/Missing"}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <strong>URL:</strong> {supabaseConfig.url}
        </div>
        
        {!supabaseConfig.isConfigured && (
          <div className="flex items-start gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded border border-yellow-300 dark:border-yellow-700">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Setup Required:</strong> Set your Supabase URL and API key in environment variables.
              The app will use mock data until configured.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
