import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { validateCartApi, CartValidationResult } from '../api/storefront';
import { useCart, CartCorrection, CartStoreGroup } from '../context/CartContext';

/**
 * Re-check the cart against each store's server before anyone is asked to pay.
 *
 * The cart lives in the browser, so every figure in it is a client-side claim:
 * a price can be stale by days, stock can have gone, a product can have been
 * unpublished. `POST /storefront/:store/cart/validate` is the authority, and
 * what it returns is written back over the cart with `reconcile`, so the
 * shopper sees the correction before checkout rather than an error after it.
 *
 * This does not replace server-side validation at checkout — the checkout
 * transaction re-reads prices and stock itself and is what the order is built
 * from. This exists so the number on screen matches it.
 */

export interface GroupValidation {
  storeId: string;
  isLoading: boolean;
  isError: boolean;
  result?: CartValidationResult;
}

/** A stable key for a group, so a re-render alone does not refetch. */
function signatureOf(group: CartStoreGroup) {
  return group.items
    .map(i => `${i.variantId}:${i.quantity}`)
    .sort()
    .join('|');
}

export function useCartValidation(groups: CartStoreGroup[]) {
  const { reconcile } = useCart();

  const queries = useQueries({
    queries: groups.map(group => ({
      queryKey: ['cart-validation', group.storeId, signatureOf(group)] as const,
      queryFn: () =>
        validateCartApi(
          group.storeId,
          group.items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
        ),
      enabled: group.items.length > 0,
      staleTime: 30 * 1000,
      retry: false,
    })),
  });

  const validations = useMemo<GroupValidation[]>(
    () =>
      groups.map((group, index) => ({
        storeId: group.storeId,
        isLoading: queries[index]?.isLoading ?? false,
        isError: queries[index]?.isError ?? false,
        result: queries[index]?.data,
      })),
    // `queries` is a fresh array each render; the data identities inside it are
    // what actually change, so they are the dependency.
    [groups, queries.map(q => q.status).join(','), queries.map(q => q.dataUpdatedAt).join(',')]
  );

  /**
   * Fold server values back into the cart.
   *
   * Only genuine differences are applied. Writing the same numbers back on
   * every pass would churn the cart's state for no reason.
   */
  useEffect(() => {
    const corrections: CartCorrection[] = [];

    for (const validation of validations) {
      const items = validation.result?.items;
      if (!items) continue;

      const group = groups.find(g => g.storeId === validation.storeId);
      if (!group) continue;

      for (const line of items) {
        const local = group.items.find(i => i.variantId === line.variantId);
        if (!local) continue;

        // A line the server cannot find or price is no longer purchasable.
        if (!line.productId) {
          corrections.push({ variantId: line.variantId, remove: true });
          continue;
        }

        const priceChanged = typeof line.price === 'number' && line.price !== local.price;
        const stockChanged =
          typeof line.availableStock === 'number' && line.availableStock !== local.maxStock;

        if (priceChanged || stockChanged) {
          corrections.push({
            variantId: line.variantId,
            ...(priceChanged ? { price: line.price } : {}),
            ...(stockChanged ? { maxStock: line.availableStock } : {}),
          });
        }
      }
    }

    if (corrections.length) reconcile(corrections);
  }, [validations, groups, reconcile]);

  const isValidating = validations.some(v => v.isLoading);
  const hasBlockingProblem = validations.some(
    v => v.result && v.result.isValid === false
  );

  return { validations, isValidating, hasBlockingProblem };
}

/** The server's verdict on one line, for display next to it. */
export function lineProblem(
  validation: GroupValidation | undefined,
  variantId: string
): string | null {
  const line = validation?.result?.items.find(i => i.variantId === variantId);
  if (!line) return null;
  if (line.error) return line.error;
  if (line.valid === false) {
    return line.availableStock > 0
      ? `Only ${line.availableStock} left — reduce the quantity to continue.`
      : 'Out of stock at this store.';
  }
  return null;
}
