import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi } from '../api/auditLogs';

/**
 * The merchant audit trail, read by the Audit Logs tab in seller settings.
 *
 * This is all that survives of the old `usePhase7Queries` module. The rest of
 * it drove the storefront theme editor, custom domains and staff seats —
 * features that belonged to a seller running their own shop rather than a
 * seller listing on a marketplace.
 */
export const auditLogQueryKeys = {
  auditLogs: (limit: number) => ['auditLogs', limit] as const,
};

export function useAuditLogsQuery(limit = 50, enabled = true) {
  return useQuery({
    queryKey: auditLogQueryKeys.auditLogs(limit),
    queryFn: () => getAuditLogsApi(limit),
    enabled,
  });
}
