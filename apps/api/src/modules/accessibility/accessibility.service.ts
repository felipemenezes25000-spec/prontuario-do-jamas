import { Injectable, Logger } from '@nestjs/common';
import {
  UpdateAccessibilitySettingsDto,
  AccessibilitySettingsResponseDto,
  ContrastMode,
} from './dto/accessibility.dto';

@Injectable()
export class AccessibilityService {
  private readonly logger = new Logger(AccessibilityService.name);

  // In-memory store (stub — replace with Prisma when model is available)
  private readonly settings = new Map<string, AccessibilitySettingsResponseDto>();

  private getDefaultSettings(userId: string): AccessibilitySettingsResponseDto {
    return {
      userId,
      fontSize: 16,
      contrastMode: ContrastMode.NORMAL,
      screenReaderMode: false,
      reducedMotion: false,
      language: 'pt-BR',
      updatedAt: new Date().toISOString(),
    };
  }

  async getSettings(userId: string): Promise<AccessibilitySettingsResponseDto> {
    this.logger.log(`Fetching accessibility settings for user ${userId}`);
    const existing = this.settings.get(userId);
    if (existing) {
      return existing;
    }
    const defaults = this.getDefaultSettings(userId);
    this.settings.set(userId, defaults);
    return defaults;
  }

  async updateSettings(
    userId: string,
    dto: UpdateAccessibilitySettingsDto,
  ): Promise<AccessibilitySettingsResponseDto> {
    this.logger.log(`Updating accessibility settings for user ${userId}`);
    const current = await this.getSettings(userId);
    const updated: AccessibilitySettingsResponseDto = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.settings.set(userId, updated);
    return updated;
  }
}
