import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessibilityService } from './accessibility.service';
import {
  UpdateAccessibilitySettingsDto,
  AccessibilitySettingsResponseDto,
} from './dto/accessibility.dto';

@ApiTags('Accessibility')
@Controller('accessibility')
export class AccessibilityController {
  constructor(private readonly accessibilityService: AccessibilityService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get accessibility settings for the current user' })
  @ApiResponse({ status: 200, description: 'Accessibility settings retrieved', type: AccessibilitySettingsResponseDto })
  async getSettings(
    @Query('userId') userId: string,
  ): Promise<AccessibilitySettingsResponseDto> {
    return this.accessibilityService.getSettings(userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update accessibility settings (font size, contrast, screen reader mode)' })
  @ApiResponse({ status: 200, description: 'Accessibility settings updated', type: AccessibilitySettingsResponseDto })
  async updateSettings(
    @Query('userId') userId: string,
    @Body() dto: UpdateAccessibilitySettingsDto,
  ): Promise<AccessibilitySettingsResponseDto> {
    return this.accessibilityService.updateSettings(userId, dto);
  }
}
