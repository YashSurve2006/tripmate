import {
  calculateEqualSplit,
  calculateGroupBalances,
  formatCurrency,
  parseCurrencyToMinorUnits,
} from './finance';
import { ExpenseRecord, SettlementRecord } from './types';

// In-memory simulation of a persistent key-value/SQLite backing store
class SimulatedPersistentStorage {
  private storage: Map<string, string> = new Map();

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('Offline Persistence & Lifecycle Across App Restarts', () => {
  let disk: SimulatedPersistentStorage;

  beforeEach(() => {
    disk = new SimulatedPersistentStorage();
  });

  it('persists trips, expenses, and splits across simulated app restarts', () => {
    // === SESSION 1: User launches app for the first time ===
    const session1Groups = [
      {
        id: 'grp-himalaya',
        name: 'Himachal Trek 🏔️',
        type: 'TRIP',
        currency: 'INR',
        budgetPaise: 5000000, // ₹50,000.00
      },
    ];

    const session1Expenses: ExpenseRecord[] = [
      {
        id: 'exp-camp',
        groupId: 'grp-himalaya',
        title: 'Trek Camping Gear & Tents',
        amount: 1500000, // ₹15,000.00
        currency: 'INR',
        category: 'ACCOMMODATION',
        date: '2026-10-23T10:00:00.000Z',
        createdById: 'alice',
        payments: [{ userId: 'alice', amount: 1500000 }],
        splits: [
          { userId: 'alice', amount: 500000 },
          { userId: 'bob', amount: 500000 },
          { userId: 'charlie', amount: 500000 },
        ],
      },
    ];

    // Save to persistent storage
    disk.setItem('@tripmate:groups', JSON.stringify(session1Groups));
    disk.setItem('@tripmate:expenses', JSON.stringify(session1Expenses));

    // === SIMULATE APP CLOSE / REBOOT ===
    // (All memory references are cleared, exactly like user swiping away the app)

    // === SESSION 2: User opens the app the next day (completely offline) ===
    const loadedGroupsRaw = disk.getItem('@tripmate:groups');
    const loadedExpensesRaw = disk.getItem('@tripmate:expenses');

    expect(loadedGroupsRaw).not.toBeNull();
    expect(loadedExpensesRaw).not.toBeNull();

    const loadedGroups = JSON.parse(loadedGroupsRaw!);
    const loadedExpenses: ExpenseRecord[] = JSON.parse(loadedExpensesRaw!);

    expect(loadedGroups).toHaveLength(1);
    expect(loadedGroups[0].name).toBe('Himachal Trek 🏔️');
    expect(loadedExpenses).toHaveLength(1);
    expect(loadedExpenses[0].title).toBe('Trek Camping Gear & Tents');

    // Verify financial balances remain mathematically intact across restarts
    const members = ['alice', 'bob', 'charlie'];
    const summary = calculateGroupBalances(members, loadedExpenses, []);

    expect(summary.isBalancedZeroSum).toBe(true);
    expect(summary.memberBalances['alice'].balance).toBe(1000000); // Alice is owed ₹10,000
    expect(summary.memberBalances['bob'].balance).toBe(-500000);   // Bob owes ₹5,000
    expect(summary.memberBalances['charlie'].balance).toBe(-500000); // Charlie owes ₹5,000

    // Add another expense in Session 2
    const session2Expense: ExpenseRecord = {
      id: 'exp-food',
      groupId: 'grp-himalaya',
      title: 'Dhaba Lunch',
      amount: 300000, // ₹3,000.00
      currency: 'INR',
      category: 'FOOD_AND_DRINK',
      date: '2026-10-24T13:00:00.000Z',
      createdById: 'bob',
      payments: [{ userId: 'bob', amount: 300000 }],
      splits: calculateEqualSplit(300000, members).map((s) => ({
        userId: s.userId,
        amount: s.amount,
      })),
    };

    const updatedExpenses = [...loadedExpenses, session2Expense];
    disk.setItem('@tripmate:expenses', JSON.stringify(updatedExpenses));

    // === SIMULATE APP CLOSE / REBOOT 2 ===
    const reloadedExpenses: ExpenseRecord[] = JSON.parse(disk.getItem('@tripmate:expenses')!);
    expect(reloadedExpenses).toHaveLength(2);

    const reloadedSummary = calculateGroupBalances(members, reloadedExpenses, []);
    expect(reloadedSummary.isBalancedZeroSum).toBe(true);
    // Bob paid 300000, share was 100000 -> net adjustment +200000
    // Previously Bob owed -500000 -> now Bob owes -300000 (-₹3,000)
    expect(reloadedSummary.memberBalances['bob'].balance).toBe(-300000);
  });

  it('records offline settlements and correctly balances accounts upon restart', () => {
    const members = ['alice', 'bob'];
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        groupId: 'grp-1',
        title: 'Taxi',
        amount: 200000, // ₹2,000.00
        currency: 'INR',
        category: 'TRANSPORT',
        date: '2026-10-23T12:00:00.000Z',
        createdById: 'alice',
        payments: [{ userId: 'alice', amount: 200000 }],
        splits: [
          { userId: 'alice', amount: 100000 },
          { userId: 'bob', amount: 100000 },
        ],
      },
    ];

    // Bob records an offline settlement payment to Alice of ₹1,000
    const settlement: SettlementRecord = {
      id: 'stl-1',
      groupId: 'grp-1',
      payerId: 'bob',
      payeeId: 'alice',
      amount: 100000,
      currency: 'INR',
      status: 'CONFIRMED',
      confirmedAt: '2026-10-23T15:00:00.000Z',
    };

    disk.setItem('@tripmate:settlements', JSON.stringify([settlement]));

    // Restart app
    const reloadedSettlements: SettlementRecord[] = JSON.parse(disk.getItem('@tripmate:settlements')!);
    const summary = calculateGroupBalances(members, expenses, reloadedSettlements);

    expect(summary.isBalancedZeroSum).toBe(true);
    expect(summary.memberBalances['alice'].balance).toBe(0);
    expect(summary.memberBalances['bob'].balance).toBe(0);
  });
});
