import {Module} from '@nestjs/common';
import {Bd_importController} from './bd_import.controller';
import {Bd_importService} from './bd_import.service';

@Module({
    imports: [],
    controllers: [Bd_importController],
    providers: [Bd_importService],
})
export class Bd_importModule {
}
