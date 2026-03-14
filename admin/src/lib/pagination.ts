export function pageToOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export function offsetToPage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

export function totalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit));
}
