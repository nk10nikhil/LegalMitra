import { Card } from '@legalmitra/ui';

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <Card>
        <p className="text-sm text-slate-600">
          Oversee platform users and role workflows while monitoring legal operations.
        </p>
      </Card>
    </section>
  );
}
