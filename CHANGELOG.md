# Changelog

All notable changes to the TripMate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
