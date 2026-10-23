import {
  calculateEqualSplitPaise,
  computeGroupBalances,
  validatePaymentsReconciliation,
  validateSplitsReconciliation,
} from './finance';

describe('Backend Financial Calculation Engine (Paise/Minor Units)', () => {
  describe('calculateEqualSplitPaise', () => {
    it('splits ₹500.00 (50000 paise) equally across 3 members with exact remainder allocation', () => {
      const participants = ['user-3', 'user-1', 'user-2'];
      const splits = calculateEqualSplitPaise(50000n, participants);

      expect(splits).toHaveLength(3);
      // 50000 / 3 = 16666 with remainder 2
      // Sorted: user-1 gets 16667, user-2 gets 16667, user-3 gets 16666
      expect(splits.find((s) => s.userId === 'user-1')?.amountPaise).toBe(16667n);
      expect(splits.find((s) => s.userId === 'user-2')?.amountPaise).toBe(16667n);
      expect(splits.find((s) => s.userId === 'user-3')?.amountPaise).toBe(16666n);

      const total = splits.reduce((acc, s) => acc + s.amountPaise, 0n);
      expect(total).toBe(50000n);
    });
  });

  describe('validatePaymentsReconciliation & validateSplitsReconciliation', () => {
    it('verifies that payments equal total', () => {
      expect(
        validatePaymentsReconciliation(10000n, [
          { userId: 'u1', amountPaise: 6000n },
          { userId: 'u2', amountPaise: 4000n },
        ])
      ).toBe(true);

      expect(
        validatePaymentsReconciliation(10000n, [
          { userId: 'u1', amountPaise: 6000n },
          { userId: 'u2', amountPaise: 3999n },
        ])
      ).toBe(false);
    });

    it('verifies that splits equal total', () => {
      expect(
        validateSplitsReconciliation(25000n, [
          { userId: 'u1', amountPaise: 12500n },
          { userId: 'u2', amountPaise: 12500n },
        ])
      ).toBe(true);

      expect(
        validateSplitsReconciliation(25000n, [
          { userId: 'u1', amountPaise: 12500n },
          { userId: 'u2', amountPaise: 12400n },
        ])
      ).toBe(false);
    });
  });

  describe('computeGroupBalances & Zero-Sum Debt Simplification', () => {
    it('computes zero-sum balances and produces minimal debt transfers', () => {
      const members = ['alice', 'bob', 'charlie'];
      // Alice pays ₹120.00 (12000 paise), split equally between Alice, Bob, Charlie (4000 each)
      const payments = [{ userId: 'alice', amountPaise: 12000n }];
      const splits = [
        { userId: 'alice', amountPaise: 4000n },
        { userId: 'bob', amountPaise: 4000n },
        { userId: 'charlie', amountPaise: 4000n },
      ];
      const settlements: any[] = [];

      const result = computeGroupBalances(members, payments, splits, settlements);

      expect(result.isZeroSum).toBe(true);
      expect(result.balances['alice'].balancePaise).toBe(8000n); // Owed 8000
      expect(result.balances['bob'].balancePaise).toBe(-4000n);  // Owes 4000
      expect(result.balances['charlie'].balancePaise).toBe(-4000n); // Owes 4000

      // Simplified transfers: Bob pays Alice 4000, Charlie pays Alice 4000
      expect(result.transfers).toHaveLength(2);
      expect(result.transfers.every((t) => t.toUserId === 'alice' && t.amountPaise === 4000n)).toBe(true);
    });
  });
});
