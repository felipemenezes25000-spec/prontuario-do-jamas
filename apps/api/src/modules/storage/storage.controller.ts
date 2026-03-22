import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { CurrentUser, CurrentTenant } from '../../common/decorators';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/audio')
  @ApiOperation({ summary: 'Upload audio file (max 50MB)' })
  @ApiResponse({ status: 201, description: 'Audio uploaded' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'audio/webm',
          'audio/mp4',
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de arquivo não permitido: ${file.mimetype}. Use: ${allowedMimes.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const url = await this.storageService.uploadAudio(
      file.buffer,
      file.originalname,
      tenantId,
    );
    return { url, originalName: file.originalname, size: file.size };
  }

  @Post('upload/document')
  @ApiOperation({ summary: 'Upload document file (max 20MB)' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/xml',
          'text/xml',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de arquivo não permitido: ${file.mimetype}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const url = await this.storageService.uploadDocument(
      file.buffer,
      file.originalname,
      tenantId,
    );
    return { url, originalName: file.originalname, size: file.size };
  }

  @Post('upload/image')
  @ApiOperation({ summary: 'Upload image file (max 10MB)' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de arquivo não permitido: ${file.mimetype}. Use: ${allowedMimes.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const url = await this.storageService.uploadImage(
      file.buffer,
      file.originalname,
      tenantId,
    );
    return { url, originalName: file.originalname, size: file.size };
  }

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get presigned download URL' })
  @ApiQuery({ name: 'bucket', required: true, description: 'S3 bucket name' })
  @ApiQuery({ name: 'key', required: true, description: 'Object key' })
  @ApiQuery({ name: 'expiresIn', required: false, description: 'URL expiry in seconds (default 3600)' })
  @ApiResponse({ status: 200, description: 'Presigned URL' })
  async getPresignedUrl(
    @Query('bucket') bucket: string,
    @Query('key') key: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    if (!bucket || !key) {
      throw new BadRequestException(
        'Parâmetros "bucket" e "key" são obrigatórios',
      );
    }
    const ttl = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.storageService.getSignedDownloadUrl(
      bucket,
      key,
      ttl,
    );
    return { url, expiresIn: ttl };
  }
}
