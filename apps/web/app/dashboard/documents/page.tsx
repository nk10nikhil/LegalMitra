'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

const DOCUMENT_TYPES = [
  'rent_agreement',
  'legal_notice_cheque_bounce',
  'affidavit_name_change',
  'consumer_complaint',
  'leave_and_license',
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

type TemplateConfig = {
  label: string;
  fields: Array<{ name: string; label: string; placeholder: string }>;
  schema: z.ZodType<Record<string, string>>;
};

const templateConfigs: Record<DocumentType, TemplateConfig> = {
  rent_agreement: {
    label: 'Rent Agreement',
    fields: [
      { name: 'landlordName', label: 'Landlord Name', placeholder: 'Ramesh Sharma' },
      { name: 'tenantName', label: 'Tenant Name', placeholder: 'Priya Verma' },
      {
        name: 'propertyAddress',
        label: 'Property Address',
        placeholder: 'Flat No 301, Andheri East, Mumbai',
      },
      { name: 'monthlyRent', label: 'Monthly Rent', placeholder: '25000' },
      { name: 'securityDeposit', label: 'Security Deposit', placeholder: '50000' },
      { name: 'durationMonths', label: 'Duration (months)', placeholder: '11' },
      { name: 'agreementDate', label: 'Agreement Date', placeholder: '2026-02-15' },
    ],
    schema: z.object({
      landlordName: z.string().min(1),
      tenantName: z.string().min(1),
      propertyAddress: z.string().min(5),
      monthlyRent: z.string().min(1),
      securityDeposit: z.string().min(1),
      durationMonths: z.string().min(1),
      agreementDate: z.string().min(1),
    }),
  },
  legal_notice_cheque_bounce: {
    label: 'Legal Notice (Cheque Bounce)',
    fields: [
      { name: 'senderName', label: 'Sender Name', placeholder: 'Amit Gupta' },
      { name: 'receiverName', label: 'Receiver Name', placeholder: 'Vikas Singh' },
      { name: 'chequeNumber', label: 'Cheque Number', placeholder: '123456' },
      { name: 'chequeDate', label: 'Cheque Date', placeholder: '2026-02-01' },
      { name: 'bankName', label: 'Bank Name', placeholder: 'SBI Main Branch' },
      { name: 'amount', label: 'Amount', placeholder: '75000' },
      { name: 'noticeDate', label: 'Notice Date', placeholder: '2026-02-15' },
      {
        name: 'paymentDeadlineDays',
        label: 'Payment Deadline (days)',
        placeholder: '15',
      },
    ],
    schema: z.object({
      senderName: z.string().min(1),
      receiverName: z.string().min(1),
      chequeNumber: z.string().min(1),
      chequeDate: z.string().min(1),
      bankName: z.string().min(1),
      amount: z.string().min(1),
      noticeDate: z.string().min(1),
      paymentDeadlineDays: z.string().min(1),
    }),
  },
  affidavit_name_change: {
    label: 'Affidavit (Name Change)',
    fields: [
      { name: 'deponentName', label: 'Deponent Name', placeholder: 'Rahul Kumar' },
      { name: 'oldName', label: 'Old Name', placeholder: 'Rahul' },
      { name: 'newName', label: 'New Name', placeholder: 'Rahul Kumar' },
      {
        name: 'fatherOrSpouseName',
        label: 'Father/Spouse Name',
        placeholder: 'Suresh Kumar',
      },
      { name: 'address', label: 'Address', placeholder: 'Patna, Bihar' },
      { name: 'reason', label: 'Reason', placeholder: 'Name correction in records' },
      { name: 'affidavitDate', label: 'Affidavit Date', placeholder: '2026-02-15' },
    ],
    schema: z.object({
      deponentName: z.string().min(1),
      oldName: z.string().min(1),
      newName: z.string().min(1),
      fatherOrSpouseName: z.string().min(1),
      address: z.string().min(3),
      reason: z.string().min(3),
      affidavitDate: z.string().min(1),
    }),
  },
  consumer_complaint: {
    label: 'Consumer Complaint',
    fields: [
      { name: 'complainantName', label: 'Complainant Name', placeholder: 'Neha Mehta' },
      {
        name: 'oppositePartyName',
        label: 'Opposite Party Name',
        placeholder: 'ABC Electronics Pvt Ltd',
      },
      { name: 'productOrService', label: 'Product/Service', placeholder: 'Washing Machine' },
      { name: 'transactionDate', label: 'Transaction Date', placeholder: '2026-01-10' },
      { name: 'amountPaid', label: 'Amount Paid', placeholder: '32000' },
      {
        name: 'grievanceSummary',
        label: 'Grievance Summary',
        placeholder: 'Product stopped working within 10 days',
      },
      { name: 'reliefSought', label: 'Relief Sought', placeholder: 'Refund and compensation' },
    ],
    schema: z.object({
      complainantName: z.string().min(1),
      oppositePartyName: z.string().min(1),
      productOrService: z.string().min(1),
      transactionDate: z.string().min(1),
      amountPaid: z.string().min(1),
      grievanceSummary: z.string().min(3),
      reliefSought: z.string().min(3),
    }),
  },
  leave_and_license: {
    label: 'Leave and License',
    fields: [
      { name: 'licensorName', label: 'Licensor Name', placeholder: 'Anita Rao' },
      { name: 'licenseeName', label: 'Licensee Name', placeholder: 'Sanjay Das' },
      {
        name: 'propertyAddress',
        label: 'Property Address',
        placeholder: 'HSR Layout, Bengaluru',
      },
      { name: 'licenseFee', label: 'License Fee', placeholder: '28000' },
      { name: 'securityDeposit', label: 'Security Deposit', placeholder: '70000' },
      { name: 'licensePeriodMonths', label: 'License Period (months)', placeholder: '11' },
      { name: 'startDate', label: 'Start Date', placeholder: '2026-03-01' },
      { name: 'lockInPeriodMonths', label: 'Lock-in Period (months)', placeholder: '6' },
    ],
    schema: z.object({
      licensorName: z.string().min(1),
      licenseeName: z.string().min(1),
      propertyAddress: z.string().min(5),
      licenseFee: z.string().min(1),
      securityDeposit: z.string().min(1),
      licensePeriodMonths: z.string().min(1),
      startDate: z.string().min(1),
      lockInPeriodMonths: z.string().min(1),
    }),
  },
};

type DocumentItem = {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  downloadUrl: string | null;
  createdAt: string;
};

type FormShape = {
  title: string;
  caseId: string;
  [key: string]: string;
};

function TemplateForm({
  selectedType,
  onGenerated,
}: {
  selectedType: DocumentType;
  onGenerated: (document: DocumentItem) => void;
}) {
  const config = useMemo(() => templateConfigs[selectedType], [selectedType]);
  const queryClient = useQueryClient();

  const baseSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(3, 'Title is required').max(140),
        caseId: z.string().optional(),
      }),
    [],
  );

  const formSchema = useMemo(() => baseSchema.and(config.schema), [baseSchema, config.schema]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: config.label,
      caseId: '',
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (values: FormShape) => {
      const { title, caseId, ...formData } = values;
      const response = await api.post<DocumentItem>('/documents/generate', {
        type: selectedType,
        title,
        caseId: caseId || undefined,
        formData,
      });
      return response.data;
    },
    onSuccess: async (document) => {
      toast.success('Document generated successfully');
      onGenerated(document);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      reset({ title: config.label, caseId: '' });
    },
    onError: () => {
      toast.error('Failed to generate document. Please check fields and try again.');
    },
  });

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit((values) => generateMutation.mutate(values))}>
        <div className="space-y-1">
          <label className="text-sm font-medium">Document Title</label>
          <Input {...register('title')} placeholder="Document title" />
          {errors.title ? <p className="text-xs text-rose-600">{errors.title.message}</p> : null}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Case ID (optional)</label>
          <Input {...register('caseId')} placeholder="Optional case UUID" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {config.fields.map((field) => (
            <div className="space-y-1" key={field.name}>
              <label className="text-sm font-medium">{field.label}</label>
              <Input {...register(field.name)} placeholder={field.placeholder} />
              {errors[field.name]?.message ? (
                <p className="text-xs text-rose-600">{String(errors[field.name]?.message)}</p>
              ) : null}
            </div>
          ))}
        </div>

        <Button className="w-full" disabled={generateMutation.isPending} type="submit">
          {generateMutation.isPending ? 'Generating PDF...' : 'Generate Document'}
        </Button>
      </form>
    </Card>
  );
}

export default function DocumentsPage() {
  const [selectedType, setSelectedType] = useState<DocumentType>('rent_agreement');
  const [latestDocument, setLatestDocument] = useState<DocumentItem | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get<DocumentItem[]>('/documents')).data,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Document Generator</h1>

      <Card className="space-y-2">
        <label className="text-sm font-medium">Select Template</label>
        <select
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
          onChange={(event) => setSelectedType(event.target.value as DocumentType)}
          value={selectedType}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {templateConfigs[type].label}
            </option>
          ))}
        </select>
      </Card>

      <TemplateForm onGenerated={setLatestDocument} selectedType={selectedType} />

      {latestDocument?.downloadUrl ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Latest Generated PDF</h2>
            <a href={latestDocument.downloadUrl} rel="noreferrer" target="_blank">
              <Button type="button" variant="outline">
                Download PDF
              </Button>
            </a>
          </div>
          <iframe className="h-[560px] w-full rounded border" src={latestDocument.downloadUrl} />
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">My Documents</h2>
        {isLoading ? <p className="text-sm text-slate-500">Loading documents...</p> : null}
        {!isLoading && !documents?.length ? <Card>No documents generated yet.</Card> : null}
        <div className="grid gap-3">
          {documents?.map((item) => (
            <Card className="space-y-1" key={item.id}>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-slate-600">Type: {item.type}</p>
              <p className="text-sm text-slate-600">
                Created: {new Date(item.createdAt).toLocaleString()}
              </p>
              {item.downloadUrl ? (
                <a href={item.downloadUrl} rel="noreferrer" target="_blank">
                  <Button type="button" variant="outline">
                    Open / Download
                  </Button>
                </a>
              ) : (
                <p className="text-xs text-slate-500">
                  Download URL not available. Check storage configuration.
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
