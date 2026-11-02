# Changelog

All notable changes to the TripMate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-11-02

### Added
- **Partial Settlement Support**: Enter custom repayment amounts or use quick percentage presets (25%, 50%, 75%, Full) to settle debts incrementally without requiring all-at-once payment.
- **Instant & Confirmation Settlement Modes**: Option to instantly apply payments or send formal confirmation requests requiring recipient verification before updating ledger balances.
- **Debt Reservation Engine**: Atomic reservation of pending debt amounts to mathematically prevent duplicate, overlapping, or exceeding settlement requests.
- **Recipient Decision Controls**: Secure recipient-only action sheet to review, confirm, or reject pending settlement requests with audit activity logging.
- **Production Android Release v1.2.0 (versionCode 3)**: Standalone release APK built and verified with exact package name (`com.tripmate.app`) and identical certificate fingerprint for zero-data-loss in-place updates.
- **Full Test Suite & Validation**: 141 passing tests (40 shared, 4 backend, 97 E2E) and clean TypeScript type checks across all workspaces.

## [1.1.0] - 2026-10-24

### Added
- **Custom Amount-Wise Expense Splitting**: Full support for custom split allocations across members with real-time paise balance validation, visual remaining indicator badges, percentage / shares breakdown, and zero-share member exclusion.
- **Dynamic Group Member Management**: Add members on-the-fly directly by name without invite codes or phone barriers; edit roles, nicknames, and contact info; and safely archive historical transaction participants without corrupting balance audits.
- **Safe Group Deletion & Record Cleanup**: Cascading deletion dialog allowing users to wipe group expenses, splits, and attached documents while strictly safeguarding global user profiles and other groups.
- **WhatsApp Bill Splitting & Settlement Reminders**: One-tap WhatsApp breakdown sharing (`wa.me/` deep linking) with dynamic emoji formatting, amount calculations, and international phone number normalization (E.164 and Indian 10-digit formats).
- **Official Brand App Launcher Icons**: High-resolution branded Android adaptive launcher icons (foreground + background layers) and iOS icons configured from official brand assets.
- **Production Android Build v1.1.0 (versionCode 2)**: Recompiled standalone universal release APK with brand launcher icon, updated manifest, and offline performance optimizations.
- **Comprehensive 97-Test Suite**: 40 shared unit tests, 4 backend financial reconciliation tests, and 53 end-to-end integration tests validating financial invariants and zero-sum balances.

## [1.0.0] - 2026-10-23

### Added
- **100% Offline SQLite Architecture**: On-device database schema using `expo-sqlite` with zero mandatory cloud accounts or external dependencies.
- **Exact Minor-Unit Arithmetic**: Paise-precision calculations across split algorithms preventing IEEE-754 floating-point rounding errors.
- **Greedy Debt Simplification**: `simplifyDebts()` algorithm to reduce multi-party debt networks into the minimum bilateral transfers.
- **10-Sheet Excel Workbook Export**: Comprehensive OpenXML `.xlsx` export featuring executive KPIs, expense ledgers with genuine `=SUM()` formulas, member balance sheets, and receipt indices.
- **Bills & Documents Vault**: Local file vault supporting Camera capture, Image Gallery pick, and PDF attachments isolated per group.
- **Responsive 2×2 Quick-Action Grid**: Redesigned mobile touch targets for Add Expense, Add Member, Excel Export, and Bill Upload.
- **Unified Currency Input**: Horizontally and vertically aligned ₹ currency symbol and amount field with Android `decimal-pad` keypad.
- **Dynamic Theme Engine**: Persistent Light, Dark, and OLED Dark Navy theme modes.
- **Standalone Android Release Build**: Configured Gradle 9 and Kotlin toolchain generating standalone APK for ARM64, ARMv7, x86, and x86_64 architectures.
- **Full Test Suite**: 27 unit & integration tests covering financial calculations, document isolation, and offline persistence, plus 40 Excel & member management E2E tests.
