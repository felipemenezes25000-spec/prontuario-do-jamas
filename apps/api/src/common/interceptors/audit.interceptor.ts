import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers, params } = request;
    const user = request.user;
    const userAgent = headers['user-agent'] || 'unknown';
    const controllerName = context.getClass().name;

    const actionMap: Record<string, AuditAction> = {
      GET: AuditAction.READ,
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    const action = actionMap[method] ?? AuditAction.READ;
    const entity = controllerName.replace('Controller', '');
    const entityId = params.id || null;

    return next.handle().pipe(
      tap({
        next: () => {
          if (user) {
            this.prisma.auditLog
              .create({
                data: {
                  userId: user.sub,
                  tenantId: user.tenantId,
                  action,
                  entity,
                  entityId,
                  newData: {
                    method,
                    url,
                    ip,
                    userAgent,
                  },
                  ipAddress: ip,
                  userAgent,
                },
              })
              .catch((err: Error) => {
                this.logger.error(`Failed to create audit log: ${err.message}`);
              });
          }
        },
        error: () => {
          if (user) {
            this.prisma.auditLog
              .create({
                data: {
                  userId: user.sub,
                  tenantId: user.tenantId,
                  action,
                  entity,
                  entityId,
                  newData: {
                    method,
                    url,
                    ip,
                    userAgent,
                    failed: true,
                  },
                  ipAddress: ip,
                  userAgent,
                },
              })
              .catch((err: Error) => {
                this.logger.error(`Failed to create audit log: ${err.message}`);
              });
          }
        },
      }),
    );
  }
}
