import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: 'Text message content' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'Attachment URL (image, PDF, etc.)' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class MarkMessagesReadDto {
  // No body fields needed — sessionId comes from route param, user from JWT
}

export class ChatHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Page number (default 1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default 50, max 200)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
