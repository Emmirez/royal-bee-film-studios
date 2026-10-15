import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (error?.status && error.status < 500) return false; // don't retry 4xx
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});
