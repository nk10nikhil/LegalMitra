import { Card } from '@legalmitra/ui';

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <h2 className="font-medium">Phase 1 Ready</h2>
        <p className="mt-2 text-sm text-slate-600">
          Track your cases from eCourts, monitor hearing updates, and manage your profile in one
          place.
        </p>
      </Card>
    </section>
  );
}
