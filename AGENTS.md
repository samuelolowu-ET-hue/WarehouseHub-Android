# WarehouseHub — Agent Operating Rules

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## 1. Mission

Continue the existing WarehouseHub Android application. Implement, test, debug, and prepare the application for release without unnecessarily disrupting working functionality.

The agent should do the work, not merely provide instructions or code snippets for the user to copy manually.

## 2. Non-Destructive Development Policy

**Preserving existing work is mandatory.**

* Inspect the repository before making changes.
* Read relevant source files before editing them.
* Check `git status` and preserve all existing user changes.
* Never assume that an existing file is disposable because it looks temporary or incomplete.
* Prefer small, targeted edits over replacing entire files.
* Do not delete working functionality to make a new feature easier to implement.
* Do not overwrite user-created documentation, configuration, assets, migrations, or source files without understanding their purpose.
* Do not use destructive cleanup commands.
* Never run `git reset --hard`, `git clean -fd`, `git checkout -- .`, or equivalent destructive commands.
* Never rewrite Git history, force-push, or discard uncommitted work.
* Do not delete branches, repositories, or project directories.
* Do not remove dependencies or restructure directories without a documented technical reason.
* Do not downgrade or upgrade major dependencies arbitrarily.
* Do not overwrite files using generated scaffolding when a project already exists.
* Do not remove tests merely to make a build pass.
* Do not hide failures by weakening TypeScript, linting, tests, validation, or security controls.

## 3. Approval Required for High-Impact Actions

Do not perform these actions without explicit user approval for the specific operation:

* Deleting or overwriting substantial existing source code or assets.
* Destructive Git operations or history rewriting.
* Dropping tables, deleting records, truncating data, or altering production data.
* Applying database migrations to a remote or production database.
* Changing or removing Row Level Security policies or database grants.
* Changing Supabase project configuration, authentication settings, or production secrets.
* Deploying to production.
* Publishing an application release or submitting it to an app store.
* Rotating, revoking, or replacing credentials.
* Making irreversible changes to cloud resources or external services.
* Running scripts whose effects on project files, databases, or external systems are unclear.

Before asking for approval, explain:

1. The exact action proposed.
2. The reason it is necessary.
3. The files, records, or services it may affect.
4. The risk and rollback plan.

Continue with other independent, safe tasks while waiting for approval.

## 4. Safe Actions Allowed Without Additional Approval

The agent may independently:

* Inspect files and repository structure.
* Read package manifests, source code, migrations, and documentation.
* Run non-destructive diagnostics and tests.
* Run TypeScript, lint, Expo, and build checks.
* Create new source files when needed.
* Make focused, reversible source-code changes.
* Add or update tests.
* Fix compile errors and runtime bugs.
* Add documentation.
* Add non-secret environment-variable placeholders to `.env.example`.
* Review dependencies and report security findings.
* Create a local branch or checkpoint when safe and appropriate.
* Use local emulators or development builds when available.
* Generate local build artifacts without publishing them.

Before editing existing files, inspect their current contents and preserve unrelated changes.

## 5. Git and Recovery

* Check `git status` before editing.
* Inspect existing diffs before modifying already changed files.
* Never assume all uncommitted changes belong to the agent.
* Do not automatically commit or push changes.
* Before a substantial refactor, propose a recovery point and identify the files that will change.
* If a Git checkpoint is created, do not stage unrelated user files or secrets.
* Keep changes scoped and reviewable.
* Report modified, created, and deleted files after each milestone.
* If a change breaks the app, diagnose and repair it without discarding unrelated user work.

## 6. Secrets and Environment

* Never display or print `.env`, `.env.local`, credentials, access tokens, refresh tokens, private keys, or service-role keys.
* Never commit environment files containing secrets.
* Preserve `.gitignore` protections.
* Never place Supabase service-role keys or server-side email/payment credentials in mobile code.
* Use only the public/anonymous Supabase key in the Android client.
* Check environment configuration without revealing secret values.
* Do not upload secrets or private data into logs, prompts, screenshots, or external services.

## 7. Supabase and Database Safety

* Inspect the actual schema, migrations, generated types, grants, and RLS policies before changing database-dependent code.
* Treat the existing Supabase project as persistent user data, not a disposable development database.
* Do not seed, reset, delete, or mutate remote data simply to test a feature.
* Do not disable RLS to bypass authorization problems.
* Do not apply remote migrations without explicit approval.
* Prefer reviewed SQL migration files and local tests where possible.
* Never trust the mobile client for authoritative prices, order totals, discounts, stock, payment status, or ownership.
* Verify authorization for profiles, carts, orders, and order items.
* Document any required manual dashboard or deployment configuration.

## 8. Dependency and Build Safety

* Inspect installed versions before changing dependencies.
* Follow Expo-compatible dependency versions (use `npx expo install`, see section 12).
* Never run `npm audit fix --force`.
* Do not remove a package just because an audit flags it; investigate compatibility and remediation options.
* Review dependency changes and lockfile diffs.
* Do not claim a build succeeded unless the command actually completed successfully.

## 9. Engineering Quality

* Preserve working features.
* Make small, cohesive changes.
* Run appropriate checks after meaningful changes.
* Fix root causes instead of suppressing errors.
* Use generated database types.
* Handle loading, error, empty, and success states.
* Keep public catalogue access separate from authenticated account operations.
* Implement functional controls, not decorative placeholders.
* Test security failures as well as successful paths.
* Do not claim a feature is complete merely because its screen renders.

## 10. Execution and Reporting

Work through the project milestones in sequence and continue automatically when no approval is needed.

After each milestone, report:

* What changed.
* Files created, modified, or deleted.
* Checks actually run and their results.
* Known issues and unresolved risks.
* Any action requiring user approval.

Do not stop after producing a plan. Implement the next safe task.

If blocked by a high-impact action, ask for approval for that action only and continue with independent work.

## 11. Definition of Done

A feature is complete only when its implementation has been inspected, relevant checks have been run, errors have been addressed, and any remaining limitations have been disclosed.

Never claim tests, security audits, deployments, or builds succeeded without evidence.

---

## 12. Expo Technical Guidance

### Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

### Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

### Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

> **Note (current repository state):** Route files currently live in the root `app/` directory (`app/_layout.tsx`, `app/(auth)/`, `app/(shop)/`), with non-route code in `src/` (`src/features`, `src/lib`, `src/providers`). Follow the existing layout; do not move routes between `app/` and `src/app/` without user approval (see section 2).

### Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples. `eas submit` and production `eas update` require approval (section 3).
Docs: https://docs.expo.dev/eas/index.md

### Native Project Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
