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

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.config.get<string>('aws.accessKeyId') || '',
        secretAccessKey: this.config.get<string>('aws.secretAccessKey') || '',
      },
    });
  }

  /** Upload audio file to the audio S3 bucket */
  async uploadAudio(
    buffer: Buffer,
    originalName: string,
    tenantId: string,
  ): Promise<string> {
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
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Generate a presigned upload URL for direct browser uploads */
  async getSignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn = 600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Delete an object from S3 */
  async delete(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  /** Check if an object exists in S3 */
  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
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

    await this.s3.send(
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
