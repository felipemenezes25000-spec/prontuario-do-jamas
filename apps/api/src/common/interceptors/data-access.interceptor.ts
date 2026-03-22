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
import { DataAccessAction } from '@prisma/client';

/**
 * Data Access Interceptor — LGPD Art. 37
 *
 * Logs every access to patient data (VIEW, CREATE, UPDATE, DELETE)
 * into the DataAccessLog table for compliance auditing.
 *
 * Apply to patient-related controllers via @UseInterceptors(DataAccessInterceptor).
 */
@Injectable()
export class DataAccessInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DataAccessInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, params, body } = request;
    const user = request.user;
    const controllerName = context.getClass().name;

    const actionMap: Record<string, DataAccessAction> = {
      GET: 'VIEW',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action: DataAccessAction = actionMap[method] ?? 'VIEW';
    const resource = controllerName.replace('Controller', '');

    // Extract patientId from params or body
    const patientId: string | undefined =
      params?.patientId ?? params?.id ?? body?.patientId ?? undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          if (user) {
            this.prisma.dataAccessLog
              .create({
                data: {
                  tenantId: user.tenantId,
                  userId: user.sub,
                  patientId: patientId ?? null,
                  action,
                  resource,
                  resourceId: params?.id ?? null,
                  purpose: `${method} ${url}`,
                  ipAddress: ip,
                },
              })
              .catch((err: Error) => {
                this.logger.error(
                  `Failed to create data access log: ${err.message}`,
                );
              });
          }
        },
      }),
    );
  }
}
