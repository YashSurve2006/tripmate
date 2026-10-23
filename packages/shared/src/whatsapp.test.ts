import {
  buildExpenseSplitMessage,
  buildSettlementReminderMessage,
  buildWhatsAppUrl,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
} from './whatsapp';

describe('WhatsApp Integration & Phone Normalization', () => {
  describe('normalizeWhatsAppNumber', () => {
    it('correctly normalizes international number "+91 88507 06982" to "918850706982"', () => {
      const input = '+91 88507 06982';
      const normalized = normalizeWhatsAppNumber(input);
      expect(normalized).toBe('918850706982');
      expect(normalized).not.toContain('+');
      expect(normalized).not.toContain(' ');
    });

    it('normalizes domestic 10-digit number with default country code "91"', () => {
      const input = '88507 06982';
      const normalized = normalizeWhatsAppNumber(input);
      expect(normalized).toBe('918850706982');
    });

    it('cleans brackets, hyphens, and spaces from phone numbers', () => {
      const input = '+1 (555) 234-5678';
      const normalized = normalizeWhatsAppNumber(input);
      expect(normalized).toBe('15552345678');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeWhatsAppNumber('')).toBe('');
    });
  });

  describe('isValidWhatsAppNumber', () => {
    it('validates legitimate numbers', () => {
      expect(isValidWhatsAppNumber('+91 88507 06982')).toBe(true);
      expect(isValidWhatsAppNumber('918850706982')).toBe(true);
      expect(isValidWhatsAppNumber('8850706982')).toBe(true);
      expect(isValidWhatsAppNumber('+14155552671')).toBe(true);
    });

    it('rejects numbers that are too short or invalid', () => {
      expect(isValidWhatsAppNumber('12345')).toBe(false);
      expect(isValidWhatsAppNumber('')).toBe(false);
      expect(isValidWhatsAppNumber('abc')).toBe(false);
    });
  });

  describe('buildExpenseSplitMessage', () => {
    it('generates accurate, dynamic split message without hardcoded sample data', () => {
      const message = buildExpenseSplitMessage({
        recipientName: 'Yash',
        groupName: 'Goa Trip',
        expenseTitle: 'Hotel Booking',
        totalAmountPaise: 100000, // ₹1,000.00
        userSharePaise: 30000, // ₹300.00
        payerName: 'Member A',
        currency: 'INR',
      });

      expect(message).toContain('Hi Yash,');
      expect(message).toContain('Group: Goa Trip');
      expect(message).toContain('Expense: Hotel Booking');
      expect(message).toContain('Total Bill: ₹1,000.00');
      expect(message).toContain('Your share: ₹300.00');
      expect(message).toContain('Paid by: Member A');
      expect(message).toContain('Please settle your share when convenient.');
    });

    it('handles recipient without name gracefully', () => {
      const message = buildExpenseSplitMessage({
        groupName: 'Manali Expedition',
        expenseTitle: 'Jeep Safari',
        totalAmountPaise: 500000,
        userSharePaise: 125000,
        payerName: 'Rohan',
      });

      expect(message).toContain('Hi,');
      expect(message).toContain('Group: Manali Expedition');
      expect(message).toContain('Your share: ₹1,250.00');
    });
  });

  describe('buildSettlementReminderMessage', () => {
    it('generates dynamic settlement debt reminder message', () => {
      const message = buildSettlementReminderMessage({
        recipientName: 'Yash',
        groupName: 'Goa Trip',
        debtorName: 'Yash',
        creditorName: 'Member A',
        amountPaise: 30000,
        currency: 'INR',
      });

      expect(message).toContain('Hi Yash,');
      expect(message).toContain('Settlement reminder from Goa Trip:');
      expect(message).toContain('Yash owes Member A ₹300.00.');
      expect(message).toContain('Please settle your share when convenient.');
    });
  });

  describe('buildWhatsAppUrl', () => {
    it('constructs valid https://wa.me/ URL with safely encoded query parameters', () => {
      const rawPhone = '+91 88507 06982';
      const message = `Hi Yash,\nYour share is ₹300.00.`;
      const url = buildWhatsAppUrl(rawPhone, message);

      expect(url.startsWith('https://wa.me/918850706982?text=')).toBe(true);
      expect(url).not.toContain('+');
      expect(url).not.toContain(' ');
      // ₹ symbol is safely percent-encoded
      expect(url).toContain(encodeURIComponent('₹300.00'));
      expect(url).toContain(encodeURIComponent('\n'));
    });
  });
});
