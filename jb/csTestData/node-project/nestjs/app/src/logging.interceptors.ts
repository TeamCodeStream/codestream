import { Logger, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const url = context.getArgByIndex(0).originalUrl
    this.logger.log(`Before ${url}`)

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => this.logger.log(`After ${url}... ${Date.now() - now}ms`)),
      );
  }
}
