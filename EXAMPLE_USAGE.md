# Browserbase Component - Example Usage

This document shows how to use the Browserbase component to run browser
automation jobs in Convex.

## Architecture (Resend Pattern)

The component follows the
[Resend pattern](https://docs.convex.dev/production/integrations/resend):

1. **User schedules a job** via `api.browserbase.scheduleJob()`
2. **Component creates Browserbase session** via API
3. **Component calls user's automation action** with `connectUrl`
4. **User performs automation** using Playwright, Puppeteer, etc.
5. **User reports success/failure** back to component
6. **Component cleans up session** (REQUEST_RELEASE)

## Setup

### 1. Install Dependencies

In your example app:

```bash
cd example
npm install playwright-core convex
```

Note: We use `playwright-core` (not `playwright`) because we don't need bundled
browsers - we're connecting to Browserbase's cloud browsers.

### 2. Configure Environment Variables

Create `example/.env.local`:

```bash
BROWSERBASE_API_KEY=your_api_key_here
BROWSERBASE_PROJECT_ID=your_project_id_here
CONVEX_DEPLOYMENT=your_convex_deployment  # From convex.dev dashboard
```

Get your Browserbase credentials from: https://browserbase.com/dashboard

### 3. Install the Component

In your `example/convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import browserbase from "@convex-dev/browserbase/convex.config";

const app = defineApp();
app.use(browserbase, { name: "browserbase" });

export default app;
```

## Usage

### Basic Example: Scrape a Page

**Step 1:** Create your automation action (example/convex/browserAutomation.ts)

```typescript
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const scrapePageAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({ url: v.string() }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      // Import Playwright
      const { chromium } = await import("playwright-core");

      // Connect to Browserbase session
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = (await browser.contexts())[0].pages()[0];

      // Do automation
      await page.goto(params.url);
      const title = await page.title();

      await browser.close();

      // Report success
      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { title },
        metrics: { duration: Date.now() },
      });
    } catch (error: any) {
      // Report failure
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
```

**Step 2:** Schedule the job from your app

```typescript
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const schedulePageScrape = mutation({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { url },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.browserAutomation.scrapePageAction",
      maxRetries: 2,
    });

    return { jobId };
  },
});
```

**Step 3:** Track job status (reactive!)

```typescript
import { query } from "./_generated/server";
import { api } from "./_generated/api";

export const getJobStatus = query({
  args: { jobId: v.id("browserbase:jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
  },
});
```

From your React app:

```typescript
const status = useQuery(api.example.getJobStatus, { jobId });

// status will be:
// { status: "pending" | "running" | "completed" | "failed", result: {...}, ... }
```

## Advanced Examples

### Form Filling

```typescript
export const fillFormAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      url: v.string(),
      email: v.string(),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      await page.goto(params.url);
      await page.fill('input[name="email"]', params.email);
      await page.click('button[type="submit"]');

      await browser.close();

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { success: true },
        metrics: { duration: Date.now() },
      });
    } catch (error: any) {
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
```

### Batch Processing

```typescript
export const scheduleBatchScrape = mutation({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, { urls }) => {
    const jobIds = [];

    for (const url of urls) {
      const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
        params: { url },
        config: {
          apiKey: process.env.BROWSERBASE_API_KEY!,
          projectId: process.env.BROWSERBASE_PROJECT_ID!,
        },
        userAction: "internal.browserAutomation.scrapePageAction",
      });
      jobIds.push(jobId);
    }

    return { jobIds };
  },
});
```

## API Reference

### Component Public API

**`api.browserbase.scheduleJob(args)`**

Schedule a new browser automation job.

- `params: any` - Your custom parameters (passed to user action)
- `config: { apiKey, projectId }` - Browserbase credentials
- `userAction: string` - Reference to your action (e.g.,
  "internal.myModule.myAction")
- `sessionOptions?: { timeout, keepAlive, region, proxies }` - Optional
  Browserbase session config
- `maxRetries?: number` - Number of retry attempts (default: 0)
- `webhookUrl?: string` - Optional webhook for job completion

Returns: `jobId: Id<"browserbase:jobs">`

**`api.browserbase.getJobStatus({ jobId })`**

Get job status (reactive query).

Returns:

```typescript
{
  id: Id<"browserbase:jobs">,
  status: "pending" | "running" | "completed" | "failed" | "cancelled",
  result?: any,
  error?: string,
  session?: { connectUrl: string, status: string },
  // ... timing info
}
```

**`api.browserbase.listJobs({ status?, limit? })`**

List jobs with optional filtering.

**`api.browserbase.cancelJob({ jobId })`**

Cancel a running job.

**`api.browserbase._completeJob({ jobId, result, metrics })`** (Internal)

Called by user action to report success.

**`api.browserbase._failJob({ jobId, error })`** (Internal)

Called by user action to report failure.

## Session Configuration

```typescript
sessionOptions: {
  timeout: 300000,        // Session timeout (ms)
  keepAlive: false,       // Keep session alive after completion
  region: "us-west-2",    // us-west-2, us-east-1, eu-central-1, ap-southeast-1
  proxies: true,          // Enable residential proxies
}
```

## Debugging

### View Session in Browserbase Dashboard

1. Get the job status:
   ```typescript
   const job = await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
   ```
2. The session details include `connectUrl` and session ID
3. Go to https://browserbase.com/sessions to view live sessions and recordings

### Check Logs

Component logs are visible in Convex dashboard logs:

```
[Executor] Starting job <jobId>
[Executor] Session <sessionId> created with connectUrl: ...
[User Action] Connecting to Browserbase: ...
[User Action] Job <jobId> completed successfully
```

## Testing Locally

1. Start Convex dev:

   ```bash
   cd example
   npx convex dev
   ```

2. Test with Convex dashboard:
   - Go to http://localhost:3000 (or your Convex dashboard URL)
   - Run `api.example.schedulePageScrape({ url: "https://example.com" })`
   - Watch logs for execution
   - Check job status with the returned `jobId`

## Cost Optimization

- **Set appropriate timeouts**: Don't let sessions run longer than needed
- **Use REQUEST_RELEASE**: The component automatically cleans up sessions
- **Batch wisely**: Don't schedule too many concurrent jobs
- **Monitor failed jobs**: Failed jobs still consume Browserbase minutes

## Troubleshooting

**Error: "Session not found"**

- Check your Browserbase credentials in `.env.local`
- Verify project ID matches your Browserbase project

**Error: "playwright-core not found"**

- Install Playwright: `npm install playwright-core`

**Job stuck in "running" state**

- Check if your user action is calling `_completeJob` or `_failJob`
- Check Convex logs for errors
- Check Browserbase dashboard for session status

**Timeout errors**

- Increase `sessionOptions.timeout` for longer operations
- Add explicit waits in your Playwright code

## Next Steps

- See `example/convex/browserAutomation.ts` for more examples
- See `example/convex/example.ts` for usage patterns
- Check out the Browserbase docs: https://docs.browserbase.com
- Check out the Convex component docs:
  https://docs.convex.dev/production/components
