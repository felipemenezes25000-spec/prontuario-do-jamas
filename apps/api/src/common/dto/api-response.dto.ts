import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'ISO timestamp' })
  timestamp: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Array of items', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiPropertyOptional({ description: 'Whether there is a previous page' })
  hasPrevious: boolean;

  @ApiProperty({ description: 'ISO timestamp' })
  timestamp: string;
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponseDto<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    success: true,
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    timestamp: new Date().toISOString(),
  };
}
