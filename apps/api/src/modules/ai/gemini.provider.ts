import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private model: GenerativeModel | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('google.apiKey');
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      this.logger.log('Gemini provider initialized (gemini-2.5-flash)');
    } else {
      this.logger.warn('GOOGLE_API_KEY not set — Gemini fallback unavailable');
    }
  }

  get isAvailable(): boolean {
    return this.model !== null;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini not configured — set GOOGLE_API_KEY');
    }

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${prompt}`
      : prompt;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    });

    return result.response.text();
  }

  async generateJson<T = unknown>(
    prompt: string,
    systemPrompt?: string,
  ): Promise<T> {
    if (!this.model) {
      throw new Error('Gemini not configured — set GOOGLE_API_KEY');
    }

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nResponda APENAS com JSON válido, sem markdown, sem backticks.\n\n${prompt}`
      : `Responda APENAS com JSON válido.\n\n${prompt}`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const text = result.response
      .text()
      .replace(/```json\n?|```/g, '')
      .trim();

    return JSON.parse(text) as T;
  }
}
