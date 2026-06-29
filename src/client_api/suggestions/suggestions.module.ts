import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Suggestion } from 'src/db/suggestion.entity';
import { SuggestionReply } from 'src/db/suggestion_reply.entity';
import { Flags } from 'src/db/flags.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { PushSubscription } from 'src/db/push_subscription.entity';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Suggestion, SuggestionReply, Flags, Hierarchy, PushSubscription])],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
