'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type CaseItem = { id: string; status: string };
type HearingItem = { id: string; status: string };
type AuditItem = { id: string; action: string; createdAt: string };
type TimeEntry = {
  id: string;
  caseId: string | null;
  description: string;
  hours: number;
  hourlyRate: number;
  workedAt: string;
};
type CaseRef = { id: string; caseNumber: string; courtCode: string };
type CaseInvite = {
  id: string;
  caseId: string;
  inviteeEmail: string;
  status: string;
  createdAt: string;
};
type InvoiceResponse = {
  id: string;
  title: string;
  downloadUrl: string | null;
  totalHours: number;
  totalAmount: number;
  createdAt: string;
};

const timeEntrySchema = z.object({
  caseId: z.string().optional(),
  description: z.string().min(3, 'Description is required').max(500),
  hours: z.string().min(1, 'Hours are required'),
  hourlyRate: z.string().min(1, 'Hourly rate is required'),
  workedAt: z.string().min(1, 'Worked at date is required'),
});

const inviteSchema = z.object({
  caseId: z.string().uuid('Select a valid case'),
  inviteeEmail: z.string().email('Enter a valid email'),
  message: z.string().min(3, 'Message is required').max(280),
});

const invoiceSchema = z.object({
  caseId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  title: z.string().max(180).optional(),
});

type TimeEntryForm = z.infer<typeof timeEntrySchema>;
type InviteForm = z.infer<typeof inviteSchema>;
type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function LawyerDashboardPage() {
  const queryClient = useQueryClient();
  const [latestInvoice, setLatestInvoice] = useState<InvoiceResponse | null>(null);

  const {
    register: registerTime,
    handleSubmit: handleTimeSubmit,
    reset: resetTime,
    formState: { errors: timeErrors },
  } = useForm<TimeEntryForm>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      caseId: '',
      description: '',
      hours: '',
      hourlyRate: '',
      workedAt: '',
    },
  });

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      caseId: '',
      inviteeEmail: '',
      message: 'You now have invited access to this case in LegalMitra.',
    },
  });

  const { register: registerInvoice, handleSubmit: handleInvoiceSubmit } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      caseId: '',
      from: '',
      to: '',
      title: '',
    },
  });

  const { data: cases } = useQuery({
    queryKey: ['lawyer-cases-overview'],
    queryFn: async () => (await api.get<CaseItem[]>('/cases')).data,
  });

  const { data: caseRefs } = useQuery({
    queryKey: ['lawyer-cases-ref'],
    queryFn: async () => (await api.get<CaseRef[]>('/cases')).data,
  });

  const { data: hearings } = useQuery({
    queryKey: ['lawyer-hearings-overview'],
    queryFn: async () => (await api.get<HearingItem[]>('/hearings')).data,
  });

  const { data: audit } = useQuery({
    queryKey: ['lawyer-audit-overview'],
    queryFn: async () => (await api.get<AuditItem[]>('/audit-logs?limit=10')).data,
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['lawyer-time-entries'],
    queryFn: async () => (await api.get<TimeEntry[]>('/lawyer/time-entries')).data,
  });

  const { data: invites } = useQuery({
    queryKey: ['lawyer-case-invites'],
    queryFn: async () => (await api.get<CaseInvite[]>('/lawyer/case-invites')).data,
  });

  const createTimeEntry = useMutation({
    mutationFn: async (values: TimeEntryForm) =>
      (
        await api.post<TimeEntry>('/lawyer/time-entries', {
          caseId: values.caseId || undefined,
          description: values.description,
          hours: Number(values.hours),
          hourlyRate: Number(values.hourlyRate),
          workedAt: new Date(values.workedAt).toISOString(),
        })
      ).data,
    onSuccess: async () => {
      toast.success('Time entry added');
      resetTime({ caseId: '', description: '', hours: '', hourlyRate: '', workedAt: '' });
      await queryClient.invalidateQueries({ queryKey: ['lawyer-time-entries'] });
    },
    onError: () => toast.error('Unable to add time entry'),
  });

  const createInvite = useMutation({
    mutationFn: async (values: InviteForm) => (await api.post('/lawyer/case-invites', values)).data,
    onSuccess: async () => {
      toast.success('Case invite created');
      resetInvite({
        caseId: '',
        inviteeEmail: '',
        message: 'You now have invited access to this case in LegalMitra.',
      });
      await queryClient.invalidateQueries({ queryKey: ['lawyer-case-invites'] });
    },
    onError: () => toast.error('Unable to create invite'),
  });

  const generateInvoice = useMutation({
    mutationFn: async (values: InvoiceForm) =>
      (
        await api.post<InvoiceResponse>('/lawyer/invoices', {
          caseId: values.caseId || undefined,
          from: values.from ? new Date(values.from).toISOString() : undefined,
          to: values.to ? new Date(values.to).toISOString() : undefined,
          title: values.title || undefined,
        })
      ).data,
    onSuccess: (invoice) => {
      setLatestInvoice(invoice);
      toast.success('Invoice generated');
    },
    onError: () => toast.error('Unable to generate invoice'),
  });

  const caseLabel = (caseId: string | null) => {
    if (!caseId) return 'General';
    const row = caseRefs?.find((item) => item.id === caseId);
    return row ? `${row.caseNumber} (${row.courtCode})` : caseId;
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Lawyer Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">Assigned/Tracked Cases</p>
          <p className="text-2xl font-semibold">{cases?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Scheduled Hearings</p>
          <p className="text-2xl font-semibold">
            {hearings?.filter((item) => item.status === 'scheduled').length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Recent Actions</p>
          <p className="text-2xl font-semibold">{audit?.length ?? 0}</p>
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Latest Activity</h2>
        {!audit?.length ? (
          <p className="text-sm text-slate-600">No activity yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {audit.map((item) => (
              <li key={item.id}>
                {item.action} • {new Date(item.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Track Billable Hours</h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleTimeSubmit((values) => createTimeEntry.mutate(values))}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Case (optional)</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              defaultValue=""
              {...registerTime('caseId')}
            >
              <option value="">General / no case</option>
              {caseRefs?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseNumber} ({item.courtCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Drafted reply, consultation, evidence prep"
              {...registerTime('description')}
            />
            {timeErrors.description ? (
              <p className="text-xs text-rose-600">{timeErrors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hours</label>
            <Input min="0.1" step="0.1" type="number" {...registerTime('hours')} />
            {timeErrors.hours ? (
              <p className="text-xs text-rose-600">{timeErrors.hours.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Hourly Rate (₹)</label>
            <Input min="0" step="0.01" type="number" {...registerTime('hourlyRate')} />
            {timeErrors.hourlyRate ? (
              <p className="text-xs text-rose-600">{timeErrors.hourlyRate.message}</p>
            ) : null}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Worked At</label>
            <Input type="datetime-local" {...registerTime('workedAt')} />
            {timeErrors.workedAt ? (
              <p className="text-xs text-rose-600">{timeErrors.workedAt.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Button className="w-full" disabled={createTimeEntry.isPending} type="submit">
              {createTimeEntry.isPending ? 'Saving...' : 'Add Time Entry'}
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Recent Time Entries</p>
          {!timeEntries?.length ? (
            <p className="text-slate-600">No time entries yet.</p>
          ) : (
            <ul className="space-y-1 text-slate-700">
              {timeEntries.slice(0, 8).map((entry) => (
                <li key={entry.id}>
                  {new Date(entry.workedAt).toLocaleDateString()} • {entry.description} •{' '}
                  {entry.hours.toFixed(2)}h × ₹{entry.hourlyRate.toFixed(2)} •{' '}
                  {caseLabel(entry.caseId)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Generate Invoice PDF</h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleInvoiceSubmit((values) => generateInvoice.mutate(values))}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Invoice Title (optional)</label>
            <Input placeholder="Invoice - February 2026" {...registerInvoice('title')} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Case (optional)</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              defaultValue=""
              {...registerInvoice('caseId')}
            >
              <option value="">All cases</option>
              {caseRefs?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseNumber} ({item.courtCode})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">From (optional)</label>
            <Input type="date" {...registerInvoice('from')} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">To (optional)</label>
            <Input type="date" {...registerInvoice('to')} />
          </div>

          <div className="md:col-span-2">
            <Button className="w-full" disabled={generateInvoice.isPending} type="submit">
              {generateInvoice.isPending ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </form>

        {latestInvoice ? (
          <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">
            <p className="font-medium">{latestInvoice.title}</p>
            <p>
              Total: {latestInvoice.totalHours.toFixed(2)} hours • ₹
              {latestInvoice.totalAmount.toFixed(2)}
            </p>
            <p>Generated: {new Date(latestInvoice.createdAt).toLocaleString()}</p>
            {latestInvoice.downloadUrl ? (
              <a
                className="text-blue-700 underline"
                href={latestInvoice.downloadUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open Invoice PDF
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Invite Client to Case</h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={handleInviteSubmit((values) => createInvite.mutate(values))}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Case</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              defaultValue=""
              {...registerInvite('caseId')}
            >
              <option disabled value="">
                Select case
              </option>
              {caseRefs?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseNumber} ({item.courtCode})
                </option>
              ))}
            </select>
            {inviteErrors.caseId ? (
              <p className="text-xs text-rose-600">{inviteErrors.caseId.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Invitee Email</label>
            <Input
              placeholder="client@example.com"
              type="email"
              {...registerInvite('inviteeEmail')}
            />
            {inviteErrors.inviteeEmail ? (
              <p className="text-xs text-rose-600">{inviteErrors.inviteeEmail.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Message</label>
            <Input placeholder="Access details" {...registerInvite('message')} />
            {inviteErrors.message ? (
              <p className="text-xs text-rose-600">{inviteErrors.message.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Button className="w-full" disabled={createInvite.isPending} type="submit">
              {createInvite.isPending ? 'Inviting...' : 'Create Invite'}
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Recent Invites</p>
          {!invites?.length ? (
            <p className="text-slate-600">No invites created yet.</p>
          ) : (
            <ul className="space-y-1 text-slate-700">
              {invites.slice(0, 8).map((invite) => (
                <li key={invite.id}>
                  {invite.inviteeEmail} • {invite.status} • {caseLabel(invite.caseId)} •{' '}
                  {new Date(invite.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
}
