# Changelog

All notable changes to the TripMate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
