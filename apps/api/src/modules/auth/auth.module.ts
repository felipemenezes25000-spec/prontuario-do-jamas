import { Module, Logger, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SsoService } from './sso.service';
import { WebAuthnService } from './webauthn.service';
import { AuthController } from './auth.controller';
import { WebAuthnController } from './webauthn.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';

const logger = new Logger('AuthModule');

/** Only register OAuth strategies when credentials are configured */
function buildOAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  providers.push({
    provide: GoogleStrategy,
    useFactory: (configService: ConfigService) => {
      const clientId = configService.get<string>('google.clientId');
      if (!clientId) {
        logger.warn('GOOGLE_CLIENT_ID not set — Google SSO disabled');
        return null;
      }
      return new GoogleStrategy(configService);
    },
    inject: [ConfigService],
  });

  providers.push({
    provide: MicrosoftStrategy,
    useFactory: (configService: ConfigService) => {
      const clientId = configService.get<string>('microsoft.clientId');
      if (!clientId) {
        logger.warn('MICROSOFT_CLIENT_ID not set — Microsoft SSO disabled');
        return null;
      }
      return new MicrosoftStrategy(configService);
    },
    inject: [ConfigService],
  });

  return providers;
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('jwt.accessExpiration', '15m');
        return {
          secret: configService.get<string>('jwt.secret') ?? 'default-secret',
          signOptions: {
            expiresIn: expiresIn as unknown as number,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, WebAuthnController],
  providers: [
    AuthService,
    SsoService,
    WebAuthnService,
    JwtStrategy,
    LocalStrategy,
    ...buildOAuthProviders(),
  ],
  exports: [AuthService, SsoService, WebAuthnService],
})
export class AuthModule {}
