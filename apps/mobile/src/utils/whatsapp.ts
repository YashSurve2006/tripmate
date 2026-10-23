import { Linking } from 'react-native';
import { formatCurrency } from './finance';

/**
 * Normalizes user-entered phone numbers for WhatsApp international format (wa.me/...).
 * Strips '+', spaces, dashes, brackets, and any other non-digit characters.
 * E.g.: "+91 88507 06982" -> "918850706982"
 * If a 10-digit number without country code is provided (e.g. "8850706982"),
 * automatically prepends India's '91' country code.
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    // 10-digit domestic Indian mobile number
    return '91' + digits;
  }

  return digits;
}

/**
 * Validates whether the given phone string can form a valid international WhatsApp recipient.
 * International E.164 phone numbers typically consist of 10 to 15 digits.
 */
export function isValidWhatsAppNumber(rawPhone: string): boolean {
  const normalized = normalizeWhatsAppNumber(rawPhone);
  return normalized.length >= 10 && normalized.length <= 15;
}

export interface ExpenseSplitWhatsAppParams {
  recipientName?: string;
  groupName: string;
  expenseTitle: string;
  totalAmountPaise: number;
  userSharePaise: number;
  payerName: string;
  currency?: string;
}

/**
 * Generates dynamic, formatted WhatsApp message for an expense split reminder.
 */
export function buildExpenseSplitMessage(params: ExpenseSplitWhatsAppParams): string {
  const {
    recipientName,
    groupName,
    expenseTitle,
    totalAmountPaise,
    userSharePaise,
    payerName,
    currency = 'INR',
  } = params;

  const greeting = recipientName && recipientName.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
  const totalFormatted = formatCurrency(totalAmountPaise, currency);
  const shareFormatted = formatCurrency(userSharePaise, currency);

  return `${greeting}

Here are the expense split details:

Group: ${groupName}
Expense: ${expenseTitle}
Total Bill: ${totalFormatted}

Your share: ${shareFormatted}
Paid by: ${payerName}

Please settle your share when convenient.

Thank you!`;
}

export interface SettlementReminderWhatsAppParams {
  recipientName?: string;
  groupName: string;
  debtorName: string;
  creditorName: string;
  amountPaise: number;
  currency?: string;
  isCreditorReminder?: boolean;
}

/**
 * Generates dynamic, formatted WhatsApp message for a settlement/debt reminder.
 */
export function buildSettlementReminderMessage(params: SettlementReminderWhatsAppParams): string {
  const {
    recipientName,
    groupName,
    debtorName,
    creditorName,
    amountPaise,
    currency = 'INR',
  } = params;

  const greeting = recipientName && recipientName.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
  const amountFormatted = formatCurrency(amountPaise, currency);

  return `${greeting}

Settlement reminder from ${groupName}:
${debtorName} owes ${creditorName} ${amountFormatted}.

Please settle your share when convenient.

Thank you!`;
}

/**
 * Constructs the official https://wa.me/ URL with safely URL-encoded message text.
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encodedText}`;
}

/**
 * Opens WhatsApp chat directly using React Native Linking.
 * Provides fallback to web URL if deep link or app scheme encounters an issue.
 */
export async function openWhatsAppChat(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidWhatsAppNumber(phoneNumber)) {
    return {
      success: false,
      error: 'Please enter a valid phone number (at least 10 digits).',
    };
  }

  const normalized = normalizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://wa.me/${normalized}?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) {
      await Linking.openURL(waUrl);
      return { success: true };
    } else {
      // Fallback web url
      const webUrl = `https://api.whatsapp.com/send?phone=${normalized}&text=${encodedText}`;
      await Linking.openURL(webUrl);
      return { success: true };
    }
  } catch (err: any) {
    // If opening failed, try web fallback directly
    try {
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${normalized}&text=${encodedText}`;
      await Linking.openURL(fallbackUrl);
      return { success: true };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: err?.message || 'Could not launch WhatsApp. Please check if WhatsApp is installed.',
      };
    }
  }
}
