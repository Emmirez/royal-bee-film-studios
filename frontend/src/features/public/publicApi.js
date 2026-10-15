import { useQuery } from '@tanstack/react-query';
import { api, getData } from '../../lib/api';

/** React Query hooks for the public website (read-only, published content only). */

export const usePublicSettings = () =>
  useQuery({ queryKey: ['public', 'settings'], queryFn: () => getData('/public/settings'), staleTime: 5 * 60 * 1000 });

export const useHome = () => useQuery({ queryKey: ['public', 'home'], queryFn: () => getData('/public/home') });

export const useFounder = () => useQuery({ queryKey: ['public', 'founder'], queryFn: () => getData('/public/founder') });

export const useServices = () => useQuery({ queryKey: ['public', 'services'], queryFn: () => getData('/public/services') });

export const useService = (slug) =>
  useQuery({ queryKey: ['public', 'service', slug], queryFn: () => getData(`/public/services/${slug}`), enabled: Boolean(slug) });

export const useEnquiryForm = (slug) =>
  useQuery({
    queryKey: ['public', 'enquiry-form', slug],
    queryFn: () => getData(`/public/services/${slug}/enquiry-form`),
    enabled: Boolean(slug),
  });

export const useProductions = (params) =>
  useQuery({
    queryKey: ['public', 'productions', params],
    queryFn: () => api.get('/public/productions', { query: params }),
    placeholderData: (prev) => prev,
  });

export const useProduction = (slug) =>
  useQuery({ queryKey: ['public', 'production', slug], queryFn: () => getData(`/public/productions/${slug}`), enabled: Boolean(slug) });

export const useNewsList = (params) =>
  useQuery({
    queryKey: ['public', 'news', params],
    queryFn: () => api.get('/public/news', { query: params }),
    placeholderData: (prev) => prev,
  });

export const useNewsPost = (slug) =>
  useQuery({ queryKey: ['public', 'news-post', slug], queryFn: () => getData(`/public/news/${slug}`), enabled: Boolean(slug) });

export const useGallery = (category) =>
  useQuery({
    queryKey: ['public', 'gallery', category],
    queryFn: () => api.get('/public/gallery', { query: { category, limit: 100 } }),
    placeholderData: (prev) => prev,
  });

export const useCtas = (placement) =>
  useQuery({ queryKey: ['public', 'ctas', placement], queryFn: () => getData('/public/ctas', { query: { placement } }), staleTime: 5 * 60 * 1000 });

/** Aggregate CTA click tracking — fire and forget, no personal data. */
export const trackCtaClick = (id) => {
  if (!id) return;
  api.post(`/public/ctas/${id}/click`).catch(() => {});
};
