'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type Role = 'citizen' | 'lawyer' | 'judge' | 'admin';

type AdminUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  verified: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (role !== 'all') p.set('role', role);
    if (verified !== 'all') p.set('verified', verified);
    p.set('limit', '100');
    return p.toString();
  }, [q, role, verified]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => (await api.get<AdminUser[]>(`/admin/users?${params}`)).data,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; role: Role; verified: boolean }) =>
      (
        await api.patch(`/admin/users/${payload.id}`, {
          role: payload.role,
          verified: payload.verified,
        })
      ).data,
    onSuccess: async () => {
      toast.success('User updated');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin User Management</h1>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Search</label>
            <Input
              onChange={(event) => setQ(event.target.value)}
              placeholder="Name, email, phone"
              value={q}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) => setRole(event.target.value as 'all' | Role)}
              value={role}
            >
              <option value="all">All</option>
              <option value="citizen">Citizen</option>
              <option value="lawyer">Lawyer</option>
              <option value="judge">Judge</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Verified</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) => setVerified(event.target.value as 'all' | 'true' | 'false')}
              value={verified}
            >
              <option value="all">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? <p className="text-sm text-slate-500">Loading users...</p> : null}
      {isError ? (
        <Card>
          <p className="text-sm text-rose-700">
            Unable to load users. Ensure your profile role is set to admin.
          </p>
        </Card>
      ) : null}
      {!isLoading && !isError && !data?.length ? <Card>No users found.</Card> : null}

      <div className="grid gap-3">
        {data?.map((user) => (
          <UserCard key={user.id} onSave={(next) => updateMutation.mutate(next)} user={user} />
        ))}
      </div>
    </section>
  );
}

function UserCard({
  user,
  onSave,
}: {
  user: AdminUser;
  onSave: (payload: { id: string; role: Role; verified: boolean }) => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [verified, setVerified] = useState(user.verified ? 'true' : 'false');

  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <p className="font-medium">{user.fullName ?? 'Unnamed user'}</p>
        <p className="text-sm text-slate-700">{user.email ?? 'No email'}</p>
        <p className="text-sm text-slate-700">{user.phone ?? 'No phone'}</p>
        <p className="text-xs text-slate-500">
          Joined: {new Date(user.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Role</label>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            onChange={(event) => setRole(event.target.value as Role)}
            value={role}
          >
            <option value="citizen">Citizen</option>
            <option value="lawyer">Lawyer</option>
            <option value="judge">Judge</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Verified</label>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            onChange={(event) => setVerified(event.target.value)}
            value={verified}
          >
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>

      <Button
        onClick={() => onSave({ id: user.id, role, verified: verified === 'true' })}
        type="button"
        variant="outline"
      >
        Save Changes
      </Button>
    </Card>
  );
}
