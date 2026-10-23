export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  upiId?: string | null;
}

export const CURRENT_USER: MockUser = {
  id: 'usr-current',
  name: 'Yash Surve',
  email: 'yash@tripmate.app',
  avatarUrl: null,
  upiId: 'yash@okaxis',
};

export const MOCK_FRIENDS: MockUser[] = [
  { id: 'usr-aarav', name: 'Aarav Patel', email: 'aarav@tripmate.app', upiId: 'aarav@okhdfcbank' },
  { id: 'usr-diya', name: 'Diya Sengupta', email: 'diya@tripmate.app', upiId: 'diya@icici' },
  { id: 'usr-rohan', name: 'Rohan Mehta', email: 'rohan@tripmate.app', upiId: 'rohan@paytm' },
  { id: 'usr-priya', name: 'Priya Verma', email: 'priya@tripmate.app', upiId: 'priya@oksbi' },
];

export const MOCK_GROUPS = [
  {
    id: 'grp-goa',
    name: 'Goa Roadtrip 🌴',
    description: 'Baga beach, scooty rentals, seaside shacks, and sunrises',
    type: 'TRIP' as const,
    currency: 'INR',
    budgetPaise: 4000000, // ₹40,000.00
    totalSpentPaise: 2750000, // ₹27,500.00
    myNetBalancePaise: 425000, // You are owed +₹4,250.00
    startDate: '2026-11-10T00:00:00.000Z',
    endDate: '2026-11-15T00:00:00.000Z',
    inviteCode: 'GOA-789',
    members: [
      CURRENT_USER,
      MOCK_FRIENDS[0], // Aarav
      MOCK_FRIENDS[1], // Diya
      MOCK_FRIENDS[2], // Rohan
    ],
  },
  {
    id: 'grp-flat',
    name: 'Green Glen Flat 402 🏠',
    description: 'Monthly groceries, WiFi, cook charges, and apartment maintenance',
    type: 'ROOMMATES' as const,
    currency: 'INR',
    budgetPaise: 3000000, // ₹30,000.00
    totalSpentPaise: 2240000, // ₹22,400.00
    myNetBalancePaise: -160000, // You owe -₹1,600.00
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: null,
    inviteCode: 'FLAT-402',
    members: [
      CURRENT_USER,
      MOCK_FRIENDS[0], // Aarav
      MOCK_FRIENDS[2], // Rohan
    ],
  },
  {
    id: 'grp-hackathon',
    name: 'Hackathon & Cafe Outing ☕',
    description: 'Dev sprints, specialty coffee, and late night pizza',
    type: 'OUTING' as const,
    currency: 'INR',
    budgetPaise: 800000, // ₹8,000.00
    totalSpentPaise: 540000, // ₹5,400.00
    myNetBalancePaise: 85000, // You are owed +₹850.00
    startDate: '2026-10-20T00:00:00.000Z',
    endDate: '2026-10-22T00:00:00.000Z',
    inviteCode: 'HACK-101',
    members: [
      CURRENT_USER,
      MOCK_FRIENDS[1], // Diya
      MOCK_FRIENDS[3], // Priya
    ],
  },
];

export const MOCK_EXPENSES = [
  {
    id: 'exp-1',
    groupId: 'grp-goa',
    title: 'Seaside Shack Dinner & Drinks',
    amountPaise: 640000, // ₹6,400.00
    currency: 'INR',
    category: 'FOOD_AND_DRINK',
    date: '2026-10-22T20:30:00.000Z',
    payerId: 'usr-current',
    payerName: 'Yash Surve',
    isCurrentUserPayer: true,
    participantCount: 4,
    userSharePaise: 160000, // ₹1,600.00
  },
  {
    id: 'exp-2',
    groupId: 'grp-goa',
    title: 'Scooter Fuel & Parking',
    amountPaise: 240000, // ₹2,400.00
    currency: 'INR',
    category: 'TRANSPORT',
    date: '2026-10-22T14:15:00.000Z',
    payerId: 'usr-aarav',
    payerName: 'Aarav Patel',
    isCurrentUserPayer: false,
    participantCount: 4,
    userSharePaise: 60000, // ₹600.00
  },
  {
    id: 'exp-3',
    groupId: 'grp-flat',
    title: 'High-speed Fiber WiFi (3 Months)',
    amountPaise: 359900, // ₹3,599.00
    currency: 'INR',
    category: 'UTILITIES',
    date: '2026-10-18T10:00:00.000Z',
    payerId: 'usr-rohan',
    payerName: 'Rohan Mehta',
    isCurrentUserPayer: false,
    participantCount: 3,
    userSharePaise: 119967, // ₹1,199.67
  },
  {
    id: 'exp-4',
    groupId: 'grp-hackathon',
    title: 'Artisan Pour-over Coffee & Bagels',
    amountPaise: 255000, // ₹2,550.00
    currency: 'INR',
    category: 'FOOD_AND_DRINK',
    date: '2026-10-21T16:00:00.000Z',
    payerId: 'usr-current',
    payerName: 'Yash Surve',
    isCurrentUserPayer: true,
    participantCount: 3,
    userSharePaise: 85000, // ₹850.00
  },
];

export interface MockDocument {
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
  updatedAt: string;
}

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: 'doc-1',
    groupId: 'grp-goa',
    expenseId: 'exp-1',
    title: 'Fisherman’s Wharf Dinner Bill',
    originalFilename: 'fishermans_wharf_bill.jpg',
    storagePath: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    mimeType: 'image/jpeg',
    fileSizeBytes: 245000,
    category: 'FOOD',
    notes: 'Dinner with 4 people including drinks and seafood platter.',
    uploadedAt: '2026-10-22T21:00:00.000Z',
    updatedAt: '2026-10-22T21:00:00.000Z',
  },
  {
    id: 'doc-2',
    groupId: 'grp-goa',
    expenseId: null,
    title: 'Baga Sunset Villa Booking Confirmation',
    originalFilename: 'baga_villa_confirmation.pdf',
    storagePath: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    mimeType: 'application/pdf',
    fileSizeBytes: 1048576,
    category: 'HOTEL',
    notes: 'Check-in: Nov 10, Check-out: Nov 15. Advance paid: ₹15,000.',
    uploadedAt: '2026-10-21T11:30:00.000Z',
    updatedAt: '2026-10-21T11:30:00.000Z',
  },
  {
    id: 'doc-3',
    groupId: 'grp-goa',
    expenseId: 'exp-2',
    title: 'Activa 6G Scooter Rental Slip',
    originalFilename: 'scooter_rental_receipt.jpg',
    storagePath: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    mimeType: 'image/jpeg',
    fileSizeBytes: 182000,
    category: 'TRANSPORT',
    notes: '2 scooters for 3 days @ ₹400/day + security deposit.',
    uploadedAt: '2026-10-22T14:30:00.000Z',
    updatedAt: '2026-10-22T14:30:00.000Z',
  },
  {
    id: 'doc-4',
    groupId: 'grp-flat',
    expenseId: 'exp-3',
    title: 'ACT Fibernet 300Mbps Tax Invoice',
    originalFilename: 'act_fibernet_oct_invoice.pdf',
    storagePath: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    mimeType: 'application/pdf',
    fileSizeBytes: 524288,
    category: 'UTILITIES',
    notes: 'Quarterly payment covering Oct to Dec 2026.',
    uploadedAt: '2026-10-18T10:15:00.000Z',
    updatedAt: '2026-10-18T10:15:00.000Z',
  },
  {
    id: 'doc-5',
    groupId: 'grp-hackathon',
    expenseId: 'exp-4',
    title: 'Third Wave Coffee Receipt',
    originalFilename: 'third_wave_invoice.jpg',
    storagePath: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    mimeType: 'image/jpeg',
    fileSizeBytes: 142000,
    category: 'FOOD',
    notes: 'Sprint Fuel: 3 V60 pour-overs and cinnamon rolls.',
    uploadedAt: '2026-10-21T16:15:00.000Z',
    updatedAt: '2026-10-21T16:15:00.000Z',
  },
];
