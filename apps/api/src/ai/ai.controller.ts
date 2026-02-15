import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProtectedRoute } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AskAiDto } from './dto/ask-ai.dto';
import { PredictAiDto } from './dto/predict-ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  @ProtectedRoute()
  ask(@CurrentUser() user: { id: string }, @Body() body: AskAiDto) {
    return this.aiService.ask(user.id, body);
  }

  @Get('history')
  @ProtectedRoute()
  history(@CurrentUser() user: { id: string }) {
    return { messages: this.aiService.getHistory(user.id) };
  }

  @Post('predict')
  @ProtectedRoute()
  predict(@CurrentUser() user: { id: string }, @Body() body: PredictAiDto) {
    return this.aiService.predict(user.id, body);
  }
}
