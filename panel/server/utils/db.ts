import type { H3Event } from 'h3';

export interface D1Result<T> {
  results: T[];
  meta: { last_row_id: number; changes: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<never>>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

export const useDb = (event: H3Event): D1Database => event.context.cloudflare.env.DB;
