# Financial Month Tests Documentation

## Overview

This document provides test examples for the Financial Month utilities. These tests can be implemented once Jest or another testing framework is configured.

## Setup Required

To run these tests, you'll need to install Jest and its TypeScript support:

```bash
npm install --save-dev jest @types/jest ts-jest
npx ts-jest config:init
```

## Test File Location

Create the test file at: `src/lib/__tests__/financialMonth.test.ts`

## Example Test Suite

```typescript
/**
 * Tests for Financial Month Utilities
 */

import {
  getFinancialMonthRange,
  getCurrentFinancialMonth,
  getRecentFinancialMonths,
  formatFinancialMonth,
  isDateInFinancialMonth,
} from '../financialMonth';

describe('Financial Month Utilities', () => {
  describe('getFinancialMonthRange', () => {
    it('should return standard month range when startDay is 1', () => {
      const result = getFinancialMonthRange('2024-12', 1);
      expect(result.startDate).toBe('2024-12-01');
      expect(result.endDate).toBe('2024-12-31');
    });

    it('should return custom month range when startDay is 26', () => {
      const result = getFinancialMonthRange('2024-12', 26);
      // Dec financial month: Nov 26 - Dec 25
      expect(result.startDate).toBe('2024-11-26');
      expect(result.endDate).toBe('2024-12-25');
    });
  });

  describe('isDateInFinancialMonth', () => {
    it('should return true for date within custom financial month', () => {
      // Nov 27 is in the December financial month (Nov 26 - Dec 25)
      const result = isDateInFinancialMonth('2024-11-27', '2024-12', 26);
      expect(result).toBe(true);
    });

    it('should handle boundary dates correctly', () => {
      // Test start boundary
      expect(isDateInFinancialMonth('2024-11-26', '2024-12', 26)).toBe(true);
      // Test end boundary
      expect(isDateInFinancialMonth('2024-12-25', '2024-12', 26)).toBe(true);
      // Just outside boundaries
      expect(isDateInFinancialMonth('2024-11-25', '2024-12', 26)).toBe(false);
      expect(isDateInFinancialMonth('2024-12-26', '2024-12', 26)).toBe(false);
    });
  });
});
```

## Critical Test Cases

### 1. Standard Calendar Month (startDay = 1)
- Should behave exactly like regular calendar months
- January: 2024-01-01 to 2024-01-31
- February: 2024-02-01 to 2024-02-29 (leap year)

### 2. Mid-Month Start (startDay = 15)
- December financial month: Nov 15 - Dec 14
- January financial month: Dec 15 - Jan 14
- Verify year transitions work correctly

### 3. End-of-Month Start (startDay = 26)
- December financial month: Nov 26 - Dec 25
- Ensures transactions on payday are included in correct month

### 4. Boundary Cases
- Months with 28, 29, 30, and 31 days
- Leap years
- Year transitions (December to January)

### 5. Date Filtering
- Transaction on first day of financial month (inclusive)
- Transaction on last day of financial month (inclusive)
- Transaction one day before start (excluded)
- Transaction one day after end (excluded)

## Manual Testing Checklist

Until automated tests are set up, manually verify:

1. **Configure Custom Financial Month**
   - Go to /configuracion
   - Set start day to 26
   - Save changes

2. **Verify Dashboard**
   - Select December 2024
   - Check that indicator shows "nov 26 - dic 25, 2024"
   - Verify transactions from Nov 26 - Dec 25 appear

3. **Verify Transactions List**
   - Should show same filtered range
   - Add a transaction on Nov 27 (should appear in Dec)
   - Add a transaction on Nov 25 (should appear in Nov)

4. **Verify Statistics**
   - Charts should group by financial month
   - Monthly trends should show correct ranges

5. **Verify Boundary Dates**
   - Transaction on exactly Nov 26 → December
   - Transaction on exactly Dec 25 → December
   - Transaction on Dec 26 → January

## Integration Tests

When setting up E2E tests (Cypress, Playwright):

```typescript
describe('Financial Month Integration', () => {
  it('should filter transactions by custom financial month', () => {
    // 1. Configure financial month start day = 26
    // 2. Create transactions on Nov 25, Nov 26, Dec 25, Dec 26
    // 3. Navigate to December view
    // 4. Verify only Nov 26 - Dec 25 transactions show
  });
});
```

## Future Enhancements

Consider adding tests for:
- Performance with large transaction datasets
- Concurrent month calculations
- Edge cases with timezone differences
- Database query optimization for date ranges
