import { Card } from '@legalmitra/ui';

export default function CitizenDashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Citizen Dashboard</h1>
      <Card>
        <p className="text-sm text-slate-600">
          Track your cases, review hearing updates, and manage your personal legal profile.
        </p>
      </Card>
    </section>
  );
}
