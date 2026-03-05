import { Body, Controller, Get, Patch, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Setup2faResponseDto } from './dto/setup-2fa-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Role } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful or requires 2FA', schema: { oneOf: [{ $ref: '#/components/schemas/AuthResponseDto' }, { type: 'object', properties: { requires2fa: { type: 'boolean', example: true }, twoFactorToken: { type: 'string' } } }] } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.validateUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, changePasswordDto);
    return { message: 'Password updated successfully' };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'If account exists, reset link sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Set new password using reset token' })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password updated successfully. You can now sign in.' };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    return { message: 'Logout successful' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start 2FA setup (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns QR/secret for authenticator app', type: Setup2faResponseDto })
  async setup2fa(@CurrentUser() user: any) {
    return this.authService.setup2fa(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA after verifying code (admin only)' })
  @ApiResponse({ status: 200, description: '2FA enabled' })
  async enable2fa(@CurrentUser() user: any, @Body() dto: Enable2faDto) {
    await this.authService.enable2fa(user.id, dto);
    return { message: '2FA enabled successfully' };
  }

  @Public()
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify TOTP 2FA code and complete login' })
  @ApiResponse({ status: 200, description: 'Returns access token and user', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired token or code' })
  async verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto);
  }

  @Public()
  @Post('2fa/verify-email')
  @ApiOperation({ summary: 'Verify email OTP code and complete admin login' })
  @ApiResponse({ status: 200, description: 'Returns access token and user', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP or session' })
  async verifyEmailOtp(@Body() dto: Verify2faDto) {
    return this.authService.verifyEmailOtp(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA (admin only)' })
  @ApiResponse({ status: 200, description: '2FA disabled' })
  async disable2fa(@CurrentUser() user: any) {
    await this.authService.disable2fa(user.id);
    return { message: '2FA disabled successfully' };
  }
}
