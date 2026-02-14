import { Card } from '@legalmitra/ui';

export default function LawyerDashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Lawyer Dashboard</h1>
      <Card>
        <p className="text-sm text-slate-600">
          Manage client cases, view updates, and maintain your lawyer profile and activity.
        </p>
      </Card>
    </section>
  );
}
