export type GetPromiseResult<P> = P extends Promise<infer R> ? R : unknown;
