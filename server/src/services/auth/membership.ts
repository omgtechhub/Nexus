/**
 * Which merchant account a signed-in user is acting for.
 *
 * Four call sites each reached for `memberships[0]` — whichever row the
 * database happened to return first. That was only ever ambiguous because
 * nothing stopped a user owning several merchant records; a partial unique
 * index now guarantees at most one OWNER membership per user
 * (`20261017120000_one_merchant_account_per_owner`), so there is a single
 * correct answer and this returns it.
 *
 * The ordering still matters for the case the constraint deliberately allows:
 * a user who owns their own merchant account *and* has been invited onto
 * someone else's as STAFF. Their own account is the one they are acting for;
 * an invitation should never silently take over their session.
 */

type RoleLike = string;

interface MembershipLike {
  role: RoleLike;
  createdAt?: Date | string | null;
}

/** Lower sorts first. */
function rank(role: RoleLike): number {
  if (role === 'OWNER') return 0;
  if (role === 'ADMIN') return 1;
  return 2;
}

export function activeMembershipOf<T extends MembershipLike>(
  memberships: T[] | null | undefined
): T | undefined {
  if (!memberships || memberships.length === 0) return undefined;
  if (memberships.length === 1) return memberships[0];

  return [...memberships].sort((a, b) => {
    const byRole = rank(a.role) - rank(b.role);
    if (byRole !== 0) return byRole;

    // Same role on two accounts: the older one, so the answer is stable
    // across requests rather than dependent on row order.
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  })[0];
}
