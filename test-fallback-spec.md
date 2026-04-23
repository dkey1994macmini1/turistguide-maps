# Test: Fallback Model Verification

## Goal
Create a single TypeScript utility function `src/utils/formatCurrency.ts` that formats a number as a currency string.

## Requirements
- Export function `formatCurrency(amount: number, currency: string = "USD"): string`
- Use Intl.NumberFormat for locale-aware formatting
- Handle edge cases: negative amounts, zero, very large numbers
- Include basic vitest tests in `src/utils/formatCurrency.test.ts`