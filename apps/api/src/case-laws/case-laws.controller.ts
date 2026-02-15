import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { SearchCaseLawsDto } from './dto/search-case-laws.dto';
import { CaseLawsService } from './case-laws.service';

@Controller('case-laws')
export class CaseLawsController {
  constructor(private readonly caseLawsService: CaseLawsService) {}

  @Get('search')
  @ProtectedRoute()
  search(@CurrentUser() user: { id: string }, @Query() query: SearchCaseLawsDto) {
    return this.caseLawsService.search(user.id, query);
  }
}
