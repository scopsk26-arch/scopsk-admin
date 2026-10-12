import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPage } from "@/lib/api/resources";

type QueryValue = string | number | boolean | undefined | null;

/**
 * Loads one API page for an admin table. Search is sent as `search` after a short pause.
 */
export function usePagedList<T>(options: {
  queryKey: unknown[];
  path: string;
  query?: Record<string, QueryValue>;
  map?: (row: any) => T;
  prepare?: (rows: any[]) => T[];
  headers?: Record<string, string>;
  pageSize?: number;
  enabled?: boolean;
  load?: (args: {
    page: number;
    pageSize: number;
    search: string;
    sort: string;
    status: string;
  }) => Promise<{ rows: T[]; total: number }>;
}) {
  const pageSize = options.pageSize ?? 20;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [status, setStatus] = useState("all");
  const queryKeyExtra = JSON.stringify(options.query ?? {});

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, queryKeyExtra, sort, status]);

  const result = useQuery({
    queryKey: [...options.queryKey, page, pageSize, debouncedSearch, queryKeyExtra, sort, status],
    staleTime: 30_000,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      if (options.load) {
        return options.load({ page, pageSize, search: debouncedSearch, sort, status });
      }
      const fetched = await fetchPage(options.path, {
        ...options.query,
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        sortBy: options.query?.sortBy ?? "createdAt",
        sortOrder: sort === "oldest" ? "ASC" : "DESC",
        ...(status !== "all" ? { status } : {}),
      }, options.headers);
      const rows = options.prepare
        ? options.prepare(fetched.rows)
        : fetched.rows.map(options.map ?? ((row) => row as T));
      return { rows, total: fetched.total };
    },
  });

  return {
    rows: result.data?.rows ?? ([] as T[]),
    total: result.data?.total ?? 0,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    sort,
    setSort,
    status,
    setStatus,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: result.refetch,
  };
}

export function pagedListProps(list: {
  page: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}) {
  return {
    page: list.page,
    total: list.total,
    pageSize: list.pageSize,
    onPageChange: list.setPage,
    search: list.search,
    onSearchChange: list.setSearch,
    sort: list.sort,
    onSortChange: list.setSort,
    status: list.status,
    onStatusChange: list.setStatus,
  };
}
