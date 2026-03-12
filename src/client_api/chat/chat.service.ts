import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat_bukket } from 'src/db/chat_bukket.entity';
import { Chat_list } from 'src/db/chat_list.entity';
import { Hid_for_chat } from 'src/db/hid_for_chat.entity';
import { Hierarchy } from 'src/db/hierarchy.entity';
import { Token } from 'src/db/token.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Hid_for_chat)
        private hidForChatRepository: Repository<Hid_for_chat>,

        @InjectRepository(Hierarchy)
        private hierarchyRepository: Repository<Hierarchy>,

        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,

        @InjectRepository(Chat_bukket)
        private chatBukketRepository: Repository<Chat_bukket>,

        @InjectRepository(Chat_list)
        private chatListRepository: Repository<Chat_list>
    ) {}

    async checkToken(token: string) {
        let r = await this.tokenRepository.findOne({
            where: { token }
        });
        if (!r) {
            return {
                status: 'error',
                message: 'Токен не найден',
            };
        }
        if (r.expired < new Date()) {
            return {
                status: 'error',
                message: 'Токен истек',
            };
        }
        return {
            status: 'success',
            data: r.user_id,
        };
    }

    async getAccess(hid: number) {
        let r = await this.hidForChatRepository.findOne({
            where: { access: hid }
        });
        let res = [hid];
        if (r) {
            res.push(r.hid);
        }
        // убираем повторения в массиве
        res = Array.from(new Set(res));
        return {
            status: 'success',
            data: res,
        }
    }

    async getAccessList(hid: number) {
        let r = await this.hidForChatRepository.find({
            where: { access: hid }
        });
        let res = [hid];
        for (let item of r) {
            res.push(item.hid);
        }
        // убираем повторения в массиве
        res = Array.from(new Set(res));
        //заменяем id на объекты иерархии
        let res2 = [];
        for (let id of res) {
            let hierarchy = await this.hierarchyRepository.findOne({
                where: { id }
            });
            if (hierarchy) {
                res2.push(hierarchy);
            }
        }
        return {
            status: 'success',
            data: res2,
        }
    }

    async getLastMessageForChat(chatId: number) {
        // find last message by chatId in chat_bukket table, timestamp should be the latest
        let r = await this.chatBukketRepository.findOne({
            where: { chat_id: chatId },
            order: { timestamp: 'DESC' }
        });
        if (!r) {
            return {
                status: 'success',
                data: 'Нет сообщений',
            };
        }
        return {
            status: 'success',
            data: r,
        };
    }

    async getChatListForUser(userId: number) {
        let accessCheck = await this.getAccess(userId);
        if (accessCheck.status === 'error') {
            return accessCheck;
        }
        let hids = accessCheck.data;
        let chatLists = await this.chatListRepository.find({
            where: { hid_from: In(hids) }
        });
        let chatLists2 = await this.chatListRepository.find({
            where: { hid_to: In(hids) }
        });
        chatLists = chatLists.concat(chatLists2);
        // for each chatList find last message and add it to the response
        for (let chatList of chatLists) {
            let lastMessage = await this.getLastMessageForChat(chatList.id);
            chatList['last_message'] = lastMessage.data;
        }
        return {
            status: 'success',
            data: chatLists,
        };
    }

    // Получить список пользователей, которым можно отправить сообщение
    async getUsersList(UserId: number) {
        let r = await this.hidForChatRepository.find();
        if (!r || r.length === 0) {
            return {
                status: 'error',
                message: 'Пользователи не найдены',
            };
        }
        // для каждого пользователя найти его имя в иерархии и добавить его в ответ
        let ans = [];
        for (let user of r) {
            let hierarchy = await this.hierarchyRepository.findOne({
                where: { id: user.hid }
            });
            ans.push(hierarchy);
        }
        // удалить из ответа пользователя который делает запрос
        ans = ans.filter(user => user.id !== UserId);
        return {
            status: 'success',
            data: ans,
        };
    }

    // Создание нового чата
    async createChat(hidFrom: number, hidTo: number) {
        // Проверяем, существует ли уже чат между этими пользователями
        let existingChat = await this.chatListRepository.findOne({
            where: [
                { hid_from: hidFrom, hid_to: hidTo },
                { hid_from: hidTo, hid_to: hidFrom }
            ]
        });
        if (existingChat) {
            return {
                status: 'error',
                message: 'Чат между этими пользователями уже существует',
            };
        }
        // Проверяем, существуют ли оба пользователя в системе
        let userFrom = await this.hierarchyRepository.findOne({
            where: { id: hidFrom }
        });
        let userTo = await this.hierarchyRepository.findOne({
            where: { id: hidTo }
        });
        if (!userFrom || !userTo) {
            return {
                status: 'error',
                message: 'Один или оба пользователя не найдены',
            };
        }
        // Проверяем что пользователи разные
        if (hidFrom === hidTo) {
            return {
                status: 'error',
                message: 'Нельзя создать чат с самим собой',
            };
        }
        // Создаем новый чат
        let newChat = this.chatListRepository.create({
            hid_from: hidFrom,
            hid_to: hidTo
        });
        await this.chatListRepository.save(newChat);
        // возвращаем полный объект чата, а не только его id
        newChat = await this.chatListRepository.findOne({
            where: { id: newChat.id }
        });
        return {
            status: 'success',
            data: newChat,
        };
    }

    // Получить сообщения для чата
    async getMessagesForChat(chatId: number, userId: number) {
        let messages = await this.chatBukketRepository.find({
            where: { chat_id: chatId },
            order: { timestamp: 'ASC' }
        });
        // Когда пользователь получает сообщения, помечаем как прочитанные те сообщения, которые были отправлены не им
        for (let message of messages) {
            if (message.hid !== userId && message.is_readed === 0) {
                message.is_readed = 1;
                await this.chatBukketRepository.save(message);
            }
        }
        // так же возвращаем текущее время для клиента, для обновления чата в реальном времени
        return {
            status: 'success',
            data: messages,
            current_time: new Date(),
        };
    }

    // Отправить сообщение в чат
    async sendMessage(chatId: number, hidFrom: number, message: string) {
        // Проверяем, существует ли чат
        let chat = await this.chatListRepository.findOne({
            where: { id: chatId }
        });
        if (!chat) {
            return {
                status: 'error',
                message: 'Чат не найден',
            };
        }
        // Проверяем, что пользователь является участником чата
        if (chat.hid_from !== hidFrom && chat.hid_to !== hidFrom) {
            return {
                status: 'error',
                message: 'Пользователь не является участником чата',
            };
        }
        // Создаем новое сообщение
        let newMessage = this.chatBukketRepository.create({
            chat_id: chatId,
            hid: hidFrom,
            timestamp: new Date(),
            message,
            is_readed: 0
        });
        await this.chatBukketRepository.save(newMessage);
        return {
            status: 'success',
            data: newMessage,
        };
    }

    //метод для проверки необходимости обновления чата, принимает id чата и время последнего обновления на клиенте, возвращает true если есть новые сообщения, false если нет
    async checkForChatUpdates(chatId: number, lastUpdateTime: Date) {
        let newMessages = await this.chatBukketRepository.find({
            where: { chat_id: chatId, timestamp: In([lastUpdateTime, new Date()]) }
        });
        // если есть новые сообщения, возвращаем true и все сообщения сообщения, иначе false, так же возвращаем текущее время для клиента, для обновления чата в реальном времени
        let messages = await this.chatBukketRepository.find({
            where: { chat_id: chatId },
            order: { timestamp: 'ASC' }
        });
        if (newMessages.length > 0) {
            return {
                status: 'success',
                data: true,
                newMessages: messages,
                current_time: new Date(),
            };
        }
        return {
            status: 'success',
            data: false,
            current_time: new Date(),
        };
    }
}