import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  async generateText(
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    this.logger.warn(
      'Gemini fallback called — configure GOOGLE_API_KEY for production',
    );
    throw new Error(
      'Gemini provider not configured. Set GOOGLE_API_KEY in environment.',
    );
  }

  async generateJson<T = unknown>(
    prompt: string,
    systemPrompt?: string,
  ): Promise<T> {
    const text = await this.generateText(prompt, systemPrompt);
    return JSON.parse(text) as T;
  }
}
