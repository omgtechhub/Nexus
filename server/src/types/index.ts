import { User, Store, StoreMember, Role } from '@prisma/client';

export interface AuthenticatedUser extends Omit<User, 'passwordHash'> {}

export interface AuthenticatedContext {
  user: AuthenticatedUser;
  store: Store;
  membership: StoreMember;
}
