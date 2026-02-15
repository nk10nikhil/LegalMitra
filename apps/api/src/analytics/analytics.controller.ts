import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PageViewDto } from './dto/page-view.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('page-view')
  pageView(
    @Body() body: PageViewDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.analyticsService.trackPageView({
      ...body,
      userAgent,
      ipAddress,
    });
  }
}
