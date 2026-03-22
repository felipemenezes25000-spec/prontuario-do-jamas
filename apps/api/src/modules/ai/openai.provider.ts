import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';

export const OpenAiProvider: Provider = {
  provide: OPENAI_CLIENT,
  useFactory: (configService: ConfigService): OpenAI | null => {
    const apiKey = configService.get<string>('openai.apiKey');
    if (!apiKey) {
      console.warn(
        '[VoxPEP] OPENAI_API_KEY not configured — AI services will be unavailable.',
      );
      return null as unknown as OpenAI;
    }
    return new OpenAI({ apiKey });
  },
  inject: [ConfigService],
};
