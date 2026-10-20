import { apiClient } from './client';

/**
 * Product reviews.
 *
 * Reading is public; writing requires a signed-in customer whose order for
 * the product has been delivered. The server decides that — nothing here
 * should ever assume eligibility, because the only authority on whether a
 * purchase exists is the purchase.
 */

export type IneligibleReason = 'NOT_PURCHASED' | 'NOT_DELIVERED' | 'ALREADY_REVIEWED';

export interface ReviewAuthor {
  name: string;
  avatar: string | null;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  verifiedPurchase: boolean;
  author: ReviewAuthor;
  merchantReply: string | null;
  merchantRepliedAt: string | null;
  isMine: boolean;
}

/** A review as the merchant dashboard sees it, with the product attached. */
export interface MerchantReview extends ProductReview {
  product: { id: string; title: string; slug: string };
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<string, number>;
}

export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductReviewsResult {
  reviews: ProductReview[];
  summary: RatingSummary;
  pagination: ReviewPagination;
}

export interface ReviewEligibility {
  canReview: boolean;
  reason: IneligibleReason | null;
  review: (ProductReview & { body: string; title: string | null }) | null;
}

export interface ReviewInput {
  rating: number;
  title?: string;
  body: string;
}

export interface ListReviewsParams {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'helpful' | 'highest' | 'lowest';
  rating?: number;
}

function queryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  }
  const s = query.toString();
  return s ? `?${s}` : '';
}

/* ---- Public ------------------------------------------------------------ */

export async function fetchProductReviewsApi(
  productId: string,
  params: ListReviewsParams = {}
): Promise<ProductReviewsResult> {
  const res = await apiClient<{
    success: boolean;
    data: ProductReview[];
    summary: RatingSummary;
    pagination: ReviewPagination;
  }>(`/reviews/product/${productId}${queryString(params as Record<string, unknown>)}`);

  return { reviews: res.data, summary: res.summary, pagination: res.pagination };
}

/* ---- Shopper ----------------------------------------------------------- */

export async function fetchReviewEligibilityApi(productId: string): Promise<ReviewEligibility> {
  const res = await apiClient<{ success: boolean; data: ReviewEligibility }>(
    `/reviews/product/${productId}/me`
  );
  return res.data;
}

export async function createProductReviewApi(
  productId: string,
  input: ReviewInput
): Promise<ProductReview> {
  const res = await apiClient<{ success: boolean; data: ProductReview }>(
    `/reviews/product/${productId}`,
    { method: 'POST', body: JSON.stringify(input) }
  );
  return res.data;
}

export async function updateProductReviewApi(
  id: string,
  input: Partial<ReviewInput>
): Promise<ProductReview> {
  const res = await apiClient<{ success: boolean; data: ProductReview }>(`/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteProductReviewApi(id: string): Promise<void> {
  await apiClient(`/reviews/${id}`, { method: 'DELETE' });
}

/* ---- Merchant ---------------------------------------------------------- */

export interface MerchantReviewsParams {
  page?: number;
  limit?: number;
  rating?: number;
  unanswered?: boolean;
}

export interface MerchantReviewsResult {
  reviews: MerchantReview[];
  summary: RatingSummary & { awaitingReply: number };
  pagination: ReviewPagination;
}

export async function fetchMerchantReviewsApi(
  params: MerchantReviewsParams = {}
): Promise<MerchantReviewsResult> {
  const res = await apiClient<{
    success: boolean;
    data: MerchantReview[];
    summary: RatingSummary & { awaitingReply: number };
    pagination: ReviewPagination;
  }>(`/reviews/seller${queryString(params as Record<string, unknown>)}`);

  return { reviews: res.data, summary: res.summary, pagination: res.pagination };
}

export async function replyToReviewApi(id: string, reply: string): Promise<MerchantReview> {
  const res = await apiClient<{ success: boolean; data: MerchantReview }>(`/reviews/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  });
  return res.data;
}

export async function deleteReviewReplyApi(id: string): Promise<MerchantReview> {
  const res = await apiClient<{ success: boolean; data: MerchantReview }>(`/reviews/${id}/reply`, {
    method: 'DELETE',
  });
  return res.data;
}
