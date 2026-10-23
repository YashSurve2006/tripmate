import {
  calculateEqualSplit,
  calculateGroupBalances,
  calculatePercentageSplit,
  formatCurrency,
  parseCurrencyToMinorUnits,
  simplifyDebts,
  validateCustomSplit,
  validateExactSplit,
  validateExpensePayments,
} from './finance';

import { ExpenseRecord, SettlementRecord } from './types';

describe('Financial Engine & Minor Unit Arithmetic', () => {
  describe('parseCurrencyToMinorUnits & formatCurrency', () => {
    it('accurately parses decimal currency string into integer minor units (paise)', () => {
      expect(parseCurrencyToMinorUnits('125.50')).toBe(12550);
      expect(parseCurrencyToMinorUnits('125')).toBe(12500);
      expect(parseCurrencyToMinorUnits('0.75')).toBe(75);
      expect(parseCurrencyToMinorUnits('1,250.50')).toBe(125050);
      expect(parseCurrencyToMinorUnits(125.5)).toBe(12550);
    });

    it('formats integer paise into INR representation correctly', () => {
      expect(formatCurrency(12550, 'INR')).toBe('₹125.50');
      expect(formatCurrency(75, 'INR')).toBe('₹0.75');
      expect(formatCurrency(10000000, 'INR')).toBe('₹1,00,000.00');
      expect(formatCurrency(-5000, 'INR')).toBe('-₹50.00');
    });
  });

  describe('calculateEqualSplit', () => {
    it('splits ₹100.00 (10000 paise) among 3 people with deterministic remainder distribution', () => {
      const participants = ['user-c', 'user-a', 'user-b'];
      const splits = calculateEqualSplit(10000, participants);

      expect(splits).toHaveLength(3);
      // Remainder of 10000 % 3 = 1 paisa. Sorted users: user-a gets 3334, user-b gets 3333, user-c gets 3333
      const sum = splits.reduce((acc, s) => acc + s.amount, 0);
      expect(sum).toBe(10000);
      expect(splits.find((s) => s.userId === 'user-a')?.amount).toBe(3334);
      expect(splits.find((s) => s.userId === 'user-b')?.amount).toBe(3333);
      expect(splits.find((s) => s.userId === 'user-c')?.amount).toBe(3333);
    });

    it('splits ₹10.00 (1000 paise) equally among 4 people', () => {
      const participants = ['u1', 'u2', 'u3', 'u4'];
      const splits = calculateEqualSplit(1000, participants);
      expect(splits.every((s) => s.amount === 250)).toBe(true);
      expect(splits.reduce((acc, s) => acc + s.amount, 0)).toBe(1000);
    });

    it('throws when participant list is empty', () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });
  });

  describe('calculatePercentageSplit', () => {
    it('splits ₹100.00 with 50%, 30%, 20%', () => {
      const allocations = [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 30 },
        { userId: 'u3', percentage: 20 },
      ];
      const splits = calculatePercentageSplit(10000, allocations);
      expect(splits.reduce((acc, s) => acc + s.amount, 0)).toBe(10000);
      expect(splits.find((s) => s.userId === 'u1')?.amount).toBe(5000);
      expect(splits.find((s) => s.userId === 'u2')?.amount).toBe(3000);
      expect(splits.find((s) => s.userId === 'u3')?.amount).toBe(2000);
    });

    it('reconciles any remainder when percentages have rounding discrepancy', () => {
      const allocations = [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ];
      const splits = calculatePercentageSplit(10000, allocations);
      const sum = splits.reduce((acc, s) => acc + s.amount, 0);
      expect(sum).toBe(10000);
    });
  });

  describe('calculateGroupBalances & Invariant Checking', () => {
    it('computes balances accurately and guarantees zero-sum balance invariant', () => {
      const members = ['alice', 'bob', 'charlie'];
      // Alice pays ₹300 (30000 paise) for dinner split equally between Alice, Bob, Charlie (10000 each)
      const expenses: ExpenseRecord[] = [
        {
          id: 'exp-1',
          groupId: 'grp-1',
          title: 'Dinner',
          amount: 30000,
          currency: 'INR',
          category: 'FOOD_AND_DRINK',
          date: '2026-10-23',
          createdById: 'alice',
          payments: [{ userId: 'alice', amount: 30000 }],
          splits: [
            { userId: 'alice', amount: 10000 },
            { userId: 'bob', amount: 10000 },
            { userId: 'charlie', amount: 10000 },
          ],
        },
      ];

      const settlements: SettlementRecord[] = [];
      const summary = calculateGroupBalances(members, expenses, settlements);

      expect(summary.isBalancedZeroSum).toBe(true);
      // Alice paid 30000, consumed 10000 -> is owed +20000
      expect(summary.memberBalances['alice'].balance).toBe(20000);
      // Bob paid 0, consumed 10000 -> owes -10000
      expect(summary.memberBalances['bob'].balance).toBe(-10000);
      // Charlie paid 0, consumed 10000 -> owes -10000
      expect(summary.memberBalances['charlie'].balance).toBe(-10000);

      // Verify zero sum: +20000 + (-10000) + (-10000) === 0
      const sum = Object.values(summary.memberBalances).reduce((a, b) => a + b.balance, 0);
      expect(sum).toBe(0);
    });

    it('ignores PENDING settlements and applies CONFIRMED settlements to restore zero balance', () => {
      const members = ['alice', 'bob'];
      const expenses: ExpenseRecord[] = [
        {
          id: 'exp-1',
          groupId: 'grp-1',
          title: 'Movie',
          amount: 20000,
          currency: 'INR',
          category: 'ENTERTAINMENT',
          date: '2026-10-23',
          createdById: 'alice',
          payments: [{ userId: 'alice', amount: 20000 }],
          splits: [
            { userId: 'alice', amount: 10000 },
            { userId: 'bob', amount: 10000 },
          ],
        },
      ];

      // Bob makes a PENDING settlement
      const pendingSettlement: SettlementRecord = {
        id: 'set-1',
        groupId: 'grp-1',
        payerId: 'bob',
        payeeId: 'alice',
        amount: 10000,
        currency: 'INR',
        status: 'PENDING',
      };

      const summaryBefore = calculateGroupBalances(members, expenses, [pendingSettlement]);
      // Pending settlement must not change balance!
      expect(summaryBefore.memberBalances['bob'].balance).toBe(-10000);
      expect(summaryBefore.memberBalances['alice'].balance).toBe(10000);

      // Now Bob's settlement is CONFIRMED
      const confirmedSettlement: SettlementRecord = {
        ...pendingSettlement,
        status: 'CONFIRMED',
      };

      const summaryAfter = calculateGroupBalances(members, expenses, [confirmedSettlement]);
      // Both should now be settled (0)
      expect(summaryAfter.memberBalances['bob'].balance).toBe(0);
      expect(summaryAfter.memberBalances['alice'].balance).toBe(0);
      expect(summaryAfter.isBalancedZeroSum).toBe(true);
    });
  });

  describe('simplifyDebts', () => {
    it('simplifies 3-party debt cycle into minimal transfers', () => {
      // Alice is owed 20000 (+20000), Bob owes 10000 (-10000), Charlie owes 10000 (-10000)
      const balances = {
        alice: { userId: 'alice', balance: 20000, totalPaid: 30000, totalShare: 10000, totalSettlementPaid: 0, totalSettlementReceived: 0 },
        bob: { userId: 'bob', balance: -10000, totalPaid: 0, totalShare: 10000, totalSettlementPaid: 0, totalSettlementReceived: 0 },
        charlie: { userId: 'charlie', balance: -10000, totalPaid: 0, totalShare: 10000, totalSettlementPaid: 0, totalSettlementReceived: 0 },
      };

      const transfers = simplifyDebts(balances, 'INR');
      expect(transfers).toHaveLength(2);
      expect(transfers.some(t => t.fromUserId === 'bob' && t.toUserId === 'alice' && t.amount === 10000)).toBe(true);
      expect(transfers.some(t => t.fromUserId === 'charlie' && t.toUserId === 'alice' && t.amount === 10000)).toBe(true);
    });
  });

  describe('validation utilities', () => {
    it('validates exact split reconciliation', () => {
      expect(validateExactSplit(10000, [{ userId: 'u1', amount: 6000 }, { userId: 'u2', amount: 4000 }]).isValid).toBe(true);
      expect(validateExactSplit(10000, [{ userId: 'u1', amount: 6000 }, { userId: 'u2', amount: 3999 }]).isValid).toBe(false);
    });

    it('validates expense payments reconciliation', () => {
      expect(validateExpensePayments(5000, [{ userId: 'u1', amount: 5000 }]).isValid).toBe(true);
      expect(validateExpensePayments(5000, [{ userId: 'u1', amount: 4000 }]).isValid).toBe(false);
    });
  });

  describe('validateCustomSplit (Custom Amount-Wise Splitting)', () => {
    it('accurately validates a balanced allocation (e.g., ₹1,000 total with ₹500, ₹300, ₹200)', () => {
      const totalPaise = 100000; // ₹1,000.00
      const shares = [
        { userId: 'yash', amountPaise: 50000 }, // ₹500.00
        { userId: 'member_a', amountPaise: 30000 }, // ₹300.00
        { userId: 'member_b', amountPaise: 20000 }, // ₹200.00
      ];

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('BALANCED');
      expect(res.allocatedPaise).toBe(100000);
      expect(res.remainingPaise).toBe(0);
      expect(res.error).toBeUndefined();
    });

    it('detects under-allocation and calculates remaining amount correctly', () => {
      const totalPaise = 100000; // ₹1,000.00
      const shares = [
        { userId: 'yash', amountPaise: 50000 },
        { userId: 'member_a', amountPaise: 30000 },
      ]; // Allocated: ₹800.00, Remaining: ₹200.00

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('UNDER_ALLOCATED');
      expect(res.allocatedPaise).toBe(80000);
      expect(res.remainingPaise).toBe(20000);
      expect(res.error).toContain('₹200.00 under-allocated');
    });

    it('detects over-allocation when sum of custom shares exceeds total', () => {
      const totalPaise = 100000; // ₹1,000.00
      const shares = [
        { userId: 'yash', amountPaise: 60000 },
        { userId: 'member_a', amountPaise: 50000 },
      ]; // Allocated: ₹1,100.00, Remaining: -₹100.00

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('OVER_ALLOCATED');
      expect(res.allocatedPaise).toBe(110000);
      expect(res.remainingPaise).toBe(-10000);
      expect(res.error).toContain('exceeds total by ₹100.00');
    });

    it('permits a member to pay nothing by assigning ₹0 share', () => {
      const totalPaise = 100000;
      const shares = [
        { userId: 'yash', amountPaise: 70000 },
        { userId: 'member_a', amountPaise: 30000 },
        { userId: 'member_b', amountPaise: 0 }, // ₹0 share
      ];

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('BALANCED');
      expect(res.allocatedPaise).toBe(100000);
      expect(res.remainingPaise).toBe(0);
    });

    it('handles decimal paise values accurately (e.g. ₹123.45)', () => {
      const totalPaise = 12345; // ₹123.45
      const shares = [
        { userId: 'yash', amountPaise: 5025 }, // ₹50.25
        { userId: 'member_a', amountPaise: 7320 }, // ₹73.20
      ];

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('BALANCED');
      expect(res.allocatedPaise).toBe(12345);
      expect(res.remainingPaise).toBe(0);
    });

    it('rejects negative share amounts safely', () => {
      const totalPaise = 5000;
      const shares = [
        { userId: 'yash', amountPaise: 6000 },
        { userId: 'member_a', amountPaise: -1000 },
      ];

      const res = validateCustomSplit(totalPaise, shares);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('cannot be negative');
    });

    it('verifies that group balances respect custom shares with zero-sum invariant', () => {
      const members = ['yash', 'member_a', 'member_b'];
      // Yash pays ₹1,000 (100000 paise). Custom split: Yash owes 500, Member A owes 300, Member B owes 200.
      const expenses: ExpenseRecord[] = [
        {
          id: 'exp-custom',
          groupId: 'grp-test',
          title: 'Custom Dinner',
          amount: 100000,
          currency: 'INR',
          category: 'FOOD_AND_DRINK',
          date: '2026-10-23',
          createdById: 'yash',
          payments: [{ userId: 'yash', amount: 100000 }],
          splits: [
            { userId: 'yash', amount: 50000, splitType: 'EXACT' },
            { userId: 'member_a', amount: 30000, splitType: 'EXACT' },
            { userId: 'member_b', amount: 20000, splitType: 'EXACT' },
          ],
        },
      ];

      const summary = calculateGroupBalances(members, expenses, []);
      // Yash paid 1000, share is 500 -> net balance +500 (is owed ₹500)
      expect(summary.memberBalances['yash'].balance).toBe(50000);
      // Member A paid 0, share is 300 -> net balance -300 (owes ₹300)
      expect(summary.memberBalances['member_a'].balance).toBe(-30000);
      // Member B paid 0, share is 200 -> net balance -200 (owes ₹200)
      expect(summary.memberBalances['member_b'].balance).toBe(-20000);
      // Sum must equal 0 exactly
      expect(summary.isBalancedZeroSum).toBe(true);

      const transfers = summary.suggestedSettlements;
      expect(transfers).toHaveLength(2);
      expect(transfers.some(t => t.fromUserId === 'member_a' && t.toUserId === 'yash' && t.amount === 30000)).toBe(true);
      expect(transfers.some(t => t.fromUserId === 'member_b' && t.toUserId === 'yash' && t.amount === 20000)).toBe(true);
    });
  });
});

