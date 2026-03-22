import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
  Req,
  Res,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SsoService, OAuthProfile } from './sso.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyMfaDto,
  DisableMfaDto,
  MfaBackupDto,
  SSOTokenExchangeDto,
  SSODetectDto,
  SSOConfigureDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly ssoService: SsoService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns tokens and user info (or MFA challenge)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email or CPF already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New token pair returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  // ===== MFA Endpoints =====

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Generate MFA secret and QR code for setup' })
  @ApiResponse({ status: 200, description: 'QR code and backup codes returned' })
  async mfaSetup(@CurrentUser() user: JwtPayload) {
    return this.authService.generateMfaSecret(user.sub);
  }

  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify TOTP code and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async mfaVerifySetup(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyMfaDto,
  ) {
    return this.authService.verifyMfaSetup(user.sub, dto.code);
  }

  @Public()
  @Post('mfa/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate TOTP code during login (uses mfaToken from login response)' })
  @ApiResponse({ status: 200, description: 'MFA validated, full tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code or expired MFA token' })
  async mfaValidate(
    @Headers('x-mfa-token') mfaToken: string,
    @Body() dto: VerifyMfaDto,
  ) {
    if (!mfaToken) {
      throw new Error('x-mfa-token header is required');
    }
    return this.authService.validateMfaCode(mfaToken, dto.code);
  }

  @Public()
  @Post('mfa/backup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate with backup code during login (uses mfaToken from login response)' })
  @ApiResponse({ status: 200, description: 'Backup code accepted, full tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid backup code or expired MFA token' })
  async mfaBackup(
    @Headers('x-mfa-token') mfaToken: string,
    @Body() dto: MfaBackupDto,
  ) {
    if (!mfaToken) {
      throw new Error('x-mfa-token header is required');
    }
    return this.authService.validateBackupCode(mfaToken, dto.backupCode);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable MFA (requires valid TOTP code)' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async mfaDisable(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DisableMfaDto,
  ) {
    return this.authService.disableMfa(user.sub, dto.code);
  }

  @Post('mfa/regenerate-backup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Regenerate backup codes (requires valid TOTP code)' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async mfaRegenerateBackup(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyMfaDto,
  ) {
    return this.authService.regenerateBackupCodes(user.sub, dto.code);
  }

  // ===== SSO Endpoints =====

  @Public()
  @Get('sso/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Google login' })
  ssoGoogle(): void {
    // Guard redirects to Google
  }

  @Public()
  @Get('sso/google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with SSO token' })
  async ssoGoogleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as OAuthProfile;
    await this.handleOAuthCallback(profile, res);
  }

  @Public()
  @Get('sso/microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Initiate Microsoft OAuth flow' })
  @ApiResponse({ status: 302, description: 'Redirects to Microsoft login' })
  ssoMicrosoft(): void {
    // Guard redirects to Microsoft
  }

  @Public()
  @Get('sso/microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with SSO token' })
  async ssoMicrosoftCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const profile = req.user as OAuthProfile;
    await this.handleOAuthCallback(profile, res);
  }

  @Public()
  @Post('sso/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange SSO token for VoxPEP JWT (SPA flow)' })
  @ApiResponse({ status: 200, description: 'Tokens and user info returned' })
  @ApiResponse({ status: 401, description: 'Invalid SSO token' })
  async ssoTokenExchange(@Body() dto: SSOTokenExchangeDto) {
    return this.ssoService.validateSSOToken(dto.provider, dto.token);
  }

  @Public()
  @Get('sso/detect')
  @ApiOperation({ summary: 'Detect if email domain has SSO configured' })
  @ApiQuery({ name: 'email', required: true, description: 'Email to check' })
  @ApiResponse({ status: 200, description: 'SSO detection result' })
  async ssoDetect(@Query() dto: SSODetectDto) {
    return this.ssoService.detectSSOFromEmail(dto.email);
  }

  @Post('sso/configure')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Configure SSO for tenant (admin only)' })
  @ApiResponse({ status: 200, description: 'SSO configuration updated' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async ssoConfigure(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SSOConfigureDto,
  ) {
    if (user.role !== 'ADMIN') {
      throw new Error('Only administrators can configure SSO');
    }
    return this.ssoService.configureTenantSSO(user.tenantId, dto);
  }

  @Get('sso/config')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current tenant SSO configuration' })
  @ApiResponse({ status: 200, description: 'Current SSO config' })
  async ssoGetConfig(@CurrentUser() user: JwtPayload) {
    return this.ssoService.getTenantSSOConfig(user.tenantId);
  }

  // ===== Private SSO Helpers =====

  private async handleOAuthCallback(
    profile: OAuthProfile,
    res: Response,
  ): Promise<void> {
    try {
      const authResponse = await this.ssoService.findOrCreateOAuthUser(profile);
      const exchangeToken = await this.ssoService.generateSSOExchangeToken(
        authResponse.user.id,
      );

      const appUrl = this.authService.getAppUrl();
      const redirectUrl = `${appUrl}/auth/sso/callback?token=${encodeURIComponent(exchangeToken)}&provider=${encodeURIComponent(profile.provider)}`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('OAuth callback error', error instanceof Error ? error.stack : String(error));
      const appUrl = this.authService.getAppUrl();
      const errorMessage = error instanceof Error ? error.message : 'SSO authentication failed';
      res.redirect(
        `${appUrl}/login?sso_error=${encodeURIComponent(errorMessage)}`,
      );
    }
  }
}
