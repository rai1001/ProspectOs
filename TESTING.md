# Testing — ProspectOS

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence. Without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

- **Vitest** 4.x with jsdom environment
- **@testing-library/react** for component tests
- **@testing-library/jest-dom** for DOM assertions

## Run tests

```bash
npx vitest run          # single run
npx vitest              # watch mode
npx vitest run --coverage  # with coverage
```

## Test layers

| Layer | What | Where | When |
|-------|------|-------|------|
| Unit | Pure functions (scoring, apify transforms, validation, parsing) | `test/*.test.ts` | Every change |
| Component | React components (ScoreBadge, StatusBadge, forms) | `test/*.test.tsx` | UI changes |
| Integration | Hooks + Supabase mocks | `test/*.test.tsx` | Data flow changes |
| E2E | Full app via gstack browse | `.gstack/qa-reports/` | Pre-release |

## Test files

| File | What it covers | Tests |
|------|---------------|-------|
| `test/scoring.test.ts` | `calculateScore`, `scoreColor`, `scoreBorderLeft` | 14 |
| `test/apify.test.ts` | `transformApifyResult` — field mapping, sector inference | 5 |
| `test/security.test.ts` | `isValidPublicUrl` (SSRF), `isValidSpanishPhone`, `sanitizeForPrompt` | 19 |
| `test/share-cta.test.ts` | Share CTA: `agency_phone` from DB vs localStorage | 9 |
| `test/audit.test.ts` | `extractAuditableHTML` — head/body extraction, maxLen | 8 |
| `test/kit-parsing.test.ts` | `extractFirstJsonObject` — bracket counter vs greedy regex | 12 |
| **Total** | | **67** |

## Conventions

- Test files in `test/` directory, named `{module}.test.ts` or `{component}.test.tsx`
- Factory functions (`makeBusiness`, `makeRule`) for test data
- `describe` per function/component, `it` per behavior
- Assertions test real behavior, never just `toBeDefined()`
- Regression tests include attribution comment with issue ID
