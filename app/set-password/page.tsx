'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('TestPassword123!');
  const [message, setMessage] = useState('');

  const handleSetPassword = async () => {
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@crowndental.com',
          password,
        }),
      });

      const data = await response.json();
      setMessage(data.message || data.error);
    } catch (error) {
      setMessage('Error setting password');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Set Test User Password</h1>
        <Input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />
        <Button onClick={handleSetPassword} className="w-full mb-4">
          Set Password
        </Button>
        {message && <p className="text-sm text-center">{message}</p>}
      </div>
    </div>
  );
}
