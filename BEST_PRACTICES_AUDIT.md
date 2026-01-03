# Convex Component Best Practices Audit

**Date:** January 2, 2026 **Component:** @convex-dev/browserbase

## ✅ What We're Doing Right

### Core Structure

- ✅ Proper component folder structure with `convex.config.ts`
- ✅ Component-specific `_generated/` directory
- ✅ Using component's own function builders from `./_generated/server.js`
- ✅ Proper `.js` extensions for ESM (NodeNext module resolution)

### Environment Variables

- ✅ **CORRECT**: Passing config as arguments, not using `process.env` in
  component
- ✅ Users pass `{ apiKey, projectId }` explicitly

### Authentication

- ✅ **CORRECT**: Not using `ctx.auth` in component
- ✅ Users handle auth in app, pass identifiers to component

### ID Types

- ✅ Aware that `Id` types become strings at component boundary
- ✅ Using `v.id("tableName")` validators appropriately

### Function Visibility

- ✅ Public functions exported from `public.ts`
- ✅ Internal functions use `internal` from component's API

## ❌ What Needs Improvement

### 1. Missing Return Validators ❌ **CRITICAL**

**Issue:** Public functions don't have `returns:` validators.

**Best Practice Says:**

> "All public component functions should have argument and return validators.
> Otherwise, the argument and return values will be typed as `any`."

**Current State:**

```typescript
export const scheduleJob = mutation({
  args: { ... },
  // ❌ Missing: returns: v.id("jobs"),
  handler: async (ctx, args) => { ... }
});
```

**Impact:** Return values typed as `any`, losing type safety.

---

### 2. Missing Client Wrapper Code ❌ **IMPORTANT**

**Issue:** No client code in `src/client/index.ts`.

**Best Practice Says:**

> "You can hide calls to the component's functions behind a more ergonomic
> client API that runs within the app's environment and calls into the
> component."

**Current State:**

```typescript
// Users have to do this:
await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url },
  config: {
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  },
  userAction: "internal.browserAutomation.scrapePageAction",
  maxRetries: 2,
});
```

**Should Be:**

```typescript
// With client wrapper:
const browserbase = new Browserbase(components.browserbase);
await browserbase.scheduleJob(ctx, {
  params: { url },
  userAction: "internal.browserAutomation.scrapePageAction",
  maxRetries: 2,
});
// Config comes from environment automatically
```

**Recommended Pattern:** Class-based client (like Workpool, RAG components)

---

### 3. Missing NPM Package Exports ❌ **CRITICAL**

**Issue:** `package.json` missing required exports.

**Best Practice Says:**

> "When publishing a component on NPM, you will need to expose all the relevant
> entry points"

**Missing Exports:**

```json
{
  "exports": {
    ".": { ... },
    "./convex.config": { ... },
    // ❌ Missing:
    "./_generated/component": {
      "types": "./dist/component/_generated/component.d.ts",
      "default": "./dist/component/_generated/component.js"
    },
    "./test": {
      "types": "./src/test.ts",
      "default": "./src/test.ts"
    }
  }
}
```

---

### 4. Missing Test Infrastructure ❌ **IMPORTANT**

**Issue:** No `convex-test` based tests.

**Best Practice Says:**

> "To test components, you can use the `convex-test` library."

**Current State:**

- ✅ Have standalone tests (`test-component.ts`)
- ❌ No `convex-test` based tests
- ❌ No test helpers exported

**Should Have:**

```typescript
// src/test.ts
export function register(t: TestConvex, name = "browserbase") {
  t.registerComponent(name, schema, modules);
}
```

---

### 5. No Static Configuration Pattern ⚠️ **OPTIONAL**

**Issue:** Passing config to every job call.

**Best Practice Suggests:**

> "A common pattern to track configuration in a component is to have a 'globals'
> table with a single document that contains the configuration."

**Current Pattern:**

```typescript
// Every call requires config
await ctx.runMutation(api.browserbase.scheduleJob, {
  config: { apiKey, projectId }, // ← Repeated every time
  params: { url },
  ...
});
```

**Alternative Pattern:**

```typescript
// One-time setup
await browserbase.configure(ctx, {
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
});

// Then just use it
await browserbase.scheduleJob(ctx, { params: { url } });
```

**Note:** Current pattern is fine, but globals table would be more ergonomic.

---

### 6. Package Name Mismatch ⚠️ **MINOR**

**Issue:** Package name is `@convex-dev/stagehand` but component is for
Browserbase.

**Should Be:** `@convex-dev/browserbase`

---

## 📋 Priority Fixes

### High Priority (Required for NPM publication)

1. **Add return validators to all public functions**
2. **Create client wrapper code** (`src/client/index.ts`)
3. **Fix package.json exports** (add \_generated/component and /test)
4. **Create test helpers** (`src/test.ts`)

### Medium Priority (Improves DX)

5. **Add convex-test based tests**
6. **Consider globals table for config** (optional but better UX)

### Low Priority (Nice to have)

7. **Fix package name** (stagehand → browserbase)

---

## 📊 Score Card

| Category         | Score   | Notes                      |
| ---------------- | ------- | -------------------------- |
| Structure        | ✅ 100% | Perfect structure          |
| Environment Vars | ✅ 100% | Correctly passing as args  |
| Authentication   | ✅ 100% | No ctx.auth in component   |
| Validation       | ❌ 50%  | Missing return validators  |
| Client Code      | ❌ 0%   | No wrapper code            |
| Testing          | ❌ 30%  | No convex-test, no helpers |
| Package Exports  | ❌ 50%  | Missing key exports        |
| Documentation    | ✅ 100% | Excellent docs             |

**Overall:** 66% compliant

---

## 🎯 Action Plan

### Phase 1: Critical Fixes (Required)

1. Add return validators to all public functions
2. Create `src/client/index.ts` with class-based client
3. Update `package.json` exports
4. Create `src/test.ts` with test helpers

### Phase 2: Testing (Recommended)

5. Add `convex-test` based tests
6. Document testing patterns

### Phase 3: Optional Improvements

7. Consider globals table pattern
8. Fix package name if publishing

---

## 📚 Reference Examples

Good examples to follow:

- [Workpool Component](https://github.com/get-convex/workpool) - Class-based
  client
- [RAG Component](https://github.com/get-convex/rag) - Pagination example
- [Migrations Component](https://github.com/get-convex/migrations) - Function
  handles
- [Template Component](https://github.com/get-convex/templates/tree/main/template-component) -
  Project structure

---

**Next Steps:** Fix high-priority issues before publishing to NPM.
