'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, KeyRound, Pencil, Copy, Wand2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePortalSession } from '@/lib/auth/portal-session-context';

type Role = 'CEO' | 'Doctor' | 'Reception' | 'Admin';
const ROLES: Role[] = ['CEO', 'Doctor', 'Reception', 'Admin'];

function generatePassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

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
  const [activeTab, setActiveTab] = useState('CEO');
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'CEO' | 'Doctor' | 'Reception' | 'Admin'>('Reception');
  const { currentUser } = usePortalSession();
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', role: 'Reception' as Role, is_active: true });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [copied, setCopied] = useState(false);

  const openEdit = (user: User) => {
    setEditing(user);
    setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || '', role: user.role, is_active: user.is_active });
    setError(null);
  };

  const openReset = (user: User) => {
    setResetting(user);
    setResetForm({ password: '', confirm: '' });
    setCopied(false);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/users?id=${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to update user');
      setNotice(`${editForm.full_name.trim()} updated`);
      if (editForm.role !== editing.role) setActiveTab(editForm.role);
      setEditing(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const saveReset = async () => {
    if (!resetting) return;
    if (resetForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      setError('The two passwords do not match');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/users?id=${resetting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: resetForm.password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to reset password');
      setNotice(`Password reset for ${resetting.full_name}. Give them the new password; it is not shown again.`);
      setResetting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const fillGenerated = () => {
    const password = generatePassword();
    setResetForm({ password, confirm: password });
    setCopied(false);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(resetForm.password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

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

      setNotice('User deleted');
      await fetchUsers();
    } catch (err) {
      console.error('[v0] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const usersByRole = {
    CEO: users.filter((u) => u.role === 'CEO'),
    Doctor: users.filter((u) => u.role === 'Doctor'),
    Reception: users.filter((u) => u.role === 'Reception'),
    Admin: users.filter((u) => u.role === 'Admin'),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Roles</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage user roles and permissions</p>
        </div>

        {notice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4">
            <p className="text-emerald-700 text-sm">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} className="text-xs text-emerald-700 hover:underline">Dismiss</button>
          </div>
        )}
        {error && !editing && !resetting && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start bg-white border border-slate-200 rounded-full p-1 gap-0.5 mb-3">
            {Object.entries(usersByRole).map(([role, roleUsers]) => (
              <TabsTrigger key={role} value={role} className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
                {role}
                <span className="ml-1.5 text-[10px] font-bold opacity-70">{loading ? '' : roleUsers.length}</span>
              </TabsTrigger>
            ))}
            <TabsTrigger value="add" className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 data-[state=active]:bg-ink data-[state=active]:text-white data-[state=active]:shadow-none">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add user
            </TabsTrigger>
          </TabsList>

        <TabsContent value="add">
        {/* Create New User */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base">Create User</CardTitle>
            <CardDescription className="text-xs">Add a staff member and assign their role</CardDescription>
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
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="CEO">CEO</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Reception">Reception</option>
                  <option value="Admin">Admin</option>
                </select>
                <Button
                  onClick={handleCreateUser}
                  className="bg-navy-800 hover:bg-ink border-0 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {Object.entries(usersByRole).map(([role, roleUsers]) => (
          <TabsContent key={role} value={role}>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading users...</p>
              </div>
            ) : (
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-navy-800 flex items-center justify-center shadow-sm">
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
                  <table className="w-full min-w-[720px]">
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
                          className="border-b border-slate-100 hover:bg-cream/40 transition-colors"
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
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button variant="outline" size="sm" className="text-xs border-slate-200 hover:border-teal hover:text-teal" onClick={() => openEdit(user)}>
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs border-slate-200 hover:border-teal hover:text-teal" onClick={() => openReset(user)}>
                                <KeyRound className="w-3.5 h-3.5 mr-1" /> Reset password
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={currentUser?.id === user.id}
                                title={currentUser?.id === user.id ? 'You cannot delete your own account' : undefined}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
            )}
          </TabsContent>
        ))}
        </Tabs>

        {/* Edit user */}
        <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && !saving && setEditing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Change the details or role for {editing?.full_name}.</DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5"><Label htmlFor="edit_name">Full name</Label><Input id="edit_name" value={editForm.full_name} onChange={(e) => setEditForm((c) => ({ ...c, full_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="edit_email">Email</Label><Input id="edit_email" type="email" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="edit_phone">Phone</Label><Input id="edit_phone" value={editForm.phone} onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Optional" /></div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_role">Role</Label>
                <select
                  id="edit_role"
                  value={editForm.role}
                  onChange={(e) => setEditForm((c) => ({ ...c, role: e.target.value as Role }))}
                  disabled={currentUser?.id === editing?.id}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                >
                  {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <span className="text-sm text-slate-700">
                  Active account
                  <span className="block text-xs text-slate-400">Inactive users cannot sign in.</span>
                </span>
                <Switch checked={editForm.is_active} onCheckedChange={(checked) => setEditForm((c) => ({ ...c, is_active: checked }))} disabled={currentUser?.id === editing?.id} />
              </label>
              {currentUser?.id === editing?.id && (
                <p className="text-xs text-slate-400">You cannot change your own role or deactivate yourself.</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving} className="border-slate-200">Cancel</Button>
              <Button onClick={saveEdit} disabled={saving} className="bg-navy-800 hover:bg-ink border-0 shadow-md">{saving ? 'Saving…' : 'Save changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset password */}
        <Dialog open={Boolean(resetting)} onOpenChange={(open) => !open && !saving && setResetting(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>Set a new password for {resetting?.full_name} ({resetting?.email}).</DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="reset_password">New password</Label>
                <div className="flex gap-2">
                  <Input id="reset_password" value={resetForm.password} onChange={(e) => setResetForm((c) => ({ ...c, password: e.target.value }))} placeholder="At least 8 characters" className="font-mono" />
                  <Button type="button" variant="outline" onClick={fillGenerated} className="border-slate-200 text-xs whitespace-nowrap"><Wand2 className="w-3.5 h-3.5 mr-1" /> Generate</Button>
                  <Button type="button" variant="outline" onClick={copyPassword} disabled={!resetForm.password} className="border-slate-200 text-xs whitespace-nowrap"><Copy className="w-3.5 h-3.5 mr-1" /> {copied ? 'Copied' : 'Copy'}</Button>
                </div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="reset_confirm">Confirm password</Label><Input id="reset_confirm" value={resetForm.confirm} onChange={(e) => setResetForm((c) => ({ ...c, confirm: e.target.value }))} className="font-mono" /></div>
              <p className="text-xs text-slate-400">Give this password to the staff member; it is not shown again after saving. Anywhere they are already signed in stays signed in until that session expires.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setResetting(null)} disabled={saving} className="border-slate-200">Cancel</Button>
              <Button onClick={saveReset} disabled={saving || !resetForm.password} className="bg-navy-800 hover:bg-ink border-0 shadow-md">{saving ? 'Saving…' : 'Set password'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
