import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';

@Controller('client_api/suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Post('submit')
  submit(
    @Headers() headers: Record<string, string>,
    @Body() body: { category: string; text: string; contact?: string },
  ) {
    return this.suggestionsService.submit(
      headers,
      body.category,
      body.text,
      body.contact ?? null,
    );
  }

  @Get('list')
  getAll(@Headers() headers: Record<string, string>) {
    return this.suggestionsService.getAll(headers);
  }
}
