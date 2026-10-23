import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService, GroupDocumentRow, ActivityRow, GroupMemberRow } from './database';
import { CURRENT_USER } from './mockData';
import {
  ExportFilters,
  DetailedGroupReportData,
  ReportMemberSummary,
  ExportPreviewData,
} from './export/types';

export {
  GroupDocumentRow,
  ActivityRow,
  GroupMemberRow,
  ExportFilters,
  DetailedGroupReportData,
  ReportMemberSummary,
  ExportPreviewData,
};

const TOKEN_STORAGE_KEY = '@tripmate:auth_token';
const USER_STORAGE_KEY = '@tripmate:user_profile';

/**
 * TripMate Offline-First Repository Service
 * Backed by persistent SQLite on Android device and browser AsyncStorage fallback.
 * Zero dependency on Node.js server, Docker, Postgres, or Metro.
 */
export class OfflineFirstRepository {
  public isOfflineOnly = true;
  public remoteBackendConfigured = false;

  async init(): Promise<void> {
    await dbService.init();
  }

  // --- Auth & Session (Stored Locally) ---
  async login(email: string, password: string): Promise<any> {
    await this.init();
    const user = await dbService.getUserProfile();
    const updatedUser = {
      ...user,
      email: email.trim().toLowerCase(),
      name: email.split('@')[0] || user.name,
    };
    await dbService.updateUserProfile(updatedUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'local_device_session_' + Date.now());
    return { user: updatedUser, token: 'local_device_session' };
  }

  async register(name: string, email: string, password: string, upiId?: string): Promise<any> {
    await this.init();
    const newUser = {
      id: CURRENT_USER.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      upi_id: upiId ? upiId.trim() : null,
      currency_pref: 'INR',
      theme_pref: 'light',
      created_at: new Date().toISOString(),
    };
    await dbService.updateUserProfile(newUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'local_device_session_' + Date.now());
    return { user: newUser, token: 'local_device_session' };
  }

  async getCurrentUser(): Promise<any> {
    await this.init();
    const user = await dbService.getUserProfile();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      upiId: user.upi_id,
      avatarUrl: user.avatar_url,
      currencyPref: user.currency_pref,
    };
  }

  setToken(token: string | null): void {
    if (token) {
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  // --- Group Management (Persistent in SQLite) ---
  async getGroups(): Promise<any[]> {
    await this.init();
    return dbService.getGroups();
  }

  async getGroupById(groupId: string): Promise<any> {
    await this.init();
    return dbService.getGroupById(groupId);
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
    return dbService.createGroup(input);
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.init();
    return dbService.deleteGroup(groupId);
  }

  async clearGroupExpenses(groupId: string): Promise<void> {
    await this.init();
    return dbService.clearGroupExpenses(groupId);
  }

  // --- Manual Group Member Management ---

  async getGroupMembers(groupId: string, includeArchived?: boolean): Promise<ReportMemberSummary[]> {
    await this.init();
    return dbService.getGroupMembers(groupId, includeArchived);
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
    return dbService.addGroupMember(groupId, input);
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
    return dbService.updateGroupMember(groupId, userId, updates);
  }

  async removeGroupMember(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean; archived: boolean; message: string }> {
    await this.init();
    return dbService.removeGroupMember(groupId, userId);
  }

  // --- Financial Reporting & Extraction ---
  async getGroupDetailedReport(groupId: string, filters?: ExportFilters): Promise<DetailedGroupReportData> {
    await this.init();
    return dbService.getGroupDetailedReport(groupId, filters);
  }

  // --- Expense Management ---
  async getExpenses(groupId?: string): Promise<any[]> {
    await this.init();
    return dbService.getExpenses(groupId);
  }

  async getExpenseById(id: string): Promise<any> {
    await this.init();
    return dbService.getExpenseById(id);
  }

  async createExpense(expenseInput: {
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
    customSplits?: { userId: string; amountPaise: number }[];
    notes?: string;
    attachedDocId?: string;
  }): Promise<any> {
    await this.init();
    return dbService.createExpense(expenseInput);
  }


  async deleteExpense(id: string): Promise<void> {
    await this.init();
    return dbService.deleteExpense(id);
  }

  // --- Group-Specific Document & Bill Management ---
  async getDocuments(
    groupId: string,
    options?: { category?: string; query?: string; expenseId?: string }
  ): Promise<GroupDocumentRow[]> {
    await this.init();
    return dbService.getDocuments(groupId, options);
  }

  async getDocumentById(id: string): Promise<GroupDocumentRow | null> {
    await this.init();
    return dbService.getDocumentById(id);
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
    return dbService.createDocument(input);
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
    return dbService.updateDocument(id, updates);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.init();
    return dbService.deleteDocument(id);
  }

  // --- Dynamic Dashboard Stats ---
  async getDashboardStats(range: 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME' = 'THIS_MONTH') {
    await this.init();
    return dbService.getDashboardStats(range);
  }

  // --- Settlements & Balances ---
  async createSettlement(input: {
    groupId: string;
    payerId: string;
    payeeId: string;
    amountPaise: number;
    currency?: string;
    notes?: string;
  }): Promise<void> {
    await this.init();
    return dbService.createSettlement(input);
  }

  async getSettlements(groupId: string): Promise<any[]> {
    await this.init();
    return dbService.getSettlements(groupId);
  }

  // --- Activities ---
  async getActivities(groupId?: string): Promise<ActivityRow[]> {
    await this.init();
    return dbService.getActivities(groupId);
  }

  async checkBackendHealth(): Promise<boolean> {
    return false;
  }
}

export const api = new OfflineFirstRepository();
