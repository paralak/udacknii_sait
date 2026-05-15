import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Suggestion } from 'src/db/suggestion.entity';
import { Token } from 'src/db/token.entity';
import { Flags } from 'src/db/flags.entity';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Suggestion, Token, Flags])],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
