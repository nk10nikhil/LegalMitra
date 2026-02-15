import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { SummarizeDocumentDto } from './dto/summarize-document.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('generate')
  @ProtectedRoute()
  generate(@CurrentUser() user: { id: string }, @Body() body: GenerateDocumentDto) {
    return this.documentsService.generate(user.id, body);
  }

  @Post('summarize')
  @ProtectedRoute()
  @UseInterceptors(FileInterceptor('file'))
  summarize(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SummarizeDocumentDto,
  ) {
    return this.documentsService.summarize(user.id, file, body);
  }

  @Get()
  @ProtectedRoute()
  list(@CurrentUser() user: { id: string }) {
    return this.documentsService.list(user.id);
  }

  @Get(':id')
  @ProtectedRoute()
  one(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.documentsService.getOne(user.id, id);
  }
}
