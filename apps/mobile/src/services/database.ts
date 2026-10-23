import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_USER, MOCK_FRIENDS, MOCK_GROUPS, MOCK_EXPENSES, MOCK_DOCUMENTS, MockDocument } from './mockData';
import { calculateEqualSplit, formatCurrency, simplifyDebts } from '../utils/finance';
import {
  ExportFilters,
  DetailedGroupReportData,
  ReportMemberSummary,
  ReportSettlement,
  ReportDocument,
  ReportCategoryAnalysis,
  ReportDailySpending,
  SuggestedSettlement,
} from './export/types';

const DB_NAME = 'tripmate.db';
const WEB_STORAGE_PREFIX = '@tripmate:sqlite_fallback:';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  upi_id?: string | null;
  currency_pref: string;
  theme_pref: string;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description?: string | null;
  type: 'TRIP' | 'ROOMMATES' | 'OUTING' | 'EVENT' | 'OTHER';
  currency: string;
  budget_paise: number;
  start_date?: string | null;
  end_date?: string | null;
  invite_code: string;
  created_by_id: string;
  created_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'ADMIN' | 'MEMBER';
  joined_at: string;
  nickname?: string | null;
  phone?: string | null;
  avatar_color?: string | null;
  is_active?: number;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  user_upi?: string | null;
  total_paid_paise?: number;
  total_share_paise?: number;
  net_balance_paise?: number;
  amount_owed_paise?: number;
  amount_owing_paise?: number;
  confirmed_repayments_made_paise?: number;
  confirmed_repayments_received_paise?: number;
  pending_repayments_paise?: number;
  paid_expense_count?: number;
  participated_expense_count?: number;
}

export interface ExpenseRow {
  id: string;
  group_id: string;
  title: string;
  notes?: string | null;
  amount_paise: number;
  currency: string;
  category: string;
  date: string;
  receipt_url?: string | null;
  created_by_id: string;
  created_at: string;
  payer_id?: string;
  payer_name?: string;
  split_count?: number;
  user_share_paise?: number;
}

export interface SettlementRow {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount_paise: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  notes?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  payer_name?: string;
  payee_name?: string;
}

export interface GroupDocumentRow {
  id: string;
  group_id: string;
  expense_id?: string | null;
  title: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  category: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
  notes?: string | null;
  uploaded_at: string;
  updated_at: string;
  expense_title?: string | null;
}

export interface ActivityRow {
  id: string;
  group_id: string;
  user_id: string;
  action: string;
  message: string;
  created_at: string;
  user_name?: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (Platform.OS === 'web') {
      await this.initWebFallback();
      this.isInitialized = true;
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);

      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          avatar_url TEXT,
          upi_id TEXT,
          currency_pref TEXT DEFAULT 'INR',
          theme_pref TEXT DEFAULT 'light',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL DEFAULT 'TRIP',
          currency TEXT NOT NULL DEFAULT 'INR',
          budget_paise INTEGER DEFAULT 0,
          start_date TEXT,
          end_date TEXT,
          invite_code TEXT UNIQUE NOT NULL,
          created_by_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_members (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'MEMBER',
          joined_at TEXT NOT NULL,
          nickname TEXT,
          phone TEXT,
          avatar_color TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          UNIQUE(group_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          title TEXT NOT NULL,
          notes TEXT,
          amount_paise INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          category TEXT NOT NULL DEFAULT 'FOOD_AND_DRINK',
          date TEXT NOT NULL,
          receipt_url TEXT,
          created_by_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expense_payments (
          id TEXT PRIMARY KEY,
          expense_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          amount_paise INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expense_splits (
          id TEXT PRIMARY KEY,
          expense_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          amount_paise INTEGER NOT NULL,
          split_type TEXT NOT NULL DEFAULT 'EQUAL',
          percentage REAL
        );

        CREATE TABLE IF NOT EXISTS settlements (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          payer_id TEXT NOT NULL,
          payee_id TEXT NOT NULL,
          amount_paise INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'CONFIRMED',
          notes TEXT,
          confirmed_at TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_documents (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL,
          expense_id TEXT,
          title TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          storage_path TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL DEFAULT 0,
          category TEXT NOT NULL DEFAULT 'OTHER',
          notes TEXT,
          uploaded_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
          FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_group_docs_group ON group_documents(group_id);
        CREATE INDEX IF NOT EXISTS idx_group_docs_expense ON group_documents(expense_id);
      `);

      // Safe schema migrations for existing databases
      try {
        await this.db.execAsync('ALTER TABLE group_members ADD COLUMN nickname TEXT;');
      } catch {}
      try {
        await this.db.execAsync('ALTER TABLE group_members ADD COLUMN phone TEXT;');
      } catch {}
      try {
        await this.db.execAsync('ALTER TABLE group_members ADD COLUMN avatar_color TEXT;');
      } catch {}
      try {
        await this.db.execAsync('ALTER TABLE group_members ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
      } catch {}

      await this.seedInitialDataIfEmpty();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      await this.initWebFallback();
      this.isInitialized = true;
    }
  }

  // --- Initial Setup for Fresh, Clean Offline Application ---
  private async seedInitialDataIfEmpty(): Promise<void> {
    if (!this.db) return;

    const existingUsers = await this.db.getAllAsync<UserRow>('SELECT id FROM users LIMIT 1');
    if (!existingUsers || existingUsers.length === 0) {
      const now = new Date().toISOString();
      // Only seed Current User (Yash Surve) — zero demo clutter
      await this.db.runAsync(
        `INSERT INTO users (id, email, name, avatar_url, upi_id, currency_pref, theme_pref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [CURRENT_USER.id, CURRENT_USER.email, CURRENT_USER.name, CURRENT_USER.avatarUrl || null, CURRENT_USER.upiId || null, 'INR', 'light', now]
      );
    }

    // Automatically purge old demo records so the app is 100% fresh, clean, and real
    await this.purgeDemoData();
  }

  async purgeDemoData(): Promise<void> {
    if (this.db) {
      try {
        await this.db.execAsync(`
          DELETE FROM group_documents WHERE group_id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM settlements WHERE group_id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN ('grp-1', 'grp-2', 'grp-3'));
          DELETE FROM expense_payments WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN ('grp-1', 'grp-2', 'grp-3'));
          DELETE FROM expenses WHERE group_id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM group_members WHERE group_id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM activities WHERE group_id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM groups WHERE id IN ('grp-1', 'grp-2', 'grp-3');
          DELETE FROM users WHERE id IN ('usr-2', 'usr-3', 'usr-4', 'usr-5');
        `);
      } catch (err) {
        console.warn('Could not purge demo data:', err);
      }
    }

    try {
      const rawGroups = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'groups');
      if (rawGroups) {
        const parsed = JSON.parse(rawGroups);
        const filtered = parsed.filter((g: any) => !['grp-1', 'grp-2', 'grp-3'].includes(g.id));
        await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify(filtered));
      }
      const rawExpenses = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
      if (rawExpenses) {
        const parsed = JSON.parse(rawExpenses);
        const filtered = parsed.filter((e: any) => !['grp-1', 'grp-2', 'grp-3'].includes(e.groupId));
        await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'expenses', JSON.stringify(filtered));
      }
      const rawDocs = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
      if (rawDocs) {
        const parsed = JSON.parse(rawDocs);
        const filtered = parsed.filter((d: any) => !['grp-1', 'grp-2', 'grp-3'].includes(d.groupId));
        await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'documents', JSON.stringify(filtered));
      }
      const rawSettlements = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
      if (rawSettlements) {
        const parsed = JSON.parse(rawSettlements);
        const filtered = parsed.filter((s: any) => !['grp-1', 'grp-2', 'grp-3'].includes(s.group_id));
        await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'settlements', JSON.stringify(filtered));
      }
    } catch {}
  }

  // --- Groups CRUD ---
  async getGroups(): Promise<any[]> {
    await this.init();

    if (this.db) {
      const groups = await this.db.getAllAsync<GroupRow>(
        'SELECT * FROM groups ORDER BY created_at DESC'
      );

      const enriched = await Promise.all(
        groups.map(async (grp) => {
          const members = await this.db!.getAllAsync<GroupMemberRow>(
            `SELECT gm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar, u.upi_id as user_upi
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?`,
            [grp.id]
          );

          const totalSpentRow = await this.db!.getFirstAsync<{ total: number }>(
            'SELECT COALESCE(SUM(amount_paise), 0) as total FROM expenses WHERE group_id = ?',
            [grp.id]
          );

          const myPaidRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(p.amount_paise), 0) as total
             FROM expense_payments p
             JOIN expenses e ON p.expense_id = e.id
             WHERE e.group_id = ? AND p.user_id = ?`,
            [grp.id, CURRENT_USER.id]
          );

          const myShareRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(s.amount_paise), 0) as total
             FROM expense_splits s
             JOIN expenses e ON s.expense_id = e.id
             WHERE e.group_id = ? AND s.user_id = ?`,
            [grp.id, CURRENT_USER.id]
          );

          const docCountRow = await this.db!.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM group_documents WHERE group_id = ?',
            [grp.id]
          );

          const totalSpentPaise = totalSpentRow?.total || 0;
          const myPaid = myPaidRow?.total || 0;
          const myShare = myShareRow?.total || 0;

          const settlementsPaidRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount_paise), 0) as total FROM settlements WHERE group_id = ? AND payer_id = ? AND status = 'CONFIRMED'`,
            [grp.id, CURRENT_USER.id]
          );
          const settlementsRecRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount_paise), 0) as total FROM settlements WHERE group_id = ? AND payee_id = ? AND status = 'CONFIRMED'`,
            [grp.id, CURRENT_USER.id]
          );

          const myNetBalancePaise = (myPaid - myShare) + (settlementsPaidRow?.total || 0) - (settlementsRecRow?.total || 0);

          return {
            id: grp.id,
            name: grp.name,
            description: grp.description,
            type: grp.type,
            currency: grp.currency,
            budgetPaise: grp.budget_paise,
            startDate: grp.start_date,
            endDate: grp.end_date,
            inviteCode: grp.invite_code,
            totalSpentPaise,
            myNetBalancePaise,
            documentCount: docCountRow?.count || 0,
            members: members.map((m) => ({
              userId: m.user_id,
              id: m.user_id,
              memberId: m.id,
              name: m.user_name || 'Member',
              nickname: m.nickname || null,
              email: m.user_email || '',
              phone: m.phone || null,
              avatarUrl: m.user_avatar,
              avatarColor: m.avatar_color || null,
              upiId: m.user_upi,
              role: m.role,
              isActive: m.is_active !== 0,
              joinedAt: m.joined_at,
            })),
          };
        })
      );

      return enriched;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'groups');
    const list = raw ? JSON.parse(raw) : [];
    const rawExpenses = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    const allExpenses: any[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    const rawSettlements = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    const allSettlements: any[] = rawSettlements ? JSON.parse(rawSettlements) : [];

    return list.map((grp: any) => {
      const gExpenses = allExpenses.filter((e: any) => e.groupId === grp.id);
      const gSettlements = allSettlements.filter((s: any) => s.group_id === grp.id && s.status === 'CONFIRMED');

      const totalSpentPaise = gExpenses.reduce((sum: number, e: any) => sum + (e.amountPaise || 0), 0);
      let myPaid = 0;
      let myShare = 0;
      for (const e of gExpenses) {
        if (e.payerId === CURRENT_USER.id) myPaid += (e.amountPaise || 0);
        const sp = (e.splits || []).find((s: any) => s.userId === CURRENT_USER.id);
        if (sp) myShare += (sp.amountPaise || 0);
      }
      let settlementsPaid = 0;
      let settlementsRec = 0;
      for (const s of gSettlements) {
        if (s.payer_id === CURRENT_USER.id) settlementsPaid += (s.amount_paise || 0);
        if (s.payee_id === CURRENT_USER.id) settlementsRec += (s.amount_paise || 0);
      }
      const myNetBalancePaise = (myPaid - myShare) + settlementsPaid - settlementsRec;

      return {
        ...grp,
        totalSpentPaise,
        myNetBalancePaise,
      };
    });
  }

  async getGroupById(groupId: string): Promise<any> {
    const groups = await this.getGroups();
    return groups.find((g) => g.id === groupId) || null;
  }

  async createGroup(input: {
    name: string;
    description?: string;
    type: string;
    currency: string;
    budgetPaise?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    await this.init();
    const id = 'grp-' + Date.now();
    const inviteCode = 'TRIP-' + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO groups (id, name, description, type, currency, budget_paise, start_date, end_date, invite_code, created_by_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.name,
          input.description || null,
          input.type,
          input.currency || 'INR',
          input.budgetPaise || 0,
          input.startDate || null,
          input.endDate || null,
          inviteCode,
          CURRENT_USER.id,
          now,
        ]
      );

      // Clean group creation: creator is the sole initial ADMIN member
      await this.db.runAsync(
        `INSERT INTO group_members (id, group_id, user_id, role, joined_at, nickname, phone, avatar_color, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [`gm-${id}-${CURRENT_USER.id}`, id, CURRENT_USER.id, 'ADMIN', now, null, null, '#4F46E5']
      );

      await this.addActivity(id, 'GROUP_CREATED', `Group "${input.name}" was created.`);
      return this.getGroupById(id);
    }

    // Web fallback
    const current = await this.getGroups();
    const newGrp = {
      id,
      name: input.name,
      description: input.description || null,
      type: input.type,
      currency: input.currency || 'INR',
      budgetPaise: input.budgetPaise || 0,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      inviteCode,
      totalSpentPaise: 0,
      myNetBalancePaise: 0,
      documentCount: 0,
      members: [
        { ...CURRENT_USER, userId: CURRENT_USER.id, role: 'ADMIN', isActive: true },
      ],
    };
    const updated = [newGrp, ...current];
    await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify(updated));
    return newGrp;
  }

  // --- Manual Group Member Management (Offline & Direct) ---
  async getGroupMembers(groupId: string, includeArchived = true): Promise<ReportMemberSummary[]> {
    await this.init();

    if (this.db) {
      let query = `
        SELECT gm.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar, u.upi_id as user_upi
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `;
      const params: any[] = [groupId];
      if (!includeArchived) {
        query += ' AND (gm.is_active = 1 OR gm.is_active IS NULL)';
      }
      query += ' ORDER BY gm.joined_at ASC';

      const rawMembers = await this.db.getAllAsync<GroupMemberRow>(query, params);

      const enriched: ReportMemberSummary[] = await Promise.all(
        rawMembers.map(async (m) => {
          // Total paid
          const paidRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(p.amount_paise), 0) as total
             FROM expense_payments p
             JOIN expenses e ON p.expense_id = e.id
             WHERE e.group_id = ? AND p.user_id = ?`,
            [groupId, m.user_id]
          );

          // Total share consumed
          const shareRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(s.amount_paise), 0) as total
             FROM expense_splits s
             JOIN expenses e ON s.expense_id = e.id
             WHERE e.group_id = ? AND s.user_id = ?`,
            [groupId, m.user_id]
          );

          // Confirmed repayments made
          const repMadeRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount_paise), 0) as total
             FROM settlements
             WHERE group_id = ? AND payer_id = ? AND status = 'CONFIRMED'`,
            [groupId, m.user_id]
          );

          // Confirmed repayments received
          const repRecRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount_paise), 0) as total
             FROM settlements
             WHERE group_id = ? AND payee_id = ? AND status = 'CONFIRMED'`,
            [groupId, m.user_id]
          );

          // Pending repayments
          const repPendingRow = await this.db!.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount_paise), 0) as total
             FROM settlements
             WHERE group_id = ? AND (payer_id = ? OR payee_id = ?) AND status = 'PENDING'`,
            [groupId, m.user_id, m.user_id]
          );

          // Expense counts
          const paidCountRow = await this.db!.getFirstAsync<{ count: number }>(
            `SELECT COUNT(DISTINCT e.id) as count
             FROM expenses e
             JOIN expense_payments p ON e.id = p.expense_id
             WHERE e.group_id = ? AND p.user_id = ?`,
            [groupId, m.user_id]
          );

          const partCountRow = await this.db!.getFirstAsync<{ count: number }>(
            `SELECT COUNT(DISTINCT e.id) as count
             FROM expenses e
             JOIN expense_splits s ON e.id = s.expense_id
             WHERE e.group_id = ? AND s.user_id = ?`,
            [groupId, m.user_id]
          );

          const totalPaidPaise = paidRow?.total || 0;
          const totalSharePaise = shareRow?.total || 0;
          const confirmedRepaymentsMadePaise = repMadeRow?.total || 0;
          const confirmedRepaymentsReceivedPaise = repRecRow?.total || 0;
          const pendingRepaymentsPaise = repPendingRow?.total || 0;

          // Mathematical invariant: Net Balance = Paid - Share + RepaymentsMade - RepaymentsReceived
          const netBalancePaise =
            totalPaidPaise - totalSharePaise + confirmedRepaymentsMadePaise - confirmedRepaymentsReceivedPaise;

          return {
            id: m.id,
            userId: m.user_id,
            name: m.user_name || 'Member',
            nickname: m.nickname || null,
            role: m.role || 'MEMBER',
            isActive: m.is_active !== 0,
            joinedAt: m.joined_at,
            email: m.user_email || '',
            phone: m.phone || null,
            avatarColor: m.avatar_color || null,
            totalPaidPaise,
            totalSharePaise,
            netBalancePaise,
            amountOwedPaise: Math.max(0, netBalancePaise),
            amountOwingPaise: Math.max(0, -netBalancePaise),
            confirmedRepaymentsMadePaise,
            confirmedRepaymentsReceivedPaise,
            pendingRepaymentsPaise,
            paidExpenseCount: paidCountRow?.count || 0,
            participatedExpenseCount: partCountRow?.count || 0,
          };
        })
      );

      return enriched;
    }

    // Web fallback
    const grp = await this.getGroupById(groupId);
    if (!grp) return [];

    const rawExpenses = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    const allExpenses: any[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    const groupExpenses = allExpenses.filter((e: any) => e.groupId === groupId);

    const rawSettlements = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    const allSettlements: any[] = rawSettlements ? JSON.parse(rawSettlements) : [];
    const groupSettlements = allSettlements.filter((s: any) => s.group_id === groupId && s.status === 'CONFIRMED');

    return (grp?.members || []).map((m: any) => {
      const uId = m.userId || m.id;
      let totalPaidPaise = 0;
      let totalSharePaise = 0;
      let paidExpenseCount = 0;
      let participatedExpenseCount = 0;

      for (const exp of groupExpenses) {
        if (exp.payerId === uId) {
          totalPaidPaise += exp.amountPaise;
          paidExpenseCount++;
        }
        const split = (exp.splits || []).find((s: any) => s.userId === uId);
        if (split) {
          totalSharePaise += split.amountPaise;
          participatedExpenseCount++;
        }
      }

      let confirmedRepaymentsMadePaise = 0;
      let confirmedRepaymentsReceivedPaise = 0;
      for (const stl of groupSettlements) {
        if (stl.payer_id === uId) confirmedRepaymentsMadePaise += stl.amount_paise;
        if (stl.payee_id === uId) confirmedRepaymentsReceivedPaise += stl.amount_paise;
      }

      const netBalancePaise = totalPaidPaise - totalSharePaise + confirmedRepaymentsMadePaise - confirmedRepaymentsReceivedPaise;

      return {
        id: m.memberId || `gm-${groupId}-${uId}`,
        userId: uId,
        name: m.name,
        nickname: m.nickname || null,
        role: m.role || 'MEMBER',
        isActive: m.isActive !== false,
        joinedAt: m.joinedAt || new Date().toISOString(),
        email: m.email || '',
        phone: m.phone || null,
        avatarColor: m.avatarColor || null,
        totalPaidPaise,
        totalSharePaise,
        netBalancePaise,
        amountOwedPaise: Math.max(0, netBalancePaise),
        amountOwingPaise: Math.max(0, -netBalancePaise),
        confirmedRepaymentsMadePaise,
        confirmedRepaymentsReceivedPaise,
        pendingRepaymentsPaise: 0,
        paidExpenseCount,
        participatedExpenseCount,
      };
    });
  }

  async addGroupMember(
    groupId: string,
    input: {
      name: string;
      nickname?: string;
      email?: string;
      phone?: string;
      role?: 'ADMIN' | 'MEMBER';
      avatarColor?: string;
    }
  ): Promise<ReportMemberSummary> {
    await this.init();
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Member name is required.');
    }

    const userId = 'usr_m_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const memberRecordId = `gm-${groupId}-${userId}`;
    const now = new Date().toISOString();
    const fallbackEmail = `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'}_${userId.slice(-6)}@tripmate.local`;
    const finalEmail = input.email?.trim() ? input.email.trim() : fallbackEmail;
    const role = input.role || 'MEMBER';
    const avatarColor = input.avatarColor || '#4F46E5';

    if (this.db) {
      await this.db.withTransactionAsync(async () => {
        await this.db!.runAsync(
          `INSERT INTO users (id, email, name, avatar_url, upi_id, currency_pref, theme_pref, created_at)
           VALUES (?, ?, ?, ?, ?, 'INR', 'light', ?)`,
          [userId, finalEmail, trimmedName, null, null, now]
        );

        await this.db!.runAsync(
          `INSERT INTO group_members (id, group_id, user_id, role, joined_at, nickname, phone, avatar_color, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            memberRecordId,
            groupId,
            userId,
            role,
            now,
            input.nickname?.trim() || null,
            input.phone?.trim() || null,
            avatarColor,
          ]
        );

        await this.db!.runAsync(
          `INSERT INTO activities (id, group_id, user_id, action, message, created_at)
           VALUES (?, ?, ?, 'MEMBER_ADDED', ?, ?)`,
          [`act-${Date.now()}`, groupId, CURRENT_USER.id, `Added member "${trimmedName}" to the group.`, now]
        );
      });

      const members = await this.getGroupMembers(groupId, true);
      const created = members.find((m) => m.userId === userId);
      return created!;
    }

    // Web fallback
    const currentGroups = await this.getGroups();
    const grpIndex = currentGroups.findIndex((g) => g.id === groupId);
    const newMember: ReportMemberSummary = {
      id: memberRecordId,
      userId,
      name: trimmedName,
      nickname: input.nickname?.trim() || null,
      role,
      isActive: true,
      joinedAt: now,
      email: finalEmail,
      phone: input.phone?.trim() || null,
      totalPaidPaise: 0,
      totalSharePaise: 0,
      netBalancePaise: 0,
      amountOwedPaise: 0,
      amountOwingPaise: 0,
      confirmedRepaymentsMadePaise: 0,
      confirmedRepaymentsReceivedPaise: 0,
      pendingRepaymentsPaise: 0,
      paidExpenseCount: 0,
      participatedExpenseCount: 0,
    };

    if (grpIndex !== -1) {
      currentGroups[grpIndex].members = [...(currentGroups[grpIndex].members || []), newMember];
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify(currentGroups));
    }
    return newMember;
  }

  async updateGroupMember(
    groupId: string,
    userId: string,
    updates: {
      name?: string;
      nickname?: string;
      email?: string;
      phone?: string;
      role?: 'ADMIN' | 'MEMBER';
      avatarColor?: string;
    }
  ): Promise<void> {
    await this.init();

    if (this.db) {
      await this.db.withTransactionAsync(async () => {
        if (updates.name !== undefined) {
          await this.db!.runAsync('UPDATE users SET name = ? WHERE id = ?', [updates.name.trim(), userId]);
        }
        if (updates.email !== undefined && updates.email.trim()) {
          try {
            await this.db!.runAsync('UPDATE users SET email = ? WHERE id = ?', [updates.email.trim(), userId]);
          } catch {
            // Keep existing email if uniqueness collision
          }
        }

        const gmClauses: string[] = [];
        const gmValues: any[] = [];

        if (updates.role !== undefined) {
          gmClauses.push('role = ?');
          gmValues.push(updates.role);
        }
        if (updates.nickname !== undefined) {
          gmClauses.push('nickname = ?');
          gmValues.push(updates.nickname ? updates.nickname.trim() : null);
        }
        if (updates.phone !== undefined) {
          gmClauses.push('phone = ?');
          gmValues.push(updates.phone ? updates.phone.trim() : null);
        }
        if (updates.avatarColor !== undefined) {
          gmClauses.push('avatar_color = ?');
          gmValues.push(updates.avatarColor);
        }

        if (gmClauses.length > 0) {
          gmValues.push(groupId, userId);
          await this.db!.runAsync(
            `UPDATE group_members SET ${gmClauses.join(', ')} WHERE group_id = ? AND user_id = ?`,
            gmValues
          );
        }

        await this.addActivity(
          groupId,
          'MEMBER_UPDATED',
          `Updated member details for "${updates.name || 'member'}".`
        );
      });
      return;
    }

    // Web fallback
    const currentGroups = await this.getGroups();
    const grp = currentGroups.find((g) => g.id === groupId);
    if (grp && grp.members) {
      grp.members = grp.members.map((m: any) => {
        if (m.userId === userId || m.id === userId) {
          return {
            ...m,
            name: updates.name ?? m.name,
            nickname: updates.nickname !== undefined ? updates.nickname : m.nickname,
            email: updates.email ?? m.email,
            phone: updates.phone !== undefined ? updates.phone : m.phone,
            role: updates.role ?? m.role,
            avatarColor: updates.avatarColor ?? m.avatarColor,
          };
        }
        return m;
      });
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify(currentGroups));
    }
  }

  async removeGroupMember(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean; archived: boolean; message: string }> {
    await this.init();

    if (this.db) {
      // 1. Check if user has payments
      const paymentsRow = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM expense_payments p
         JOIN expenses e ON p.expense_id = e.id
         WHERE e.group_id = ? AND p.user_id = ?`,
        [groupId, userId]
      );

      // 2. Check if user has splits
      const splitsRow = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM expense_splits s
         JOIN expenses e ON s.expense_id = e.id
         WHERE e.group_id = ? AND s.user_id = ?`,
        [groupId, userId]
      );

      // 3. Check if user has settlements
      const settlementsRow = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM settlements
         WHERE group_id = ? AND (payer_id = ? OR payee_id = ?)`,
        [groupId, userId, userId]
      );

      const hasFinancialHistory =
        (paymentsRow?.count || 0) > 0 || (splitsRow?.count || 0) > 0 || (settlementsRow?.count || 0) > 0;

      const userRow = await this.db.getFirstAsync<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
      const userName = userRow?.name || 'Member';

      if (hasFinancialHistory) {
        // Safe archival to preserve financial history and zero-sum balance invariant
        await this.db.runAsync(
          'UPDATE group_members SET is_active = 0 WHERE group_id = ? AND user_id = ?',
          [groupId, userId]
        );
        await this.addActivity(
          groupId,
          'MEMBER_ARCHIVED',
          `Archived member "${userName}". Historical transactions and balance records preserved.`
        );
        return {
          success: true,
          archived: true,
          message: `Member "${userName}" has recorded expenses or settlements. To protect financial integrity and historical records, they have been archived instead of deleted.`,
        };
      } else {
        // Safe hard delete since no financial involvement exists
        await this.db.runAsync(
          'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
          [groupId, userId]
        );
        await this.addActivity(groupId, 'MEMBER_REMOVED', `Removed member "${userName}" from the group.`);
        return {
          success: true,
          archived: false,
          message: `Member "${userName}" had no transaction history and was completely removed.`,
        };
      }
    }

    // Web fallback
    const currentGroups = await this.getGroups();
    const grp = currentGroups.find((g) => g.id === groupId);
    if (grp && grp.members) {
      grp.members = grp.members.filter((m: any) => m.userId !== userId && m.id !== userId);
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify(currentGroups));
    }
    return { success: true, archived: false, message: 'Member removed.' };
  }

  // --- Comprehensive Group Financial Report & Excel Extraction Engine ---
  async getGroupDetailedReport(groupId: string, filters?: ExportFilters): Promise<DetailedGroupReportData> {
    await this.init();
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error(`Group not found with ID ${groupId}`);
    }

    const appliedFilters: ExportFilters = filters || {
      dateRange: 'ALL',
      categoryId: 'ALL',
      memberId: 'ALL',
      scope: 'COMPLETE',
    };

    // 1. Fetch all members with their computed metrics
    const members = await this.getGroupMembers(groupId, true);

    // 2. Fetch expenses and apply filters
    const allExpenses = await this.getExpenses(groupId);
    let filteredExpenses = allExpenses;

    if (appliedFilters.dateRange === 'CUSTOM') {
      if (appliedFilters.startDate) {
        filteredExpenses = filteredExpenses.filter((e) => e.date >= appliedFilters.startDate!);
      }
      if (appliedFilters.endDate) {
        filteredExpenses = filteredExpenses.filter((e) => e.date <= appliedFilters.endDate!);
      }
    }

    if (appliedFilters.categoryId && appliedFilters.categoryId !== 'ALL') {
      filteredExpenses = filteredExpenses.filter((e) => e.category === appliedFilters.categoryId);
    }

    if (appliedFilters.memberId && appliedFilters.memberId !== 'ALL') {
      filteredExpenses = filteredExpenses.filter(
        (e) =>
          e.payerId === appliedFilters.memberId ||
          (e.splits || []).some((s: any) => s.userId === appliedFilters.memberId)
      );
    }

    // 3. Extract Detailed Payments & Splits collections
    const payments: any[] = [];
    const splits: any[] = [];

    for (const exp of filteredExpenses) {
      // Payment record
      payments.push({
        paymentId: `pay-${exp.id}`,
        expenseId: exp.id,
        expenseTitle: exp.title,
        userId: exp.payerId,
        userName: exp.payerName || 'Member',
        amountPaise: exp.amountPaise,
        currency: exp.currency || group.currency,
        date: exp.date,
        notes: exp.notes,
      });

      // Split allocations
      for (const s of exp.splits || []) {
        const pct = exp.amountPaise > 0 ? (s.amountPaise / exp.amountPaise) * 100 : 0;
        splits.push({
          splitId: `split-${exp.id}-${s.userId}`,
          expenseId: exp.id,
          expenseTitle: exp.title,
          userId: s.userId,
          userName: s.userName || 'Member',
          expenseTotalPaise: exp.amountPaise,
          amountPaise: s.amountPaise,
          splitType: s.splitType || 'EQUAL',
          percentage: Math.round(pct * 10) / 10,
          currency: exp.currency || group.currency,
        });
      }
    }

    // 4. Settlements
    const allSettlements = await this.getSettlements(groupId);
    const settlements: ReportSettlement[] = allSettlements.map((s: any) => ({
      id: s.id,
      groupId: s.group_id || groupId,
      groupName: group.name,
      payerId: s.payer_id,
      payerName: s.payer_name || 'Member',
      payeeId: s.payee_id,
      payeeName: s.payee_name || 'Member',
      amountPaise: s.amount_paise,
      currency: s.currency || group.currency,
      status: s.status,
      notes: s.notes,
      createdAt: s.created_at,
      confirmedAt: s.confirmed_at,
    }));

    // 5. Documents
    const allDocs = await this.getDocuments(groupId);
    const documents: ReportDocument[] = allDocs.map((d) => {
      const linkedExp = filteredExpenses.find((e) => e.id === d.expense_id);
      return {
        id: d.id,
        groupId: d.group_id,
        groupName: group.name,
        expenseId: d.expense_id,
        expenseTitle: d.expense_title || (linkedExp ? linkedExp.title : null),
        expenseAmountPaise: linkedExp ? linkedExp.amountPaise : null,
        title: d.title,
        originalFilename: d.original_filename,
        mimeType: d.mime_type,
        fileSizeBytes: d.file_size_bytes,
        category: d.category,
        notes: d.notes,
        uploadedAt: d.uploaded_at,
        isAvailableLocally: true,
      };
    });

    // 6. Category Analysis
    const categoryTotals: Record<string, { count: number; totalPaise: number; largestPaise: number }> = {};
    let totalExpensesPaise = 0;

    for (const exp of filteredExpenses) {
      totalExpensesPaise += exp.amountPaise;
      const cat = exp.category || 'OTHER';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { count: 0, totalPaise: 0, largestPaise: 0 };
      }
      categoryTotals[cat].count += 1;
      categoryTotals[cat].totalPaise += exp.amountPaise;
      if (exp.amountPaise > categoryTotals[cat].largestPaise) {
        categoryTotals[cat].largestPaise = exp.amountPaise;
      }
    }

    const categories: ReportCategoryAnalysis[] = Object.entries(categoryTotals)
      .map(([cat, stat]) => ({
        category: cat,
        categoryLabel: cat.replace(/_/g, ' '),
        expenseCount: stat.count,
        totalPaise: stat.totalPaise,
        percentage: totalExpensesPaise > 0 ? Math.round((stat.totalPaise / totalExpensesPaise) * 1000) / 10 : 0,
        averagePaise: stat.count > 0 ? Math.round(stat.totalPaise / stat.count) : 0,
        largestExpensePaise: stat.largestPaise,
        budgetPaise: 0,
        remainingBudgetPaise: 0,
      }))
      .sort((a, b) => b.totalPaise - a.totalPaise);

    // 7. Daily Spending
    const dailyMap: Record<string, { count: number; totalPaise: number; categories: Record<string, number> }> = {};
    for (const exp of filteredExpenses) {
      const d = exp.date ? exp.date.split('T')[0] : 'Unknown';
      if (!dailyMap[d]) {
        dailyMap[d] = { count: 0, totalPaise: 0, categories: {} };
      }
      dailyMap[d].count += 1;
      dailyMap[d].totalPaise += exp.amountPaise;
      const c = exp.category || 'OTHER';
      dailyMap[d].categories[c] = (dailyMap[d].categories[c] || 0) + exp.amountPaise;
    }

    const sortedDates = Object.keys(dailyMap).sort();
    let runningCumulative = 0;
    const dailySpending: ReportDailySpending[] = sortedDates.map((date) => {
      const data = dailyMap[date];
      runningCumulative += data.totalPaise;
      const catBreakdown = Object.entries(data.categories)
        .map(([c, amt]) => `${c.replace(/_/g, ' ')}: ${formatCurrency(amt, group.currency)}`)
        .join(', ');
      return {
        date,
        expenseCount: data.count,
        totalPaise: data.totalPaise,
        categoryBreakdown: catBreakdown,
        dailyAveragePaise: data.count > 0 ? Math.round(data.totalPaise / data.count) : 0,
        cumulativePaise: runningCumulative,
      };
    });

    // 8. Suggested Settlements using the zero-sum flow engine
    const memberBalanceMap: Record<string, any> = {};
    for (const m of members) {
      memberBalanceMap[m.userId] = {
        userId: m.userId,
        balance: m.netBalancePaise,
        totalPaid: m.totalPaidPaise,
        totalShare: m.totalSharePaise,
        totalSettlementReceived: m.confirmedRepaymentsReceivedPaise,
        totalSettlementPaid: m.confirmedRepaymentsMadePaise,
      };
    }
    const simplifiedTransfers = simplifyDebts(memberBalanceMap, group.currency);
    const memberNameMap: Record<string, string> = {};
    members.forEach((m) => {
      memberNameMap[m.userId] = m.name;
    });

    const suggestedSettlements: SuggestedSettlement[] = simplifiedTransfers.map((t) => ({
      fromUserId: t.fromUserId,
      fromUserName: memberNameMap[t.fromUserId] || 'Member',
      toUserId: t.toUserId,
      toUserName: memberNameMap[t.toUserId] || 'Member',
      amountPaise: t.amount,
      currency: t.currency,
      status: 'SUGGESTED',
    }));

    // 9. Highlights & KPIs
    let largestExpense: any = null;
    if (filteredExpenses.length > 0) {
      const sorted = [...filteredExpenses].sort((a, b) => b.amountPaise - a.amountPaise);
      largestExpense = {
        title: sorted[0].title,
        amountPaise: sorted[0].amountPaise,
        date: sorted[0].date,
        payerName: sorted[0].payerName || 'Member',
      };
    }

    const topCategory = categories.length > 0 ? categories[0] : null;

    // Highest spending member by actual expense share
    let highestSpendingMember: any = null;
    if (members.length > 0) {
      const sortedByShare = [...members].sort((a, b) => b.totalSharePaise - a.totalSharePaise);
      if (sortedByShare[0].totalSharePaise > 0) {
        highestSpendingMember = {
          userId: sortedByShare[0].userId,
          name: sortedByShare[0].name,
          sharePaise: sortedByShare[0].totalSharePaise,
          percentage:
            totalExpensesPaise > 0
              ? Math.round((sortedByShare[0].totalSharePaise / totalExpensesPaise) * 1000) / 10
              : 0,
        };
      }
    }

    // Zero-sum invariant verification: sum of all net balances must equal 0
    let balanceSum = 0;
    let totalOutstandingBalancesPaise = 0;
    for (const m of members) {
      balanceSum += m.netBalancePaise;
      if (m.netBalancePaise > 0) {
        totalOutstandingBalancesPaise += m.netBalancePaise;
      }
    }
    const isBalancedZeroSum = balanceSum === 0;

    const totalConfirmedRepaymentsPaise = settlements
      .filter((s) => s.status === 'CONFIRMED')
      .reduce((acc, s) => acc + s.amountPaise, 0);

    const totalPendingRepaymentsPaise = settlements
      .filter((s) => s.status === 'PENDING')
      .reduce((acc, s) => acc + s.amountPaise, 0);

    const budgetPaise = group.budget_paise || group.budgetPaise || 0;
    const remainingBudgetPaise = budgetPaise > 0 ? Math.max(0, budgetPaise - totalExpensesPaise) : 0;

    // Reporting period label
    let reportingPeriodLabel = 'Lifetime History';
    if (appliedFilters.dateRange === 'CUSTOM') {
      reportingPeriodLabel = `${appliedFilters.startDate || 'Start'} to ${appliedFilters.endDate || 'End'}`;
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        type: group.type,
        currency: group.currency,
        budgetPaise,
        startDate: group.start_date || group.startDate || null,
        endDate: group.end_date || group.endDate || null,
        inviteCode: group.invite_code || group.inviteCode || '',
        createdById: group.created_by_id || CURRENT_USER.id,
        createdAt: group.created_at || new Date().toISOString(),
      },
      filters: appliedFilters,
      reportingPeriodLabel,
      generationDate: new Date().toISOString(),
      kpis: {
        memberCount: members.length,
        activeMemberCount: members.filter((m) => m.isActive).length,
        expenseCount: filteredExpenses.length,
        totalExpensesPaise,
        totalAllocatedSharesPaise: splits.reduce((acc, s) => acc + s.amountPaise, 0),
        totalOutstandingBalancesPaise,
        totalConfirmedRepaymentsPaise,
        totalPendingRepaymentsPaise,
        budgetPaise,
        remainingBudgetPaise,
        largestExpense,
        topSpendingCategory: topCategory
          ? {
              category: topCategory.category,
              categoryLabel: topCategory.categoryLabel,
              amountPaise: topCategory.totalPaise,
              percentage: topCategory.percentage,
            }
          : null,
        highestSpendingMember,
        isBalancedZeroSum,
      },
      expenses: filteredExpenses,
      members,
      payments,
      splits,
      settlements,
      suggestedSettlements,
      categories,
      dailySpending,
      documents,
    };
  }

  // --- Expenses CRUD ---
  async getExpenses(groupId?: string): Promise<any[]> {
    await this.init();

    if (this.db) {
      let query = `
        SELECT e.*, u.name as payer_name, p.user_id as payer_id
        FROM expenses e
        LEFT JOIN expense_payments p ON e.id = p.expense_id
        LEFT JOIN users u ON p.user_id = u.id
      `;
      const params: any[] = [];

      if (groupId) {
        query += ' WHERE e.group_id = ?';
        params.push(groupId);
      }
      query += ' ORDER BY e.date DESC';

      const rows = await this.db.getAllAsync<any>(query, params);

      const enriched = await Promise.all(
        rows.map(async (row) => {
          const splits = await this.db!.getAllAsync<any>(
            `SELECT s.*, u.name as user_name
             FROM expense_splits s
             LEFT JOIN users u ON s.user_id = u.id
             WHERE s.expense_id = ?`,
            [row.id]
          );

          const docs = await this.db!.getAllAsync<GroupDocumentRow>(
            'SELECT * FROM group_documents WHERE expense_id = ?',
            [row.id]
          );

          const mySplit = splits.find((s) => s.user_id === CURRENT_USER.id);
          const isCurrentUserPayer = row.payer_id === CURRENT_USER.id;

          return {
            id: row.id,
            groupId: row.group_id,
            title: row.title,
            notes: row.notes,
            amountPaise: row.amount_paise,
            currency: row.currency,
            category: row.category,
            date: row.date,
            payerId: row.payer_id,
            payerName: isCurrentUserPayer ? 'You' : row.payer_name || 'Member',
            isCurrentUserPayer,
            participantCount: splits.length || 1,
            userSharePaise: mySplit ? mySplit.amount_paise : 0,
            splits: splits.map((s) => ({
              userId: s.user_id,
              userName: s.user_id === CURRENT_USER.id ? 'You' : s.user_name || 'Member',
              amountPaise: s.amount_paise,
              splitType: s.split_type,
            })),
            receipts: docs,
          };
        })
      );

      return enriched;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    const all = raw ? JSON.parse(raw) : [];
    return groupId ? all.filter((e: any) => e.groupId === groupId) : all;
  }

  async getExpenseById(id: string): Promise<any> {
    const expenses = await this.getExpenses();
    return expenses.find((e) => e.id === id) || null;
  }

  async createExpense(input: {
    groupId: string;
    title: string;
    amountPaise: number;
    currency: string;
    category: string;
    date: string;
    payerId: string;
    payerName?: string;
    participants: string[];
    splitType?: string;
    notes?: string;
    attachedDocId?: string;
  }): Promise<any> {
    await this.init();
    const id = 'exp-' + Date.now();
    const now = new Date().toISOString();

    if (this.db) {
      await this.db.withTransactionAsync(async () => {
        await this.db!.runAsync(
          `INSERT INTO expenses (id, group_id, title, notes, amount_paise, currency, category, date, created_by_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.groupId,
            input.title,
            input.notes || null,
            input.amountPaise,
            input.currency,
            input.category,
            input.date,
            CURRENT_USER.id,
            now,
          ]
        );

        await this.db!.runAsync(
          `INSERT INTO expense_payments (id, expense_id, user_id, amount_paise)
           VALUES (?, ?, ?, ?)`,
          [`pay-${id}`, id, input.payerId, input.amountPaise]
        );

        const splits = calculateEqualSplit(input.amountPaise, input.participants);
        for (const s of splits) {
          await this.db!.runAsync(
            `INSERT INTO expense_splits (id, expense_id, user_id, amount_paise, split_type)
             VALUES (?, ?, ?, ?, ?)`,
            [`split-${id}-${s.userId}`, id, s.userId, s.amountPaise, input.splitType || 'EQUAL']
          );
        }

        if (input.attachedDocId) {
          await this.db!.runAsync(
            'UPDATE group_documents SET expense_id = ?, updated_at = ? WHERE id = ?',
            [id, now, input.attachedDocId]
          );
        }

        await this.db!.runAsync(
          `INSERT INTO activities (id, group_id, user_id, action, message, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `act-${Date.now()}`,
            input.groupId,
            CURRENT_USER.id,
            'EXPENSE_CREATED',
            `Added "${input.title}" (${formatCurrency(input.amountPaise, input.currency)})`,
            now,
          ]
        );
      });

      return this.getExpenseById(id);
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    const existing = raw ? JSON.parse(raw) : [];
    const isCurrentUserPayer = input.payerId === CURRENT_USER.id;
    const userSharePaise = Math.floor(input.amountPaise / (input.participants.length || 1));

    const newExp = {
      id,
      groupId: input.groupId,
      title: input.title,
      notes: input.notes || null,
      amountPaise: input.amountPaise,
      currency: input.currency,
      category: input.category,
      date: input.date,
      payerId: input.payerId,
      payerName: input.payerName || 'You',
      isCurrentUserPayer,
      participantCount: input.participants.length,
      userSharePaise,
      splits: input.participants.map((p) => ({
        userId: p,
        userName: p === CURRENT_USER.id ? 'You' : 'Member',
        amountPaise: userSharePaise,
        splitType: 'EQUAL',
      })),
      receipts: [],
    };
    await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'expenses', JSON.stringify([newExp, ...existing]));
    return newExp;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.withTransactionAsync(async () => {
        // Safe document preservation: unlink attached receipts instead of deleting them!
        await this.db!.runAsync('UPDATE group_documents SET expense_id = NULL WHERE expense_id = ?', [id]);
        await this.db!.runAsync('DELETE FROM expense_splits WHERE expense_id = ?', [id]);
        await this.db!.runAsync('DELETE FROM expense_payments WHERE expense_id = ?', [id]);
        await this.db!.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
      });
      return;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    if (raw) {
      const expenses = JSON.parse(raw).filter((e: any) => e.id !== id);
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'expenses', JSON.stringify(expenses));
    }
  }

  // --- Group-Specific Document Management ---
  async getDocuments(
    groupId: string,
    options?: { category?: string; query?: string; expenseId?: string }
  ): Promise<GroupDocumentRow[]> {
    await this.init();

    if (this.db) {
      let query = `
        SELECT d.*, e.title as expense_title
        FROM group_documents d
        LEFT JOIN expenses e ON d.expense_id = e.id
        WHERE d.group_id = ?
      `;
      const params: any[] = [groupId];

      if (options?.category && options.category !== 'ALL') {
        query += ' AND d.category = ?';
        params.push(options.category);
      }
      if (options?.expenseId) {
        query += ' AND d.expense_id = ?';
        params.push(options.expenseId);
      }
      if (options?.query && options.query.trim()) {
        query += ' AND (d.title LIKE ? OR d.original_filename LIKE ? OR d.notes LIKE ?)';
        const searchTerm = `%${options.query.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY d.uploaded_at DESC';
      return this.db.getAllAsync<GroupDocumentRow>(query, params);
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    let docs: MockDocument[] = raw ? JSON.parse(raw) : [];
    docs = docs.filter((d) => d.groupId === groupId);

    if (options?.category && options.category !== 'ALL') {
      docs = docs.filter((d) => d.category === options.category);
    }
    if (options?.expenseId) {
      docs = docs.filter((d) => d.expenseId === options.expenseId);
    }
    if (options?.query && options.query.trim()) {
      const q = options.query.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.originalFilename.toLowerCase().includes(q) ||
          (d.notes && d.notes.toLowerCase().includes(q))
      );
    }

    return docs.map((d) => ({
      id: d.id,
      group_id: d.groupId,
      expense_id: d.expenseId || null,
      title: d.title,
      original_filename: d.originalFilename,
      storage_path: d.storagePath,
      mime_type: d.mimeType,
      file_size_bytes: d.fileSizeBytes,
      category: d.category,
      notes: d.notes || null,
      uploaded_at: d.uploadedAt,
      updated_at: d.updatedAt,
      expense_title: null,
    }));
  }

  async getDocumentById(id: string): Promise<GroupDocumentRow | null> {
    await this.init();
    if (this.db) {
      const doc = await this.db.getFirstAsync<GroupDocumentRow>(
        `SELECT d.*, e.title as expense_title
         FROM group_documents d
         LEFT JOIN expenses e ON d.expense_id = e.id
         WHERE d.id = ?`,
        [id]
      );
      return doc || null;
    }

    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    const docs: MockDocument[] = raw ? JSON.parse(raw) : [];
    const found = docs.find((d) => d.id === id);
    if (!found) return null;
    return {
      id: found.id,
      group_id: found.groupId,
      expense_id: found.expenseId || null,
      title: found.title,
      original_filename: found.originalFilename,
      storage_path: found.storagePath,
      mime_type: found.mimeType,
      file_size_bytes: found.fileSizeBytes,
      category: found.category,
      notes: found.notes || null,
      uploaded_at: found.uploadedAt,
      updated_at: found.updatedAt,
      expense_title: null,
    };
  }

  async createDocument(input: {
    groupId: string;
    expenseId?: string | null;
    title: string;
    originalFilename: string;
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
    category: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
    notes?: string | null;
  }): Promise<GroupDocumentRow> {
    await this.init();
    const id = 'doc-' + Date.now();
    const now = new Date().toISOString();

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO group_documents (id, group_id, expense_id, title, original_filename, storage_path, mime_type, file_size_bytes, category, notes, uploaded_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.groupId,
          input.expenseId || null,
          input.title,
          input.originalFilename,
          input.storagePath,
          input.mimeType,
          input.fileSizeBytes,
          input.category,
          input.notes || null,
          now,
          now,
        ]
      );

      await this.addActivity(
        input.groupId,
        'DOCUMENT_UPLOADED',
        `Uploaded document "${input.title}" (${input.category})`
      );

      const created = await this.getDocumentById(id);
      return created!;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    const existing: MockDocument[] = raw ? JSON.parse(raw) : [];
    const newDoc: MockDocument = {
      id,
      groupId: input.groupId,
      expenseId: input.expenseId || null,
      title: input.title,
      originalFilename: input.originalFilename,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      category: input.category,
      notes: input.notes || null,
      uploadedAt: now,
      updatedAt: now,
    };
    await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'documents', JSON.stringify([newDoc, ...existing]));

    return {
      ...newDoc,
      group_id: newDoc.groupId,
      expense_id: newDoc.expenseId,
      original_filename: newDoc.originalFilename,
      storage_path: newDoc.storagePath,
      mime_type: newDoc.mimeType,
      file_size_bytes: newDoc.fileSizeBytes,
      uploaded_at: newDoc.uploadedAt,
      updated_at: newDoc.updatedAt,
      expense_title: null,
    };
  }

  async updateDocument(
    id: string,
    updates: {
      title?: string;
      category?: 'FOOD' | 'HOTEL' | 'TRANSPORT' | 'TICKETS' | 'SHOPPING' | 'UTILITIES' | 'OTHER';
      notes?: string | null;
      expenseId?: string | null;
    }
  ): Promise<void> {
    await this.init();
    const now = new Date().toISOString();

    if (this.db) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;

      const setClauses: string[] = ['updated_at = ?'];
      const values: any[] = [now];

      if (updates.title !== undefined) {
        setClauses.push('title = ?');
        values.push(updates.title);
      }
      if (updates.category !== undefined) {
        setClauses.push('category = ?');
        values.push(updates.category);
      }
      if (updates.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(updates.notes);
      }
      if (updates.expenseId !== undefined) {
        setClauses.push('expense_id = ?');
        values.push(updates.expenseId);
      }

      values.push(id);
      await this.db.runAsync(
        `UPDATE group_documents SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
      return;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    if (raw) {
      const docs: MockDocument[] = JSON.parse(raw);
      const updated = docs.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            title: updates.title ?? d.title,
            category: updates.category ?? d.category,
            notes: updates.notes ?? d.notes,
            expenseId: updates.expenseId !== undefined ? updates.expenseId : d.expenseId,
            updatedAt: now,
          };
        }
        return d;
      });
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'documents', JSON.stringify(updated));
    }
  }

  async deleteDocument(id: string): Promise<void> {
    await this.init();
    if (this.db) {
      await this.db.runAsync('DELETE FROM group_documents WHERE id = ?', [id]);
      return;
    }

    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    if (raw) {
      const docs: MockDocument[] = JSON.parse(raw);
      const filtered = docs.filter((d) => d.id !== id);
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'documents', JSON.stringify(filtered));
    }
  }

  // --- Dynamic Dashboard Aggregator ---
  async getDashboardStats(range: 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME' = 'THIS_MONTH') {
    await this.init();
    const groups = await this.getGroups();
    const allExpenses = await this.getExpenses();
    const settlements = await this.getAllSettlements();

    const now = new Date();
    let startDate: Date;

    if (range === 'THIS_WEEK') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'LAST_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else {
      startDate = new Date(0); // All time
    }

    // Filter expenses by date
    const filteredExpenses = allExpenses.filter((e) => {
      const expDate = new Date(e.date);
      if (range === 'LAST_MONTH') {
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return expDate >= startDate && expDate <= endOfLastMonth;
      }
      return expDate >= startDate;
    });

    const totalSpentPaise = filteredExpenses.reduce((sum, e) => sum + e.amountPaise, 0);

    // Sum balances across all active groups
    let amountOwedPaise = 0;
    let amountOwesPaise = 0;

    for (const g of groups) {
      if (g.myNetBalancePaise > 0) {
        amountOwedPaise += g.myNetBalancePaise;
      } else if (g.myNetBalancePaise < 0) {
        amountOwesPaise += Math.abs(g.myNetBalancePaise);
      }
    }

    const netBalancePaise = amountOwedPaise - amountOwesPaise;

    // Spending category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      const cat = exp.category || 'OTHER';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amountPaise;
    }

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        totalPaise: amount,
        percentage: totalSpentPaise > 0 ? Math.round((amount / totalSpentPaise) * 100) : 0,
      }))
      .sort((a, b) => b.totalPaise - a.totalPaise);

    // Budget Warnings (>= 80% or >= 100%)
    const budgetWarnings = groups
      .filter((g) => g.budgetPaise > 0)
      .map((g) => {
        const ratio = g.totalSpentPaise / g.budgetPaise;
        const percentage = Math.round(ratio * 100);
        return {
          groupId: g.id,
          groupName: g.name,
          budgetPaise: g.budgetPaise,
          totalSpentPaise: g.totalSpentPaise,
          percentage,
          isWarning: percentage >= 80 && percentage < 100,
          isExceeded: percentage >= 100,
        };
      })
      .filter((w) => w.isWarning || w.isExceeded);

    // Upcoming Trips
    const upcomingTrips = groups.filter((g) => {
      if (g.type !== 'TRIP' || !g.startDate) return false;
      return new Date(g.startDate) >= new Date();
    });

    return {
      range,
      totalSpentPaise,
      totalActiveGroupSpentPaise: groups.reduce((acc, g) => acc + (g.totalSpentPaise || 0), 0),
      amountOwedPaise,
      amountOwesPaise,
      netBalancePaise,
      activeGroupCount: groups.length,
      categoryBreakdown,
      budgetWarnings,
      upcomingTrips,
      recentExpenses: filteredExpenses.slice(0, 5),
      recentSettlements: settlements.slice(0, 3),
    };
  }

  // --- Settlements CRUD ---
  async getAllSettlements(): Promise<any[]> {
    await this.init();
    if (this.db) {
      return this.db.getAllAsync(
        `SELECT s.*, p.name as payer_name, r.name as payee_name, g.name as group_name
         FROM settlements s
         LEFT JOIN users p ON s.payer_id = p.id
         LEFT JOIN users r ON s.payee_id = r.id
         LEFT JOIN groups g ON s.group_id = g.id
         ORDER BY s.created_at DESC`
      );
    }
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    return raw ? JSON.parse(raw) : [];
  }

  async getSettlements(groupId: string): Promise<any[]> {
    await this.init();
    if (this.db) {
      return this.db.getAllAsync(
        `SELECT s.*, p.name as payer_name, r.name as payee_name
         FROM settlements s
         LEFT JOIN users p ON s.payer_id = p.id
         LEFT JOIN users r ON s.payee_id = r.id
         WHERE s.group_id = ?
         ORDER BY s.created_at DESC`,
        [groupId]
      );
    }
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    if (!raw) return [];
    const list = JSON.parse(raw);
    return list.filter((s: any) => s.group_id === groupId);
  }

  async createSettlement(input: {
    groupId: string;
    payerId: string;
    payeeId: string;
    amountPaise: number;
    currency?: string;
    notes?: string;
  }): Promise<void> {
    await this.init();
    const id = 'stl-' + Date.now();
    const now = new Date().toISOString();

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO settlements (id, group_id, payer_id, payee_id, amount_paise, currency, status, notes, confirmed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.groupId,
          input.payerId,
          input.payeeId,
          input.amountPaise,
          input.currency || 'INR',
          'CONFIRMED',
          input.notes || null,
          now,
          now,
        ]
      );

      await this.addActivity(
        input.groupId,
        'SETTLEMENT_RECORDED',
        `Recorded settlement of ${formatCurrency(input.amountPaise, input.currency || 'INR')}`
      );
      return;
    }

    // Web fallback
    const raw = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    const existing = raw ? JSON.parse(raw) : [];
    const newStl = {
      id,
      group_id: input.groupId,
      payer_id: input.payerId,
      payee_id: input.payeeId,
      amount_paise: input.amountPaise,
      currency: input.currency || 'INR',
      status: 'CONFIRMED',
      notes: input.notes || null,
      confirmed_at: now,
      created_at: now,
    };
    await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'settlements', JSON.stringify([newStl, ...existing]));
  }

  // --- Activities CRUD ---
  async getActivities(groupId?: string): Promise<ActivityRow[]> {
    await this.init();
    if (this.db) {
      let query = `
        SELECT a.*, u.name as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
      `;
      const params: any[] = [];
      if (groupId) {
        query += ' WHERE a.group_id = ?';
        params.push(groupId);
      }
      query += ' ORDER BY a.created_at DESC LIMIT 30';
      return this.db.getAllAsync<ActivityRow>(query, params);
    }
    return [];
  }

  async addActivity(groupId: string, action: string, message: string): Promise<void> {
    if (!this.db) return;
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO activities (id, group_id, user_id, action, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`act-${Date.now()}`, groupId, CURRENT_USER.id, action, message, now]
    );
  }

  // --- User Profile ---
  async getUserProfile(): Promise<UserRow> {
    await this.init();
    if (this.db) {
      const row = await this.db.getFirstAsync<UserRow>(
        'SELECT * FROM users WHERE id = ?',
        [CURRENT_USER.id]
      );
      if (row) return row;
    }
    return {
      id: CURRENT_USER.id,
      email: CURRENT_USER.email,
      name: CURRENT_USER.name,
      avatar_url: CURRENT_USER.avatarUrl,
      upi_id: CURRENT_USER.upiId,
      currency_pref: 'INR',
      theme_pref: 'light',
      created_at: new Date().toISOString(),
    };
  }

  async updateUserProfile(updates: Partial<UserRow>): Promise<void> {
    await this.init();
    if (this.db) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      const setClause = keys.map((k) => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), CURRENT_USER.id];
      await this.db.runAsync(`UPDATE users SET ${setClause} WHERE id = ?`, values);
    }
  }

  private async initWebFallback(): Promise<void> {
    const groups = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'groups');
    if (!groups) {
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'groups', JSON.stringify([]));
    }
    const expenses = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'expenses');
    if (!expenses) {
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'expenses', JSON.stringify([]));
    }
    const documents = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'documents');
    if (!documents) {
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'documents', JSON.stringify([]));
    }
    const settlements = await AsyncStorage.getItem(WEB_STORAGE_PREFIX + 'settlements');
    if (!settlements) {
      await AsyncStorage.setItem(WEB_STORAGE_PREFIX + 'settlements', JSON.stringify([]));
    }
  }
}

export const dbService = new DatabaseService();
