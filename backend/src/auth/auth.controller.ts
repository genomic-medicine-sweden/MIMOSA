import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOAuth2, ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Response, Request } from 'express';
import { Get } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

@ApiExcludeController()
@ApiOAuth2(['password'])
@Controller('api/auth')
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.secureCookies = config.get<string>('SECURE_COOKIES') === 'true';
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const identifier = body.username ?? body.email;
    if (!identifier) {
      throw new BadRequestException('Either email or username is required.');
    }

    const result = await this.authService.login(identifier, body.password);

    const isBrowserRequest = req.headers['x-client'] === 'browser';

    if (result.isAutomation && isBrowserRequest) {
      throw new UnauthorizedException(
        'Automation accounts cannot log in via the browser.',
      );
    }

    if (!result.isAutomation) {
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: this.secureCookies,
      });
    }

    const { isAutomation, ...response } = result;
    return response;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req) {
    return req.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.secureCookies,
    });
    return { message: 'Logged out successfully' };
  }
}
