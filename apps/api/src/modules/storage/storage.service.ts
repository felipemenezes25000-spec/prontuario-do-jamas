import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const VALID_LOCAL_TYPES = ['audio', 'documents', 'images'] as const;
type LocalStorageType = (typeof VALID_LOCAL_TYPES)[number];

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null;
  private readonly useLocalStorage: boolean;
  private readonly localStoragePath: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    const accessKeyId = this.config.get<string>('aws.accessKeyId');

    if (!accessKeyId) {
      this.useLocalStorage = true;
      this.s3 = null;
      this.localStoragePath = path.resolve(process.cwd(), 'local-storage');

      // Create local storage directories
      for (const dir of VALID_LOCAL_TYPES) {
        const dirPath = path.join(this.localStoragePath, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }

      this.logger.warn(
        'AWS S3 not configured — using local file storage at: ' +
          this.localStoragePath,
      );
    } else {
      this.useLocalStorage = false;
      this.localStoragePath = '';
      this.s3 = new S3Client({
        region: this.config.get<string>('aws.region'),
        credentials: {
          accessKeyId,
          secretAccessKey:
            this.config.get<string>('aws.secretAccessKey') || '',
        },
      });
    }
  }

  /** Upload audio file to the audio S3 bucket */
  async uploadAudio(
    buffer: Buffer,
    originalName: string,
    tenantId: string,
  ): Promise<string> {
    const filename = `${tenantId}-${uuid()}-${this.sanitizeFilename(originalName)}`;

    if (this.useLocalStorage) {
      return this.uploadLocal('audio', filename, buffer);
    }

    return this.upload(
      this.config.get<string>('aws.s3.audio') || 'voxpep-audio',
      `${tenantId}/audio/${uuid()}-${this.sanitizeFilename(originalName)}`,
      buffer,
      this.getMimeType(originalName),
    );
  }

  /** Upload a document to the documents S3 bucket */
  async uploadDocument(
    buffer: Buffer,
    originalName: string,
    tenantId: string,
  ): Promise<string> {
    const filename = `${tenantId}-${uuid()}-${this.sanitizeFilename(originalName)}`;

    if (this.useLocalStorage) {
      return this.uploadLocal('documents', filename, buffer);
    }

    return this.upload(
      this.config.get<string>('aws.s3.documents') || 'voxpep-documents',
      `${tenantId}/documents/${uuid()}-${this.sanitizeFilename(originalName)}`,
      buffer,
      this.getMimeType(originalName),
    );
  }

  /** Upload an image to the images S3 bucket */
  async uploadImage(
    buffer: Buffer,
    originalName: string,
    tenantId: string,
  ): Promise<string> {
    const filename = `${tenantId}-${uuid()}-${this.sanitizeFilename(originalName)}`;

    if (this.useLocalStorage) {
      return this.uploadLocal('images', filename, buffer);
    }

    return this.upload(
      this.config.get<string>('aws.s3.images') || 'voxpep-images',
      `${tenantId}/images/${uuid()}-${this.sanitizeFilename(originalName)}`,
      buffer,
      this.getMimeType(originalName),
    );
  }

  /** Generate a presigned download URL */
  async getSignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (this.useLocalStorage) {
      // In local mode, bucket and key are ignored — we parse from stored URL or return a local path
      const apiUrl =
        this.config.get<string>('API_URL') || 'http://localhost:3000';
      return `${apiUrl}/storage/local/${bucket}/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3!, command, { expiresIn });
  }

  /** Generate a presigned upload URL for direct browser uploads */
  async getSignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn = 600,
  ): Promise<string> {
    if (this.useLocalStorage) {
      const apiUrl =
        this.config.get<string>('API_URL') || 'http://localhost:3000';
      return `${apiUrl}/storage/upload/local`;
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3!, command, { expiresIn });
  }

  /** Delete an object from S3 */
  async delete(bucket: string, key: string): Promise<void> {
    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }

    await this.s3!.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  /** Check if an object exists in S3 */
  async exists(bucket: string, key: string): Promise<boolean> {
    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, key);
      return fs.existsSync(filePath);
    }

    try {
      await this.s3!.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Resolve the absolute file path for a locally stored file */
  getLocalFilePath(type: string, filename: string): string | null {
    if (!VALID_LOCAL_TYPES.includes(type as LocalStorageType)) {
      return null;
    }
    const filePath = path.join(this.localStoragePath, type, filename);
    // Prevent path traversal
    if (!filePath.startsWith(this.localStoragePath)) {
      return null;
    }
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return filePath;
  }

  /** Whether the service is using local storage instead of S3 */
  isLocalMode(): boolean {
    return this.useLocalStorage;
  }

  private uploadLocal(
    type: LocalStorageType,
    filename: string,
    buffer: Buffer,
  ): string {
    const filePath = path.join(this.localStoragePath, type, filename);
    fs.writeFileSync(filePath, buffer);

    const apiUrl =
      this.config.get<string>('API_URL') || 'http://localhost:3000';

    this.logger.log(
      `Local storage: saved ${type}/${filename} (${buffer.length} bytes)`,
    );

    return `${apiUrl}/storage/local/${type}/${filename}`;
  }

  private async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    this.logger.log(
      `Uploading to s3://${bucket}/${key} (${buffer.length} bytes)`,
    );

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );

    return `s3://${bucket}/${key}`;
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      webm: 'audio/webm',
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      xml: 'application/xml',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
