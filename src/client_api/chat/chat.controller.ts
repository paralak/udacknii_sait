import {Body, Controller, Get, Head, Post, Query} from '@nestjs/common';
import { ChatService } from './chat.service';
import {Headers} from '@nestjs/common';
import { from } from 'rxjs';

@Controller('client_api/chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {
    }

    @Get('get_hid_for_chat')
    async getHidForChat(@Headers() headers: Record<string, string>) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const userId = tokenCheck.data;
        const accessCheck = await this.chatService.getAccessList(userId);
        return accessCheck;
    }

    @Get('get_chat_list')
    async getChatList(@Headers() headers: Record<string, string>) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const userId = tokenCheck.data;
        const chatList = await this.chatService.getChatListForUser(userId);
        return chatList;
    }

    // получаем список пользователей которым можно отправить сообщение
    @Get('get_users_list')
    async getUsersList(@Headers() headers: Record<string, string>) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const userId = tokenCheck.data;
        const usersList = await this.chatService.getUsersList(userId);
        return usersList;
    }

    @Get('create_chat')
    async createChat(@Headers() headers: Record<string, string>, @Query('hid_from') hidFrom: number, @Query('hid_to') hidTo: number) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const chat = await this.chatService.createChat(hidFrom, hidTo);
        return chat;
    }

    @Get('get_messages')
    async getMessages(@Headers() headers: Record<string, string>, @Query('chat_id') chatId: number) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const userId = tokenCheck.data;
        const messages = await this.chatService.getMessagesForChat(chatId, userId);
        return messages;
    }


    @Post('send_message')
    async sendMessage(@Headers() headers: Record<string, string>, @Body() body: { chat_id: number, message: string, from_hid: number }) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }

        const { chat_id, message, from_hid } = body;
        const sendResult = await this.chatService.sendMessage(chat_id, from_hid, message);
        return sendResult;
    }

    @Get('check_for_chat_updates')
    async checkForChatUpdates(@Headers() headers: Record<string, string>, @Query('chat_id') chatId: number, @Query('last_message_time') lastUpdateTime: string) {
        const cookies = headers['cookie'];
        const token = cookies.match(/auth_token=([^;]+)/)?.[1];
        if (!token) {
            return {
                status: 'error',
                message: 'Токен не предоставлен',
            };
        }

        const tokenCheck = await this.chatService.checkToken(token);
        if (tokenCheck.status === 'error') {
            return tokenCheck;
        }


        const userId = tokenCheck.data;
        const lastUpdateDate = new Date(lastUpdateTime);
        const hasUpdates = await this.chatService.checkForChatUpdates(chatId, lastUpdateDate);
        return hasUpdates;
    }
}