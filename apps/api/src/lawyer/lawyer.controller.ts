import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { CreateCaseInviteDto } from './dto/create-case-invite.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { ListTimeEntriesDto } from './dto/list-time-entries.dto';
import { LawyerService } from './lawyer.service';

@Controller('lawyer')
export class LawyerController {
  constructor(private readonly lawyerService: LawyerService) {}

  @Post('time-entries')
  @ProtectedRoute()
  createTimeEntry(@CurrentUser() user: { id: string }, @Body() body: CreateTimeEntryDto) {
    return this.lawyerService.createTimeEntry(user.id, body);
  }

  @Get('time-entries')
  @ProtectedRoute()
  listTimeEntries(@CurrentUser() user: { id: string }, @Query() query: ListTimeEntriesDto) {
    return this.lawyerService.listTimeEntries(user.id, query);
  }

  @Post('invoices')
  @ProtectedRoute()
  generateInvoice(@CurrentUser() user: { id: string }, @Body() body: GenerateInvoiceDto) {
    return this.lawyerService.generateInvoice(user.id, body);
  }

  @Post('case-invites')
  @ProtectedRoute()
  createInvite(@CurrentUser() user: { id: string }, @Body() body: CreateCaseInviteDto) {
    return this.lawyerService.createCaseInvite(user.id, body);
  }

  @Get('case-invites')
  @ProtectedRoute()
  listInvites(@CurrentUser() user: { id: string }) {
    return this.lawyerService.listCaseInvites(user.id);
  }
}
