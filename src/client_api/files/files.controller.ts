import {
  Controller,
  Post,
  Headers,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, File as MulterFile } from 'multer';
import { FilesService } from './files.service';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('client_api/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async uploadFile(
    @Headers() headers: Record<string, string>,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_SIZE })],
      }),
    )
    file: MulterFile,
  ) {
    return this.filesService.uploadFile(headers, file);
  }
}
