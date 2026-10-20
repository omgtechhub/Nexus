import { AuthenticatedUser } from './index.js';
import { Merchant, MerchantMember, Role, VoicePortal } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      merchant?: Merchant;
      membership?: MerchantMember;
      memberRole?: Role;
      sessionId?: string;
      /** Which portal's voice profile this request speaks to. Set where the
       *  voice routes are mounted, because one person may hold a seller and a
       *  customer account and enrolling for one must not unlock the other. */
      voicePortal?: VoicePortal;
    }
  }
}
