# Known issues

Things that are true about this codebase on handover. None of these block using or deploying the app — see [ARCHITECTURE.md](ARCHITECTURE.md) for the rough edges specific to schema parsing.

## `tsconfig.app.json` has strict-mode checks disabled

`strict`, `noImplicitAny`, and `noUnusedLocals`/`noUnusedParameters` are all off — left over from the original template. Turning on `strictNullChecks` is likely the single highest-leverage type-safety improvement available, given how optional-chaining-heavy the parser code is, but flipping it could surface an unpredictable number of new errors across the whole codebase. Worth its own dedicated pass, not a quick flip.

## `Index.tsx` is a large, multi-purpose component

At ~650 lines, it owns schema fetching, all selection state, search filtering, and the download handlers for all three config generators. This concentration of responsibility is what allowed a real bug to slip through previously (inconsistent `Selection`-shape construction duplicated across three code paths — since fixed via `src/lib/buildSelection.ts`). Extracting `useSchemaData`/`useSelections` hooks would reduce that risk going forward, but is a real refactor with real risk of behavior drift — better done deliberately with its own test coverage than folded into an unrelated change.

## `graphTraversal.ts` has duplicated graph-traversal logic

`buildPathToEntity`/`buildPathToEntityBidirectional` and `getAllReachableWithPaths`/`getAllReachableBidirectional` are each two ~90%-duplicated implementations. Unifying them safely requires verifying the unidirectional case behaves identically as a special case of the bidirectional one — not a mechanical dedup.

## Dead fields in `types/schema.ts`

`Attribute.isReference` and `Attribute.referencesEntity` are declared but never set or read anywhere in the codebase. Safe to delete; just not done yet.

## `@typescript-eslint/no-unused-vars` is fully disabled

Set to `off` rather than tuned in `eslint.config.js`, so dead code (like the fields above) won't be caught by CI even though CI runs lint on every push.

## Main JS bundle is ~530KB (160KB gzipped)

Vite warns about this at build time. Not broken, just not code-split. Fixable later with `React.lazy` on routes/heavy components or manual chunking if load time becomes a concern.
