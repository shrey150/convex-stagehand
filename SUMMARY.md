# Browserbase Component - Documentation Summary

## 📋 Quick Navigation

| Document                               | Purpose                        | When to Read                    |
| -------------------------------------- | ------------------------------ | ------------------------------- |
| [README.md](./README.md)               | Quick start & overview         | First time users                |
| [FEATURES.md](./FEATURES.md)           | **All features with examples** | **Want to see what's possible** |
| [EXAMPLE_USAGE.md](./EXAMPLE_USAGE.md) | Detailed usage patterns        | Building your first automation  |
| [TEST_RESULTS.md](./TEST_RESULTS.md)   | Test documentation             | Want proof it works             |
| [example/](./example)                  | Working code                   | Ready to run tests              |

## 🎯 What is This Component?

A **durable browser automation component** for Convex that:

- ✅ Runs browser automation jobs using Browserbase cloud browsers
- ✅ Survives server restarts (durable execution)
- ✅ Automatically retries failed jobs
- ✅ Tracks progress with reactive queries
- ✅ Sends webhook notifications
- ✅ Cleans up sessions automatically

## 🚀 Quick Start (2 Minutes)

### 1. Install

```bash
npm install @convex-dev/browserbase playwright-core
```

### 2. Configure

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import browserbase from "@convex-dev/browserbase/convex.config";

const app = defineApp();
app.use(browserbase, { name: "browserbase" });
export default app;
```

### 3. Set Environment Variables

```bash
# .env.local
BROWSERBASE_API_KEY=your_key
BROWSERBASE_PROJECT_ID=your_project
```

### 4. Create Automation Action

```typescript
// convex/browserAutomation.ts
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
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(connectUrl);
      const page = browser.contexts()[0].pages()[0];

      await page.goto(params.url);
      const title = await page.title();

      await browser.close();

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: { title },
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

### 5. Schedule Jobs

```typescript
// convex/example.ts
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

### 6. Track Status (Reactive!)

```typescript
const status = useQuery(api.example.getJobStatus, { jobId });
```

## 📊 Architecture

```
User App → Component → Browserbase → User Action → Component
   ↓          ↓            ↓             ↓              ↓
Schedule   Create      Connect        Automate      Cleanup
  Job     Session       CDP           (Playwright)   Session
```

**The Resend Pattern:**

1. User schedules job via component API
2. Component creates Browserbase session
3. Component calls user's automation action with connectUrl
4. User performs automation (Playwright, Puppeteer, etc.)
5. User reports success/failure back to component
6. Component cleans up session (REQUEST_RELEASE)

## ✨ Key Features

### 1. Durable Execution

Jobs survive server restarts and continue from where they left off.

### 2. Automatic Retries

Configure `maxRetries` for exponential backoff retry logic.

### 3. Reactive Status Tracking

Real-time job status updates without polling.

### 4. Webhook Notifications

HTTP POST notifications when jobs complete or fail.

### 5. Batch Processing

Schedule multiple jobs and track aggregate progress.

### 6. Session Management

Automatic session creation and cleanup (REQUEST_RELEASE).

## 🎬 Real-World Examples (✅ Tested)

### HackerNews Top Stories

**What:** Scrapes top stories from HackerNews **Performance:** ~10 seconds for 5
stories **Status:** ✅ Tested and working

```typescript
const { jobId } = await convex.mutation(api.example.scrapeHackerNews, {
  maxStories: 5,
});
```

### GitHub Repository Stats

**What:** Extracts repo info (stars, forks, description) **Performance:** ~8
seconds **Status:** ✅ Tested and working

```typescript
const { jobId } = await convex.mutation(api.example.scrapeGitHubRepo, {
  owner: "browserbase",
  repo: "stagehand",
});
```

### Product Hunt Products

**What:** Scrapes today's top products **Performance:** ~10 seconds **Status:**
⏳ Ready but not tested

```typescript
const { jobId } = await convex.mutation(api.example.scrapeProductHunt, {
  maxProducts: 5,
});
```

See [FEATURES.md](./FEATURES.md) for complete code and more examples!

## 📚 Full Feature List

| Feature           | Description                            | Docs                                                                           |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| Job Scheduling    | Schedule background automation jobs    | [FEATURES.md#basic-job-scheduling](./FEATURES.md#basic-job-scheduling)         |
| Status Tracking   | Reactive queries for real-time updates | [FEATURES.md#reactive-status-tracking](./FEATURES.md#reactive-status-tracking) |
| Automatic Retries | Exponential backoff retry logic        | [FEATURES.md#automatic-retries](./FEATURES.md#automatic-retries)               |
| Webhooks          | HTTP POST notifications                | [FEATURES.md#webhook-notifications](./FEATURES.md#webhook-notifications)       |
| Batch Processing  | Process multiple jobs in parallel      | [FEATURES.md#batch-processing](./FEATURES.md#batch-processing)                 |
| Session Config    | Customize timeout, region, proxies     | [FEATURES.md#session-configuration](./FEATURES.md#session-configuration)       |
| Error Handling    | Robust error handling at every level   | [FEATURES.md#error-handling](./FEATURES.md#error-handling)                     |

## 🧪 Testing

Run the test suite with live Browserbase credentials:

```bash
cd example
npx tsx test-component.ts
```

**Expected:** 2/2 tests pass in ~20-30 seconds.

See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed test documentation.

## 🔧 API Reference

### Component Public API

| Function         | Type     | Description                       |
| ---------------- | -------- | --------------------------------- |
| `scheduleJob()`  | Mutation | Schedule a new automation job     |
| `getJobStatus()` | Query    | Get job status (reactive)         |
| `listJobs()`     | Query    | List jobs with optional filtering |
| `cancelJob()`    | Mutation | Cancel a running job              |

### Internal APIs (for user actions)

| Function         | Type     | Description                  |
| ---------------- | -------- | ---------------------------- |
| `_completeJob()` | Mutation | Report successful completion |
| `_failJob()`     | Mutation | Report failure               |

See [README.md#api-reference](./README.md#api-reference) for complete API
documentation.

## 💡 Use Cases

- **Web Scraping** - Extract data from websites at scale
- **E2E Testing** - Automated testing of web applications
- **Price Monitoring** - Track price changes on e-commerce sites
- **Data Collection** - Gather information from multiple sources
- **Form Automation** - Fill and submit forms programmatically
- **Screenshot Service** - Capture website screenshots on demand
- **Content Archiving** - Archive web pages for compliance
- **Competitive Analysis** - Monitor competitor websites

## 🎓 Learning Path

1. **Read** [README.md](./README.md) - Get overview and quick start
2. **Explore** [FEATURES.md](./FEATURES.md) - See all features with examples
3. **Study** [example/](./example) - Review working code
4. **Test** `example/test-component.ts` - Run tests locally
5. **Build** - Create your first automation!

## 📦 Package Structure

```
convex-stagehand/
├── README.md                 # Quick start & overview
├── FEATURES.md              # Feature showcase with examples
├── EXAMPLE_USAGE.md         # Detailed usage guide
├── TEST_RESULTS.md          # Test documentation
├── SUMMARY.md               # This file!
├── src/component/           # Component source code
│   ├── public.ts           # Public API exports
│   ├── jobs.ts             # Job management
│   ├── sessions.ts         # Session lifecycle
│   ├── executor.ts         # Job executor
│   ├── webhooks.ts         # Webhook delivery
│   └── lib/browserbase.ts  # Browserbase API client
└── example/                 # Working examples
    ├── convex/
    │   ├── browserAutomation.ts  # User automation actions
    │   └── example.ts            # How to schedule jobs
    └── test-component.ts         # Standalone test script
```

## 🐛 Troubleshooting

**Session not found**

- Check your Browserbase credentials in `.env.local`

**playwright-core not found**

- Run `npm install playwright-core` in your project

**Job stuck in "running"**

- Check if user action is calling `_completeJob` or `_failJob`
- Check Convex logs for errors
- Check Browserbase dashboard for session status

**Timeout errors**

- Increase `sessionOptions.timeout`
- Add explicit waits in your Playwright code

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT

---

**Ready to build?** Start with [FEATURES.md](./FEATURES.md) to see what's
possible! 🚀
