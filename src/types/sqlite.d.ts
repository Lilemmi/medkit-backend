import "expo-sqlite";

declare module "expo-sqlite" {
  interface SQLiteDatabase {
    getAllAsync<T = any>(sql: string, args?: (string | number | null)[]): Promise<T[]>;
    getFirstAsync<T = any>(sql: string, args?: (string | number | null)[]): Promise<T | null>;
    runAsync(sql: string, args?: (string | number | null)[]): Promise<{ lastInsertRowId?: number; changes?: number }>;
    execAsync(sql: string): Promise<void>;
  }
}
