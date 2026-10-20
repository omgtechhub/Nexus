import { User, Merchant, MerchantMember, Role } from '@prisma/client';

export interface AuthenticatedUser extends Omit<User, 'passwordHash'> {}

export interface AuthenticatedContext {
  user: AuthenticatedUser;
  merchant: Merchant;
  membership: MerchantMember;
}
