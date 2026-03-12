import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat_list } from 'src/db/chat_list.entity';
import { Chat_bukket } from 'src/db/chat_bukket.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { Hid_for_chat } from 'src/db/hid_for_chat.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        Chat_list,
        Chat_bukket,
        Hierarchy,
        Token,
        Hid_for_chat,
    ])],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule {
}