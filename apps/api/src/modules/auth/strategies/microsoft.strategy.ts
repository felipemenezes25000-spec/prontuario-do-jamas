import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';

export interface MicrosoftOAuthProfile {
  provider: 'microsoft';
  providerId: string;
  email: string;
  name: string;
  avatar: string | undefined;
  raw: Record<string, unknown>;
}

interface MicrosoftPassportProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string; type?: string }>;
  _json?: Record<string, unknown>;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('microsoft.clientId', '');
    const clientSecret = configService.get<string>('microsoft.clientSecret', '');
    const tenantId = configService.get<string>('microsoft.tenantId', 'common');
    const callbackURL = configService.get<string>(
      'microsoft.callbackUrl',
      'http://localhost:3000/api/v1/auth/sso/microsoft/callback',
    );

    super({
      clientID,
      clientSecret,
      callbackURL,
      tenant: tenantId,
      scope: ['user.read'],
      authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: MicrosoftPassportProfile,
    done: (error: Error | null, user?: MicrosoftOAuthProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email returned from Microsoft'));
      return;
    }

    const oauthProfile: MicrosoftOAuthProfile = {
      provider: 'microsoft',
      providerId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatar: undefined,
      raw: (profile._json ?? {}) as Record<string, unknown>,
    };

    done(null, oauthProfile);
  }
}
