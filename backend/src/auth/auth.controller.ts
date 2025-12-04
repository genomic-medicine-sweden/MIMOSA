import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOAuth2, ApiExcludeController } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@ApiExcludeController()
@ApiOAuth2(['password'])
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.username, body.password);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
    });

    return {
      ...result,
      user: result.user,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
    });

    return { message: 'Logged out successfully' };
  }
}
