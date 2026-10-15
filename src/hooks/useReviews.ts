import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProductReviewsApi,
  fetchReviewEligibilityApi,
  createProductReviewApi,
  updateProductReviewApi,
  deleteProductReviewApi,
  fetchStoreReviewsApi,
  replyToReviewApi,
  deleteReviewReplyApi,
  type ListReviewsParams,
  type ReviewInput,
  type StoreReviewsParams,
} from '../api/reviews';

export const reviewQueryKeys = {
  product: (productId: string, params: ListReviewsParams) =>
    ['reviews', 'product', productId, params] as const,
  eligibility: (productId: string) => ['reviews', 'eligibility', productId] as const,
  store: (params: StoreReviewsParams) => ['reviews', 'store', params] as const,
};

export function useProductReviewsQuery(productId?: string, params: ListReviewsParams = {}) {
  return useQuery({
    queryKey: reviewQueryKeys.product(productId || '', params),
    queryFn: () => fetchProductReviewsApi(productId!, params),
    enabled: Boolean(productId),
    // Paging or re-sorting should not blank the list out mid-read.
    placeholderData: previous => previous,
  });
}

/**
 * Whether the signed-in shopper may review this product.
 *
 * `enabled` is the caller's job: asking this as a guest is a guaranteed 401,
 * so the product page only runs it once it knows someone is signed in.
 */
export function useReviewEligibilityQuery(productId?: string, enabled = true) {
  return useQuery({
    queryKey: reviewQueryKeys.eligibility(productId || ''),
    queryFn: () => fetchReviewEligibilityApi(productId!),
    enabled: Boolean(productId) && enabled,
    retry: false,
  });
}

/**
 * Invalidate everything a review write can change.
 *
 * A new review moves the product's stored average, so the catalogue and the
 * product payload are stale too, not just the review list.
 */
function useInvalidateAfterReviewWrite(productId?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    queryClient.invalidateQueries({ queryKey: ['marketplace'] });
    queryClient.invalidateQueries({ queryKey: ['storefront'] });
    if (productId) queryClient.invalidateQueries({ queryKey: ['reviews', 'eligibility', productId] });
  };
}

export function useCreateReviewMutation(productId?: string) {
  const invalidate = useInvalidateAfterReviewWrite(productId);
  return useMutation({
    mutationFn: (input: ReviewInput) => createProductReviewApi(productId!, input),
    onSuccess: invalidate,
  });
}

export function useUpdateReviewMutation(productId?: string) {
  const invalidate = useInvalidateAfterReviewWrite(productId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ReviewInput> }) =>
      updateProductReviewApi(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteReviewMutation(productId?: string) {
  const invalidate = useInvalidateAfterReviewWrite(productId);
  return useMutation({
    mutationFn: (id: string) => deleteProductReviewApi(id),
    onSuccess: invalidate,
  });
}

/* ---- Merchant ---------------------------------------------------------- */

export function useStoreReviewsQuery(params: StoreReviewsParams = {}) {
  return useQuery({
    queryKey: reviewQueryKeys.store(params),
    queryFn: () => fetchStoreReviewsApi(params),
    placeholderData: previous => previous,
  });
}

export function useReplyToReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToReviewApi(id, reply),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}

export function useDeleteReviewReplyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReviewReplyApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
