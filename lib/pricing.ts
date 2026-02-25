export function deliveryFeeCents(receiptItemTotalCents: number): number {
  if (receiptItemTotalCents <= 0) return 0;
  if (receiptItemTotalCents <= 1000) return 300;   // $0–$10 => $3
  if (receiptItemTotalCents <= 2000) return 400;   // $10.01–$20 => $4
  if (receiptItemTotalCents <= 3500) return 500;   // $20.01–$35 => $5
  return 600;                                      // $35.01+ => $6
}

export const CAP_TIERS_CENTS = [1500, 2500, 3500]; // $15 / $25 / $35
export const MAX_CAP_CENTS = 5000;                 // $50
export const INCREMENTS_CENTS = [500, 1000, 2000]; // +$5 / +$10 / +$20