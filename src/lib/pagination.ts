export const getPagination = (page?: number, limit?: number) => {
  const safePage = Math.max(1, page ?? 1)
  const safeLimit = Math.min(100, Math.max(1, limit ?? 20))
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  }
}