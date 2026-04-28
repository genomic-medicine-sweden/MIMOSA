import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(identifier: string, password: string) {
    let user = await this.usersService.findByEmail(identifier);
    if (!user) {
      user = await this.usersService.findByUsername(identifier);
    }

    const isValid =
      user &&
      (await this.usersService.comparePassword(password, user.passwordHash));

    if (!isValid || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id,
      email: user.email ?? null,
      username: user.username ?? null,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload, { expiresIn: '30m' });

    return {
      access_token,
      expires_in: 1800,
      isAutomation: user.role === 'automation',
      user: {
        email: user.email ?? null,
        username: user.username ?? null,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        homeCounty: user.homeCounty,
      },
    };
  }
}
