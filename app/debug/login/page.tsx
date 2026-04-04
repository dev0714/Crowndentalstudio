'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginDebug() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@crowndental.com',
          password: 'TestPassword123!',
        }),
      });

      const data = await response.json();
      setResult({ status: response.status, ...data });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testLogin} disabled={loading}>
            {loading ? 'Testing...' : 'Test Login'}
          </Button>

          {result && (
            <div className="p-4 bg-gray-100 rounded text-sm font-mono overflow-auto max-h-96">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
