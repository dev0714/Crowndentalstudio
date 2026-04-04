'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'CEO' | 'Doctor' | 'Reception' | 'Admin';
  is_active: boolean;
  created_at: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  CEO: 'Full system access and management',
  Doctor: 'Patient care, appointments, and procedures',
  Reception: 'Patient booking and lead management',
  Admin: 'User and settings management',
};

function RolesContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'CEO' | 'Doctor' | 'Reception' | 'Admin'>('Reception');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/crm/users?limit=1000&page=1', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load users');
      }

      setUsers(payload.data || []);
    } catch (err) {
      console.error('[v0] Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/crm/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: newUserEmail,
          full_name: newUserName,
          password: newUserPassword,
          role: selectedRole,
          is_active: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Error creating user');
      }

      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setSelectedRole('Reception');
      await fetchUsers();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/crm/users?id=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Error deleting user');
      }

      await fetchUsers();
    } catch (err) {
      console.error('[v0] Error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const usersByRole = {
    CEO: users.filter((u) => u.role === 'CEO'),
    Doctor: users.filter((u) => u.role === 'Doctor'),
    Reception: users.filter((u) => u.role === 'Reception'),
    Admin: users.filter((u) => u.role === 'Admin'),
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Roles</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage user roles and permissions</p>
        </div>

        {/* Create New User */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Create Test User</CardTitle>
            <CardDescription className="text-xs">Add a new user with a specific role for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Full Name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                <Input
                  placeholder="Password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="CEO">CEO</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Reception">Reception</option>
                  <option value="Admin">Admin</option>
                </select>
                <Button
                  onClick={handleCreateUser}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Loading users...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(usersByRole).map(([role, roleUsers]) => (
              <Card key={role} className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-sm">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{role}</CardTitle>
                      <CardDescription className="text-xs">{ROLE_DESCRIPTIONS[role]}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {roleUsers.length === 0 ? (
                    <p className="text-slate-500 py-4">No users with this role yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b-2 border-slate-200">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Name</th>
                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Email</th>
                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Phone</th>
                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                            <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roleUsers.map((user) => (
                            <tr
                              key={user.id}
                              className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium text-slate-900">{user.full_name}</td>
                              <td className="py-3 px-4 text-slate-600">{user.email}</td>
                              <td className="py-3 px-4 text-slate-600">{user.phone || '-'}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-xs font-semibold px-2 py-1 rounded ${
                                    user.is_active
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <DashboardLayout>
      <RolesContent />
    </DashboardLayout>
  );
}
