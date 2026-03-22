import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface DailyRoomResponse {
  url: string;
  name: string;
}

interface DailyTokenResponse {
  token: string;
}

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.config.get<string>('DAILY_API_KEY') ?? '';
    this.enabled = !!this.apiKey;
    if (!this.enabled) {
      this.logger.warn('DAILY_API_KEY not set — telemedicine in demo mode');
    }
  }

  async createRoom(encounterId: string): Promise<{ roomUrl: string; token: string }> {
    if (!this.enabled) {
      const demoUrl = `https://voxpep.daily.co/demo-${encounterId.slice(0, 8)}`;
      this.logger.log(`[DEMO] Created room: ${demoUrl}`);
      return { roomUrl: demoUrl, token: 'demo-token' };
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        name: `encounter-${encounterId.slice(0, 8)}`,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200,
          enable_chat: true,
          enable_screenshare: true,
        },
      }),
    });
    const room = (await response.json()) as DailyRoomResponse;

    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        properties: { room_name: room.name, is_owner: true },
      }),
    });
    const tokenData = (await tokenRes.json()) as DailyTokenResponse;

    return { roomUrl: room.url, token: tokenData.token };
  }

  async getParticipantToken(
    roomName: string,
    userName: string,
    isOwner: boolean,
  ): Promise<string> {
    if (!this.enabled) {
      this.logger.log(`[DEMO] Generated participant token for ${userName} in ${roomName}`);
      return 'demo-participant-token';
    }

    const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner,
        },
      }),
    });
    const data = (await res.json()) as DailyTokenResponse;
    return data.token;
  }

  async deleteRoom(roomName: string): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`[DEMO] Deleted room: ${roomName}`);
      return;
    }

    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}
