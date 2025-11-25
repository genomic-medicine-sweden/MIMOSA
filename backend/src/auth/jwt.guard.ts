import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: any;
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    const method = request.method;
    const path = request.path;

    const domain = this.configService.get<string>('DOMAIN');
    const port = this.configService.get<string>('FRONTEND_PORT');
    const frontendOrigin = `http://${domain}:${port}`;

    const allowedUnauthenticatedGETs = [
      '/api/similarity',
      '/api/logs',
      '/api/clustering',
      '/api/features',
    ];

    if (
      origin === frontendOrigin &&
      method == 'GET' &&
      allowedUnauthenticatedGETs.some((allowed) => path.startsWith(allowed))
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}
