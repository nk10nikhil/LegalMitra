export type UserRole = 'citizen' | 'lawyer' | 'judge' | 'admin';

export interface TrackedCase {
  id: string;
  caseNumber: string;
  courtCode: string;
  status: string;
  nextHearing: string | null;
  lastSynced: string;
}

export interface CaseDetail extends TrackedCase {
  caseData: Record<string, unknown>;
  createdAt: string;
}
