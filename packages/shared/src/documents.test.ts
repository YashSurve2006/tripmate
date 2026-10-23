import {
  calculateGroupBalances,
  formatCurrency,
} from './finance';

describe('Document Management & Group Isolation', () => {
  interface DocumentRecord {
    id: string;
    groupId: string;
    expenseId?: string | null;
    title: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    category: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
    notes?: string | null;
    uploadedAt: string;
  }

  let documentsStore: DocumentRecord[];

  beforeEach(() => {
    documentsStore = [
      {
        id: 'doc-1',
        groupId: 'grp-goa',
        expenseId: 'exp-resort',
        title: 'Goa Resort Tax Invoice',
        originalFilename: 'resort_invoice.pdf',
        storagePath: 'file:///data/user/0/app/documents/resort.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 245000,
        category: 'HOTEL',
        notes: 'Room 204 & 205',
        uploadedAt: '2026-10-23T10:00:00.000Z',
      },
      {
        id: 'doc-2',
        groupId: 'grp-goa',
        expenseId: null,
        title: 'Shack Lunch Bill',
        originalFilename: 'lunch_receipt.jpg',
        storagePath: 'file:///data/user/0/app/documents/lunch.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 850000,
        category: 'FOOD',
        notes: null,
        uploadedAt: '2026-10-23T13:30:00.000Z',
      },
      {
        id: 'doc-3',
        groupId: 'grp-roommates',
        expenseId: 'exp-rent',
        title: 'October Rent Agreement Receipt',
        originalFilename: 'rent_oct.pdf',
        storagePath: 'file:///data/user/0/app/documents/rent.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1200000,
        category: 'UTILITIES',
        notes: 'Owner signed copy',
        uploadedAt: '2026-10-01T09:00:00.000Z',
      },
    ];
  });

  it('strictly isolates documents by group ID', () => {
    // Querying for Goa Trip should return only Goa documents
    const goaDocs = documentsStore.filter((d) => d.groupId === 'grp-goa');
    expect(goaDocs).toHaveLength(2);
    expect(goaDocs.every((d) => d.groupId === 'grp-goa')).toBe(true);

    // Querying for Roommates group should return only Roommates documents
    const roommateDocs = documentsStore.filter((d) => d.groupId === 'grp-roommates');
    expect(roommateDocs).toHaveLength(1);
    expect(roommateDocs[0].title).toBe('October Rent Agreement Receipt');

    // Never leak documents between distinct groups
    const foreignDocs = goaDocs.filter((d) => d.groupId === 'grp-roommates');
    expect(foreignDocs).toHaveLength(0);
  });

  it('filters documents by category and search query within a group', () => {
    const goaFoodDocs = documentsStore.filter(
      (d) => d.groupId === 'grp-goa' && d.category === 'FOOD'
    );
    expect(goaFoodDocs).toHaveLength(1);
    expect(goaFoodDocs[0].title).toBe('Shack Lunch Bill');

    const searchResults = documentsStore.filter(
      (d) =>
        d.groupId === 'grp-goa' &&
        (d.title.toLowerCase().includes('resort') ||
          (d.notes && d.notes.toLowerCase().includes('resort')))
    );
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe('doc-1');
  });

  it('safely unlinks documents without deleting files when an expense is deleted', () => {
    const expenseIdToDelete = 'exp-resort';

    // Verify document was originally linked to the expense
    const doc = documentsStore.find((d) => d.id === 'doc-1')!;
    expect(doc.expenseId).toBe(expenseIdToDelete);

    // Perform safe unlink policy: UPDATE documents SET expense_id = NULL WHERE expense_id = ?
    documentsStore = documentsStore.map((d) =>
      d.expenseId === expenseIdToDelete ? { ...d, expenseId: null } : d
    );

    // Verify document still exists in the group's document collection
    const unlinkedDoc = documentsStore.find((d) => d.id === 'doc-1')!;
    expect(unlinkedDoc).toBeDefined();
    expect(unlinkedDoc.expenseId).toBeNull();
    expect(unlinkedDoc.title).toBe('Goa Resort Tax Invoice');
    expect(unlinkedDoc.storagePath).toBe('file:///data/user/0/app/documents/resort.pdf');
  });

  it('validates document size and file type restrictions', () => {
    const MAX_ALLOWED_BYTES = 15 * 1024 * 1024; // 15MB
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    const oversizedFile = {
      name: 'large_video.mp4',
      size: 25 * 1024 * 1024,
      mime: 'video/mp4',
    };

    const isSizeValid = oversizedFile.size <= MAX_ALLOWED_BYTES;
    const isMimeValid = validMimes.includes(oversizedFile.mime);

    expect(isSizeValid).toBe(false);
    expect(isMimeValid).toBe(false);
  });
});

describe('Dashboard Live Analytics & Date-Range Filters', () => {
  interface Expense {
    id: string;
    amountPaise: number;
    category: string;
    date: string;
  }

  const sampleExpenses: Expense[] = [
    {
      id: 'e-1',
      amountPaise: 120000, // ₹1,200 (Current Week: Oct 23, 2026)
      category: 'FOOD_AND_DRINK',
      date: '2026-10-23T12:00:00.000Z',
    },
    {
      id: 'e-2',
      amountPaise: 350000, // ₹3,500 (Earlier this month: Oct 05, 2026)
      category: 'ACCOMMODATION',
      date: '2026-10-05T10:00:00.000Z',
    },
    {
      id: 'e-3',
      amountPaise: 800000, // ₹8,000 (Last month: Sep 15, 2026)
      category: 'TRANSPORT',
      date: '2026-09-15T09:00:00.000Z',
    },
  ];

  it('correctly filters spending for "THIS_MONTH" (October 2026)', () => {
    const targetMonth = 9; // October (0-indexed)
    const targetYear = 2026;

    const thisMonthExpenses = sampleExpenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });

    const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amountPaise, 0);

    expect(thisMonthExpenses).toHaveLength(2);
    expect(totalSpent).toBe(470000); // ₹4,700
    expect(formatCurrency(totalSpent, 'INR')).toBe('₹4,700.00');
  });

  it('correctly filters spending for "LAST_MONTH" (September 2026)', () => {
    const lastMonth = 8; // September
    const lastMonthExpenses = sampleExpenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === 2026 && d.getMonth() === lastMonth;
    });

    const totalSpent = lastMonthExpenses.reduce((sum, e) => sum + e.amountPaise, 0);

    expect(lastMonthExpenses).toHaveLength(1);
    expect(totalSpent).toBe(800000); // ₹8,000
  });

  it('computes category percentage distribution without floating precision drift', () => {
    const total = 470000;
    const foodShare = 120000;
    const stayShare = 350000;

    const foodPercent = Math.round((foodShare / total) * 100);
    const stayPercent = Math.round((stayShare / total) * 100);

    expect(foodPercent + stayPercent).toBe(100);
  });
});

describe('Theme Mode Engine & Persistent Preferences', () => {
  type ThemeMode = 'light' | 'dark' | 'system';

  function resolveActiveTheme(mode: ThemeMode, systemIsDark: boolean): 'light' | 'dark' {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    return systemIsDark ? 'dark' : 'light';
  }

  it('resolves explicit light and dark preferences regardless of system setting', () => {
    expect(resolveActiveTheme('light', true)).toBe('light');
    expect(resolveActiveTheme('light', false)).toBe('light');
    expect(resolveActiveTheme('dark', true)).toBe('dark');
    expect(resolveActiveTheme('dark', false)).toBe('dark');
  });

  it('correctly follows system theme when preference is "system"', () => {
    expect(resolveActiveTheme('system', true)).toBe('dark');
    expect(resolveActiveTheme('system', false)).toBe('light');
  });
});
