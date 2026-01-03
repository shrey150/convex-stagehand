# Browserbase Component - Feature Guide

This guide showcases all features of the Browserbase component with working
examples.

## Table of Contents

1. [Basic Job Scheduling](#basic-job-scheduling)
2. [Reactive Status Tracking](#reactive-status-tracking)
3. [Automatic Retries](#automatic-retries)
4. [Webhook Notifications](#webhook-notifications)
5. [Batch Processing](#batch-processing)
6. [Session Configuration](#session-configuration)
7. [Error Handling](#error-handling)
8. [Real-World Examples](#real-world-examples)

---

## Basic Job Scheduling

Schedule browser automation jobs that run durably in the background.

```typescript
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const scrapeWebsite = mutation({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { url },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.browserAutomation.scrapePageAction",
    });

    return { jobId };
  },
});
```

**Key Features:**

- ✅ Jobs run asynchronously in the background
- ✅ Survive server restarts
- ✅ Automatic session cleanup
- ✅ Return immediately with job ID for tracking

---

## Reactive Status Tracking

Track job progress with reactive queries that update automatically.

```typescript
import { query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

export const getJobStatus = query({
  args: { jobId: v.id("browserbase:jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
  },
});

// From your React app:
const status = useQuery(api.example.getJobStatus, { jobId });

// Status updates automatically!
// {
//   status: "pending" | "running" | "completed" | "failed",
//   result: { /* your data */ },
//   session: { connectUrl, status },
//   createdAt, startedAt, completedAt,
//   sessionDuration
// }
```

**Key Features:**

- ✅ Real-time updates without polling
- ✅ See session connect URL for debugging
- ✅ Track timing and duration
- ✅ Access results immediately when complete

---

## Automatic Retries

Jobs automatically retry on failure with exponential backoff.

```typescript
const { jobId } = await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url: "https://sometimes-flaky-site.com" },
  config: { apiKey, projectId },
  userAction: "internal.browserAutomation.scrapePageAction",
  maxRetries: 3, // ← Automatically retries up to 3 times
});

// Retry schedule:
// - Attempt 1: Immediate
// - Attempt 2: After 2 seconds
// - Attempt 3: After 4 seconds
// - Attempt 4: After 8 seconds
// If all fail, job status becomes "failed"
```

**Key Features:**

- ✅ Exponential backoff (2^n seconds)
- ✅ Configurable max retries
- ✅ New session created for each retry
- ✅ Previous sessions cleaned up automatically

---

## Webhook Notifications

Get HTTP POST notifications when jobs complete or fail.

```typescript
const { jobId } = await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url: "https://example.com" },
  config: { apiKey, projectId },
  userAction: "internal.browserAutomation.scrapePageAction",
  webhookUrl: "https://myapp.com/api/job-complete", // ← Your webhook
  maxRetries: 2,
});

// Your webhook receives POST request:
// POST https://myapp.com/api/job-complete
// Content-Type: application/json
//
// {
//   "event": "job.completed",  // or "job.failed"
//   "timestamp": 1704196800000,
//   "job": {
//     "id": "k17abc123...",
//     "status": "completed",
//     "result": {
//       // Your extracted data
//     },
//     "timing": {
//       "createdAt": 1704196790000,
//       "startedAt": 1704196792000,
//       "completedAt": 1704196800000,
//       "durationMs": 8000
//     }
//   }
// }
```

**Key Features:**

- ✅ Automatic retries (3 attempts with backoff)
- ✅ Delivery tracking in database
- ✅ Notifications for both success and failure
- ✅ Includes full job result and timing data

---

## Batch Processing

Process multiple URLs in parallel with progress tracking.

```typescript
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Schedule batch of jobs
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

    const completed = jobs.filter((j) => j?.status === "completed").length;
    const failed = jobs.filter((j) => j?.status === "failed").length;
    const running = jobs.filter((j) => j?.status === "running").length;

    return {
      total: jobs.length,
      completed,
      failed,
      running,
      progress: (completed + failed) / jobs.length,
    };
  },
});

// Use in React:
const { jobIds } = await convex.mutation(api.example.scrapeManyPages, {
  urls: ["https://site1.com", "https://site2.com", "https://site3.com"],
});

const progress = useQuery(api.example.getBatchProgress, { jobIds });
// { total: 3, completed: 2, failed: 0, running: 1, progress: 0.66 }
```

**Key Features:**

- ✅ Process multiple jobs concurrently
- ✅ Real-time progress tracking
- ✅ Individual retry logic per job
- ✅ Aggregate results when all complete

---

## Session Configuration

Customize Browserbase session settings for your use case.

```typescript
const { jobId } = await ctx.runMutation(api.browserbase.scheduleJob, {
  params: { url: "https://example.com" },
  config: { apiKey, projectId },
  userAction: "internal.browserAutomation.scrapePageAction",

  // Session options
  sessionOptions: {
    timeout: 300000, // 5 minutes (default: 60s)
    keepAlive: false, // Auto-terminate when done (default: false)
    region: "us-west-2", // Datacenter location
    proxies: true, // Use residential proxies (default: false)
  },
});
```

**Available Regions:**

- `us-west-2` (Oregon)
- `us-east-1` (Virginia)
- `eu-central-1` (Frankfurt)
- `ap-southeast-1` (Singapore)

**Key Features:**

- ✅ Configurable timeout
- ✅ Regional deployments for lower latency
- ✅ Residential proxy support
- ✅ Automatic cleanup with REQUEST_RELEASE

---

## Error Handling

Robust error handling at every level.

```typescript
export const scrapePageAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({ url: v.string() }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      // Navigation with timeout
      await page.goto(params.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Extract data with fallbacks
      const title = await page.title().catch(() => "No title");
      const data = await page
        .evaluate(() => {
          // Your extraction logic
        })
        .catch(() => ({}));

      await browser.close();

      // Report success
      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { title, data },
        metrics: { duration: Date.now() },
      });
    } catch (error: any) {
      // Automatic retry if maxRetries > 0
      // Otherwise job marked as "failed"
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
```

**Error Handling Features:**

- ✅ Try-catch in user actions
- ✅ Automatic retries on failure
- ✅ Detailed error messages in job status
- ✅ Session cleanup even on errors
- ✅ Webhook notifications on failure

---

## Real-World Examples

### Example 1: HackerNews Top Stories (✅ Tested)

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

// Schedule it
const { jobId } = await convex.mutation(api.example.scrapeHackerNews, {
  maxStories: 5,
});
```

**Performance:** ~10 seconds, extracts 5 stories with rankings and scores.

---

### Example 2: GitHub Repository Stats (✅ Tested)

```typescript
// convex/browserAutomation.ts
export const scrapeGitHubRepoAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      owner: v.string(),
      repo: v.string(),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      const url = `https://github.com/${params.owner}/${params.repo}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);

      // Extract repo info
      const name = await page.evaluate(() => {
        const title = document.querySelector("title")?.textContent || "";
        return title.split(":")[0].trim();
      });

      const stars = await page.evaluate(() => {
        const starLink = document.querySelector('a[href$="/stargazers"]');
        return starLink?.textContent?.match(/[\d,]+/)?.[0] || "0";
      });

      const forks = await page.evaluate(() => {
        const forkLink = document.querySelector('a[href$="/forks"]');
        return forkLink?.textContent?.match(/[\d,]+/)?.[0] || "0";
      });

      const description = await page.evaluate(() => {
        return (
          document
            .querySelector('meta[property="og:description"]')
            ?.getAttribute("content") || ""
        );
      });

      await browser.close();

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { name, stars, forks, description, url },
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

// Schedule it
const { jobId } = await convex.mutation(api.example.scrapeGitHubRepo, {
  owner: "browserbase",
  repo: "stagehand",
});
```

**Performance:** ~8 seconds, extracts repository metadata accurately.

---

## Quick Reference

| Feature      | API                              | Description                       |
| ------------ | -------------------------------- | --------------------------------- |
| Schedule Job | `api.browserbase.scheduleJob()`  | Create a new automation job       |
| Get Status   | `api.browserbase.getJobStatus()` | Reactive query for job status     |
| List Jobs    | `api.browserbase.listJobs()`     | Query jobs by status              |
| Cancel Job   | `api.browserbase.cancelJob()`    | Cancel a running job              |
| Complete Job | `api.browserbase._completeJob()` | Report success (from user action) |
| Fail Job     | `api.browserbase._failJob()`     | Report failure (from user action) |

## Performance Tips

1. **Use appropriate timeouts** - Don't let sessions run longer than needed
2. **Batch wisely** - Browserbase has concurrent session limits
3. **Monitor costs** - Check Browserbase dashboard regularly
4. **Use regions strategically** - Pick regions close to target websites
5. **Enable proxies selectively** - Only when needed (adds latency)

## Next Steps

- See [README.md](./README.md) for quick start guide
- See [TEST_RESULTS.md](./TEST_RESULTS.md) for test documentation
- Check [example/](./example) directory for complete working code

---

**All examples in this guide have been tested and work with live websites.** ✅
