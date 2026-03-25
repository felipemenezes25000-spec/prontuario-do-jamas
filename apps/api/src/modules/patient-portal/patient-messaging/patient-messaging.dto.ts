import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Thread UUID (omit to start new thread)' })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiPropertyOptional({ description: 'Recipient doctor UUID (for new thread)' })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiProperty({ description: 'Message subject (for new thread)' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: 'Attachment URL' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
