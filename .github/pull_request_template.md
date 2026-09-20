## Verification

- [ ] Verified locally (features / build / regression)

## Frontend Standards Full Checklist (required)

> Standards: `docs/FRONTEND_STANDARDS.md`
>
> Comment standards: `docs/COMMENT_STANDARDS.md`
>
> The following 6 items are author self-checks. The `PR Code Quality Review` workflow reports their status but does not fail on unchecked items.
>
> That workflow runs a limited set of hard-coded pattern checks on selected changed frontend files. It does not execute ESLint, Stylelint, HTML Validate, or `npm run lint:all`; a PASS is not full standards validation.
>
> Run `npm run lint:all` locally for ESLint, CSS/SCSS, HTML, and i18n checks. Use `npm run lint:report` or `npm run lint:report:json` to save ESLint results in `reports/` (created automatically, including on lint failure).

- [ ] STD-1-HTML Verified all clauses in docs/FRONTEND_STANDARDS.md Chapter 1 HTML Standards
- [ ] STD-2-CSS Verified all clauses in docs/FRONTEND_STANDARDS.md Chapter 2 CSS Standards
- [ ] STD-3-JSTS Verified all clauses in docs/FRONTEND_STANDARDS.md Chapter 3 JavaScript / TypeScript Standards
- [ ] STD-4-REACT Verified all clauses in docs/FRONTEND_STANDARDS.md Chapter 4 React Standards
- [ ] STD-5-NEXT Verified all clauses in docs/FRONTEND_STANDARDS.md Chapter 5 Next.js Standards (if applicable)
- [ ] STD-COMMENT Verified all clauses in docs/COMMENT_STANDARDS.md

## Impact Scope

- [ ] Renderer (`src/renderer`)
- [ ] Main Process (`src/main`)
- [ ] Preload (`src/preload`)
- [ ] Docs / Workflows
- [ ] Other:
