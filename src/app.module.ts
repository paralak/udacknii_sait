import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {Bd_importService} from './bd_import/bd_import.service';

@Module({
    imports: [Bd_importService],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
