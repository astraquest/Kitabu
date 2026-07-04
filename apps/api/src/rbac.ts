import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppRole, AuthenticatedUser } from './types.js';

export function hasAnyRole(user: AuthenticatedUser, roles: AppRole[]): boolean {
  return roles.some(role => user.roles.includes(role));
}

export async function requireRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: AppRole[],
  options?: { requireStepUp?: boolean }
) {
  if (!request.user) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return true;
  }

  if (!hasAnyRole(request.user, roles)) {
    reply.status(403).send({
      error: 'Forbidden',
      message: 'Insufficient role'
    });
    return true;
  }

  if (options?.requireStepUp && !request.user.stepUp) {
    reply.status(428).send({
      message: 'Step-up authentication required'
    });
    return true;
  }
}

export async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return true;
  }
}

export async function requireSchoolContext(
  request: FastifyRequest,
  reply: FastifyReply,
  options?: { allowPlatformAdmin?: boolean }
) {
  const authError = await requireAuthenticated(request, reply);
  if (authError) {
    return true;
  }

  if ((options?.allowPlatformAdmin ?? true) && request.user!.roles.includes('platform_admin')) {
    return;
  }

  if (!request.user!.schoolId) {
    reply.status(403).send({
      error: 'Forbidden',
      message: 'School-scoped access required'
    });
    return true;
  }
}

export async function requireResourceOwner(
  request: FastifyRequest,
  reply: FastifyReply,
  ownerUserId: string,
  options?: { allowRoles?: AppRole[] }
) {
  const authError = await requireAuthenticated(request, reply);
  if (authError) {
    return true;
  }

  if (request.user!.id === ownerUserId) {
    return;
  }

  if (options?.allowRoles && hasAnyRole(request.user!, options.allowRoles)) {
    return;
  }

  reply.status(403).send({
    error: 'Forbidden',
    message: 'You do not have access to this resource'
  });
  return true;
}
