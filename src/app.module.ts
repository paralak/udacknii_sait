import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {Bd_importModule} from './bd_import/bd_import.module';
import { DBModule } from './db/db.module'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientAPIModule } from './client_api/client_api.module';
import { PersonalModule } from './client_api/personal/personal.module';
import { OtchetModule } from './client_api/otchet/otchet.module';
import { ZarplatiModule } from './client_api/zarplati/zarplati.module';
import { ChatModule } from './client_api/chat/chat.module';
import { OrdersModule } from './client_api/orders/orders.module';
import { OstatkiModule } from './client_api/ostatki/ostatki.module';

@Module({
    imports: [
        Bd_importModule,
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: '10.182.226.152',
            port: 3306,
            username: 'root',
            password: 'rAY25WP0jStu8JB',
            database: 'site_db',
            autoLoadEntities: true,
        }),
        ClientAPIModule,
        DBModule,
        PersonalModule,
        OtchetModule,
        ZarplatiModule,
        ChatModule,
        OrdersModule,
        OstatkiModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
