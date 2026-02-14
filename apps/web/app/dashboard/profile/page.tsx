'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type Profile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  verified: boolean;
};

export default function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading profile...</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="space-y-2 text-sm">
        <p>
          <strong>Role:</strong> {data?.role}
        </p>
        <p>
          <strong>Name:</strong> {data?.fullName ?? 'Not set'}
        </p>
        <p>
          <strong>Phone:</strong> {data?.phone ?? 'Not set'}
        </p>
        <p>
          <strong>Verified:</strong> {data?.verified ? 'Yes' : 'No'}
        </p>
      </Card>
    </section>
  );
}
