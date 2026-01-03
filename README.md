# @convex-dev/browserbase

A Convex component for running browser automation jobs using Browserbase cloud
browsers.

> **📚 New here?** Check out [SUMMARY.md](./SUMMARY.md) for a complete guide to
> all documentation, or jump to [FEATURES.md](./FEATURES.md) to see what's
> possible with **real, tested examples**!

## Features

- **Durable Execution**: Jobs survive server restarts and failures
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Session Management**: Automatic Browserbase session creation and cleanup
- **Progress Tracking**: Reactive queries for real-time job status
- **Webhook Support**: Get notified when jobs complete
- **Any Automation Tool**: Use Playwright, Puppeteer, or any CDP-compatible tool

## Architecture

This component follows the
[Resend pattern](https://docs.convex.dev/production/integrations/resend) for
external service integration:

1. User schedules a job via component API
2. Component creates Browserbase session
3. Component calls user's automation action with session URL
4. User performs automation (Playwright, Puppeteer, etc.)
5. User reports success/failure back to component
6. Component cleans up session automatically

## Installation

```bash
npm install @convex-dev/browserbase playwright-core
```

Note: We recommend `playwright-core` (not `playwright`) since you don't need
bundled browsers - Browserbase provides cloud browsers.

## Quick Start

### 1. Configure the Component

In your `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import browserbase from "@convex-dev/browserbase/convex.config";

const app = defineApp();
app.use(browserbase, { name: "browserbase" });

export default app;
```

### 2. Set Up Environment Variables

Create a `.env.local` file:

```bash
BROWSERBASE_API_KEY=your_api_key
BROWSERBASE_PROJECT_ID=your_project_id
```

Get your credentials from: https://browserbase.com/dashboard

### 3. Create Your Automation Action

Create `convex/browserAutomation.ts`:

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
      const page = browser.contexts()[0].pages()[0];

      // Do your automation
      await page.goto(params.url);
      const title = await page.title();

      await browser.close();

      // Report success to component
      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { title },
        metrics: { duration: Date.now() },
      });
    } catch (error: any) {
      // Report failure to component
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
```

### 4. Schedule Jobs

Create `convex/example.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const scheduleScrape = mutation({
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

export const getJobStatus = query({
  args: { jobId: v.id("browserbase:jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
  },
});
```

### 5. Use from Your App

```typescript
// Schedule a job
const { jobId } = await convex.mutation(api.example.scheduleScrape, {
  url: "https://example.com",
});

// Track status (reactive!)
const status = useQuery(api.example.getJobStatus, { jobId });
// status: { status: "pending" | "running" | "completed" | "failed", result: {...}, ... }
```

## API Reference

### `api.browserbase.scheduleJob(args)`

Schedule a browser automation job.

**Arguments:**

- `params: any` - Your custom parameters (passed to user action)
- `config: { apiKey: string, projectId: string }` - Browserbase credentials
- `userAction: string` - Reference to your action (e.g.,
  "internal.myModule.myAction")
- `sessionOptions?: object` - Optional Browserbase session configuration:
  - `timeout?: number` - Session timeout in milliseconds
  - `keepAlive?: boolean` - Keep session alive after completion
  - `region?: string` - "us-west-2" | "us-east-1" | "eu-central-1" |
    "ap-southeast-1"
  - `proxies?: boolean` - Enable residential proxies
- `maxRetries?: number` - Number of retry attempts (default: 0)
- `webhookUrl?: string` - Optional webhook URL for job completion

**Returns:** `jobId: Id<"browserbase:jobs">`

### `api.browserbase.getJobStatus({ jobId })`

Get job status (reactive query).

**Returns:**

```typescript
{
  id: Id<"browserbase:jobs">,
  status: "pending" | "running" | "completed" | "failed" | "cancelled",
  result?: any,
  error?: string,
  retryCount: number,
  maxRetries: number,
  createdAt: number,
  startedAt?: number,
  completedAt?: number,
  sessionDuration?: number,
  session?: {
    connectUrl: string,
    status: string,
  }
}
```

### `api.browserbase.listJobs({ status?, limit? })`

List jobs with optional filtering.

**Arguments:**

- `status?: "pending" | "running" | "completed" | "failed" | "cancelled"` -
  Filter by status
- `limit?: number` - Max results (default: 50)

### `api.browserbase.cancelJob({ jobId })`

Cancel a running job.

### Internal APIs (for user actions)

**`api.browserbase._completeJob({ jobId, result, metrics })`**

Called by user action to report successful completion.

**`api.browserbase._failJob({ jobId, error })`**

Called by user action to report failure.

## Real-World Examples (Tested & Working ✅)

The component includes production-ready examples that have been tested with live
websites:

### 1. HackerNews Top Stories Scraper

Extracts the top stories from HackerNews with rankings, titles, and scores.

```typescript
// convex/browserAutomation.ts
export const scrapeHackerNewsAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({ maxStories: v.optional(v.number()) }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      await page.goto("https://news.ycombinator.com", {
        waitUntil: "networkidle",
      });

      const stories = await page.evaluate((max) => {
        const items = Array.from(document.querySelectorAll(".athing")).slice(
          0,
          max,
        );
        return items.map((item) => ({
          rank: item.querySelector(".rank")?.textContent || "",
          title: item.querySelector(".titleline > a")?.textContent || "",
          url: item.querySelector(".titleline > a")?.getAttribute("href") || "",
          score:
            item.nextElementSibling?.querySelector(".score")?.textContent ||
            "N/A",
        }));
      }, params.maxStories || 5);

      await browser.close();

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { stories, count: stories.length },
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

// Schedule it:
const { jobId } = await convex.mutation(api.example.scrapeHackerNews, {
  maxStories: 5,
});
```

**Result:** Successfully extracts live HackerNews stories in ~10 seconds.

### 2. GitHub Repository Stats Scraper

Extracts repository information including stars, forks, and description.

```typescript
// convex/browserAutomation.ts
export const scrapeGitHubRepoAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({ owner: v.string(), repo: v.string() }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      await page.goto(`https://github.com/${params.owner}/${params.repo}`, {
        waitUntil: "networkidle",
      });

      // Extract repository info
      const name = await page.evaluate(() => {
        return (
          document.querySelector("title")?.textContent?.split(":")[0].trim() ||
          ""
        );
      });
      const stars = await page.evaluate(() => {
        const starLink = document.querySelector('a[href$="/stargazers"]');
        return starLink?.textContent?.match(/[\d,]+/)?.[0] || "0";
      });
      // ... more extraction

      await browser.close();

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { name, stars /* ... */ },
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

// Schedule it:
const { jobId } = await convex.mutation(api.example.scrapeGitHubRepo, {
  owner: "browserbase",
  repo: "stagehand",
});
```

**Result:** Successfully extracts GitHub repo data in ~8 seconds.

### 3. Batch Processing Multiple URLs

Process multiple jobs in parallel with progress tracking:

```typescript
// Schedule multiple jobs
export const scrapeManyPages = mutation({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, { urls }) => {
    const config = {
      apiKey: process.env.BROWSERBASE_API_KEY!,
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
    };

    const jobIds = [];
    for (const url of urls) {
      const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
        params: { url },
        config,
        userAction: "internal.browserAutomation.scrapePageAction",
        maxRetries: 2,
      });
      jobIds.push(jobId);
    }

    return { jobIds, total: jobIds.length };
  },
});

// Track batch progress (reactive!)
export const getBatchProgress = query({
  args: { jobIds: v.array(v.id("browserbase:jobs")) },
  handler: async (ctx, { jobIds }) => {
    const jobs = await Promise.all(
      jobIds.map((id) =>
        ctx.runQuery(api.browserbase.getJobStatus, { jobId: id }),
      ),
    );

    return {
      total: jobs.length,
      completed: jobs.filter((j) => j?.status === "completed").length,
      failed: jobs.filter((j) => j?.status === "failed").length,
      running: jobs.filter((j) => j?.status === "running").length,
    };
  },
});
```

### 4. Webhook Notifications

Get notified when jobs complete:

```typescript
const { jobId } = await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url: "https://example.com" },
  config: { apiKey, projectId },
  userAction: "internal.browserAutomation.scrapePageAction",
  webhookUrl: "https://myapp.com/webhook/job-complete", // ← Your webhook
  maxRetries: 3,
});

// Your webhook receives:
// POST https://myapp.com/webhook/job-complete
// {
//   event: "job.completed",
//   timestamp: 1234567890,
//   job: {
//     id: "job_id",
//     status: "completed",
//     result: { /* your data */ },
//     timing: { createdAt, startedAt, completedAt, durationMs }
//   }
// }
```

### 5. Automatic Retries with Exponential Backoff

```typescript
const { jobId } = await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url: "https://flaky-site.com" },
  config: { apiKey, projectId },
  userAction: "internal.browserAutomation.scrapePageAction",
  maxRetries: 3, // ← Will retry up to 3 times with backoff
});

// Retries happen automatically:
// Attempt 1: Immediate
// Attempt 2: After 2s
// Attempt 3: After 4s
// Attempt 4: After 8s
```

See the [example directory](./example) for complete, runnable code and
[TEST_RESULTS.md](./TEST_RESULTS.md) for test documentation.

## Debugging

### View Sessions in Browserbase

1. Get the job status to find the session ID
2. Go to https://browserbase.com/sessions
3. View live sessions and recordings

### Check Logs

Component logs are visible in the Convex dashboard:

```
[Executor] Starting job <jobId>
[Executor] Session <sessionId> created with connectUrl: ...
[User Action] Connecting to Browserbase: ...
[User Action] Job <jobId> completed successfully
```

## Cost Optimization

- Set appropriate timeouts - don't let sessions run longer than needed
- The component automatically cleans up sessions (REQUEST_RELEASE)
- Batch wisely - don't schedule too many concurrent jobs
- Monitor failed jobs - they still consume Browserbase minutes

## Development

```bash
# Build the component
npm run build

# Run example
cd example
npm install
npx convex dev
```

## Documentation

📚 **Complete Guides:**

- [FEATURES.md](./FEATURES.md) - **Feature showcase with all examples** (START
  HERE!)
- [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md) - Detailed usage patterns
- [TEST_RESULTS.md](./TEST_RESULTS.md) - Test documentation with real results
- [example/](./example) - Complete working code you can run

🔗 **External Resources:**

- [Browserbase docs](https://docs.browserbase.com) - Session configuration
- [Convex components](https://docs.convex.dev/production/components) - Component
  architecture
- [Playwright docs](https://playwright.dev) - Browser automation API

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.
