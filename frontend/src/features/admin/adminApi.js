import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

/**
 * Generic admin data hooks. `resource` is an API path such as
 * '/cms/services' or '/cms/ticker/items'. Lists return { data, meta }.
 */
export function useAdminList(resource, params = {}, options = {}) {
  return useQuery({
    queryKey: ['admin', resource, 'list', params],
    queryFn: () => api.get(resource, { query: params }),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useAdminItem(resource, id, options = {}) {
  return useQuery({
    queryKey: ['admin', resource, 'item', id],
    queryFn: async () => (await api.get(id ? `${resource}/${id}` : resource)).data,
    enabled: options.enabled ?? true,
    ...options,
  });
}

/** Mutation that invalidates every cached query for the resource (and the public site cache). */
export function useAdminMutation(resource, mutationFn, options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (...args) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin', resource] }),
        qc.invalidateQueries({ queryKey: ['public'] }),
        qc.invalidateQueries({ queryKey: ['admin', 'overview'] }),
        ...(options.invalidate || []).map((key) => qc.invalidateQueries({ queryKey: key })),
      ]);
      options.onSuccess?.(...args);
    },
  });
}

/** Common CRUD mutations for a collection resource. */
export function useCrud(resource) {
  const create = useAdminMutation(resource, (body) => api.post(resource, body).then((r) => r.data));
  const update = useAdminMutation(resource, ({ id, ...body }) => api.patch(`${resource}/${id}`, body).then((r) => r.data));
  const remove = useAdminMutation(resource, (id) => api.del(`${resource}/${id}`));
  const reorder = useAdminMutation(resource, (ids) => api.post(`${resource}/reorder`, { ids }));
  const transition = useAdminMutation(resource, ({ id, ...body }) => api.post(`${resource}/${id}/transition`, body).then((r) => r.data));
  const publish = useAdminMutation(resource, (id) => api.post(`${resource}/${id}/publish`).then((r) => r.data));
  const unpublish = useAdminMutation(resource, (id) => api.post(`${resource}/${id}/unpublish`).then((r) => r.data));
  return { create, update, remove, reorder, transition, publish, unpublish };
}

/** Options helpers for selects (productions, services, staff). */
export function useOptions(resource, labelKey = 'title', params = { limit: 200 }) {
  const { data } = useAdminList(resource, params, { staleTime: 60 * 1000 });
  return (data?.data || []).map((d) => ({
    value: d._id || d.id,
    label: typeof labelKey === 'function' ? labelKey(d) : d[labelKey],
    description: d.status ? d.status.replace('_', ' ') : undefined,
  }));
}
