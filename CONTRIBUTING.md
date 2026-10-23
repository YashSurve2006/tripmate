# Contributing to TripMate

Thank you for your interest in contributing to TripMate! We welcome code contributions, issue reports, documentation improvements, and design feedback.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `v20.x` or later
- **npm**: `v10.x` or later
- **JDK**: OpenJDK 21 (for building the Android APK)
- **Android SDK**: Build tools 35.0.0, Platform API 35

### Clone & Install
```bash
git clone https://github.com/YashSurve2006/tripmate.git
cd tripmate

# Install all workspace dependencies
npm install
npm --prefix packages/shared install
npm --prefix apps/backend install
npm --prefix apps/mobile install
```

---

## 🧪 Testing & Validation

Before submitting any Pull Request, you must verify that all type checks and test suites pass cleanly:

```bash
# 1. Run TypeScript typecheck across all workspaces
npm run typecheck

# 2. Run the full test suite (Unit, Backend & E2E)
npm test
```

---

## 📦 Pull Request Process

1. **Fork** the repository and create your feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit** your changes following Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`).
3. Ensure no local secrets, `.env` files, or binary APKs are staged.
4. Push to your fork and submit a Pull Request against the `main` branch.
5. GitHub Actions CI will automatically test your PR against Node.js 20.

---

## 📜 Code Style Guidelines

- Maintain strict TypeScript type annotations; avoid `any`.
- Keep financial arithmetic in integer minor units (**paise**). Never store monetary values as raw floating-point numbers.
- Preserve offline autonomy: features should work without internet connectivity unless explicitly documented as a remote sync capability.
