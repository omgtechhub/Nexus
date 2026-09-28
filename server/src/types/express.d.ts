import { AuthenticatedUser } from './index.js';
import { Store, StoreMember, Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      store?: Store;
      membership?: StoreMember;
      memberRole?: Role;
      sessionId?: string;
    }
  }
}
