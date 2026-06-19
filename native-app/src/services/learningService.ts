import { DueReview } from '../types/app';
import { apiRequest } from './apiClient';

export async function getDueReviews() {
  const payload = await apiRequest<{ reviews: DueReview[] }>('/learning/reviews/due');
  return payload.reviews;
}

export async function completeReview(reviewId: string, passed: boolean) {
  await apiRequest<{ completed: true }>(`/learning/reviews/${reviewId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ passed }),
  });
}
