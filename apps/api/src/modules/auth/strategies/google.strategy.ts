import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleOAuthProfile {
  provider: 'google';
  providerId: string;
  email: string;
  name: string;
  avatar: string | undefined;
  raw: Record<string, unknown>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('google.clientId', '');
    const clientSecret = configService.get<string>('google.clientSecret', '');
    const callbackURL = configService.get<string>(
      'google.callbackUrl',
      'http://localhost:3000/api/v1/auth/sso/google/callback',
    );

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email returned from Google'), undefined);
      return;
    }

    const oauthProfile: GoogleOAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatar: profile.photos?.[0]?.value,
      raw: profile._json as Record<string, unknown>,
    };

    done(null, oauthProfile);
  }
}
