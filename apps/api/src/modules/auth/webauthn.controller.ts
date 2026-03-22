import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { WebAuthnService } from './webauthn.service';
import {
  WebAuthnRegisterVerifyDto,
  WebAuthnLoginOptionsDto,
  WebAuthnLoginVerifyDto,
} from './dto/webauthn.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth - WebAuthn')
@Controller('auth/webauthn')
export class WebAuthnController {
  private readonly logger = new Logger(WebAuthnController.name);

  constructor(private readonly webAuthnService: WebAuthnService) {}

  // ===== Registration (requires auth) =====

  @Post('register/options')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate WebAuthn registration options' })
  @ApiResponse({ status: 200, description: 'Registration options returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerOptions(@CurrentUser() user: JwtPayload) {
    return this.webAuthnService.generateRegistrationOptions(
      user.sub,
      user.email,
      user.email,
    );
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify WebAuthn registration response' })
  @ApiResponse({ status: 200, description: 'Credential registered successfully' })
  @ApiResponse({ status: 400, description: 'Verification failed' })
  async registerVerify(
    @CurrentUser() user: JwtPayload,
    @Body() dto: WebAuthnRegisterVerifyDto,
  ) {
    return this.webAuthnService.verifyRegistration(
      user.sub,
      dto.credential as unknown as RegistrationResponseJSON,
    );
  }

  // ===== Authentication (public) =====

  @Public()
  @Post('login/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate WebAuthn authentication options' })
  @ApiResponse({ status: 200, description: 'Authentication options returned' })
  @ApiResponse({ status: 400, description: 'No credentials registered' })
  async loginOptions(@Body() dto: WebAuthnLoginOptionsDto) {
    return this.webAuthnService.generateAuthenticationOptions(dto.email);
  }

  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify WebAuthn authentication and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful, tokens returned' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async loginVerify(@Body() dto: WebAuthnLoginVerifyDto) {
    return this.webAuthnService.verifyAuthentication(
      dto.email,
      dto.credential as unknown as AuthenticationResponseJSON,
    );
  }

  // ===== Credential Management (requires auth) =====

  @Get('credentials')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List registered WebAuthn credentials' })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  async listCredentials(@CurrentUser() user: JwtPayload) {
    return this.webAuthnService.getCredentials(user.sub);
  }

  @Delete('credentials/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a WebAuthn credential' })
  @ApiResponse({ status: 200, description: 'Credential removed' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async removeCredential(
    @CurrentUser() user: JwtPayload,
    @Param('id') credentialId: string,
  ) {
    return this.webAuthnService.removeCredential(user.sub, credentialId);
  }
}
