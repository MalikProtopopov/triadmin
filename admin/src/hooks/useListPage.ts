"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { totalPages as computeTotalPages } from "@/lib/pagination";
import { useDebounce } from "@/hooks/useDebounce";

interface UseListPageOptions {
  queryKey: string;
  endpoint: string;
  defaultPerPage?: number;
}

export function useListPage<T = unknown>({
  queryKey,
  endpoint,
  defaultPerPage = 20,
}: UseListPageOptions) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("limit", String(perPage));
    p.set("offset", String((page - 1) * perPage));
    if (debouncedSearch) p.set("search", debouncedSearch);
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") p.set(key, value);
    });
    return p.toString();
  }, [page, perPage, debouncedSearch, filters]);

  const params = buildParams();

  const { data, isLoading, error, refetch } = useQuery<{
    data: T[];
    total: number;
  }>({
    queryKey: [queryKey, params],
    queryFn: () => api.get(`${endpoint}?${params}`).then((r) => r.data),
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = computeTotalPages(total, perPage);

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updatePerPage(value: number) {
    setPerPage(value);
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setSearch("");
    setPage(1);
  }

  const hasFilters = debouncedSearch.length > 0 || Object.values(filters).some((v) => v && v !== "all");

  return {
    items,
    total,
    page,
    perPage,
    pages,
    search,
    debouncedSearch,
    filters,
    isLoading,
    error,
    refetch,
    setPage,
    setFilter,
    updateSearch,
    updatePerPage,
    clearFilters,
    hasFilters,
  };
}
