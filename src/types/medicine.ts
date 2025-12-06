export interface Medicine {
    id: number;
    name: string;
    dose?: string | null;
    form?: string | null;
    expiry: string | null;
    photoUri?: string | null;
    userId?: number | null;
  }

export interface ExpiredMedicine extends Medicine {
  expiry: string;
}