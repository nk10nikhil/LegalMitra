import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const DOCUMENT_TYPES = [
  'rent_agreement',
  'legal_notice_cheque_bounce',
  'affidavit_name_change',
  'consumer_complaint',
  'leave_and_license',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class GenerateDocumentDto {
  @IsString()
  @IsIn(DOCUMENT_TYPES)
  type!: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsObject()
  formData!: Record<string, string | number | boolean | null>;
}
