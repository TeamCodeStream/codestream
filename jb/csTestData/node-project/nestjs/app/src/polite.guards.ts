import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class PolitenessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // If you're impolite, you don't get any access
    if (request?.query?.please === 'no') {
      return false;
    }
    return true;
  }
}
