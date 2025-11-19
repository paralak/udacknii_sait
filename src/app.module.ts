import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {Bd_importModule} from './bd_import/bd_import.module';

@Module({
    imports: [Bd_importModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
