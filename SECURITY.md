# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## 🔒 Data Architecture & Privacy Model

TripMate is designed with a strict **Offline-First, Privacy-First** principle:
- All database records (groups, expenses, payments, splits, members) are stored exclusively in the application's private SQLite sandbox on the user's Android device.
- No analytics trackers, telemetry collectors, or background sync services run by default.
- Exported Excel workbooks and document attachments remain on local storage unless the user explicitly chooses to share them through native Android share dialogs (e.g. WhatsApp, Google Drive, Email).

---

## 🛡️ Reporting a Vulnerability

If you discover a security vulnerability or sensitive data leakage risk within TripMate:

1. **Do not create a public issue** on GitHub.
2. Email your findings directly to **`yashsurve2019@gmail.com`** with the subject `[SECURITY] TripMate Vulnerability Report`.
3. Include detailed steps to reproduce the issue and potential remediation steps.
4. We will acknowledge receipt within 48 hours and work with you on a swift resolution.
