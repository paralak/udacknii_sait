import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const port = process.env.PORT || 3000;
console.log(`Launching NestJS app on port ${port}, URL: http://0.0.0.0:${port}`);

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(port);
}

bootstrap();
