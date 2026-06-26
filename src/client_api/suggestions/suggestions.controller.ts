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
    return this.suggestionsService.submit(headers, body.category, body.text, body.contact ?? null);
  }

  @Get('my')
  getMy(@Headers() headers: Record<string, string>) {
    return this.suggestionsService.getMy(headers);
  }

  @Get('list')
  getAll(@Headers() headers: Record<string, string>) {
    return this.suggestionsService.getAll(headers);
  }

  @Post('reply')
  reply(
    @Headers() headers: Record<string, string>,
    @Body() body: { suggestionId: number; text: string },
  ) {
    if (!body.suggestionId || !body.text?.trim()) {
      return { status: 'error', message: 'Недостаточно данных' };
    }
    return this.suggestionsService.reply(headers, body.suggestionId, body.text);
  }
}
