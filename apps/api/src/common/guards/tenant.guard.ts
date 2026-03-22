import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ROLES } from '../constants/roles';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // System admins can access any tenant
    if (user.role === ROLES.SYSTEM_ADMIN) {
      return true;
    }

    // Check if tenantId in route params matches user's tenant
    const paramsTenantId = request.params.tenantId;

    if (paramsTenantId && paramsTenantId !== user.tenantId) {
      throw new ForbiddenException(
        'You do not have permission to access this tenant\'s resources',
      );
    }

    return true;
  }
}
