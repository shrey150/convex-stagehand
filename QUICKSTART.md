# Quick Start Guide

Get started with the Convex Stagehand component in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- A Convex account (sign up at [convex.dev](https://convex.dev))
- A Browserbase account (sign up at [browserbase.com](https://browserbase.com))

## Step 1: Install Dependencies

```bash
cd convex-stagehand
npm install
```

## Step 2: Set Up Your Environment

Create a `.env.local` file in the example directory:

```bash
cd example
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```bash
BROWSERBASE_API_KEY=bb_live_xxxxx
BROWSERBASE_PROJECT_ID=xxxxx
CONVEX_DEPLOYMENT=your-deployment-url
```

## Step 3: Initialize Convex

```bash
cd example
npx convex dev
```

This will:

- Create a new Convex project (if needed)
- Start the development server
- Watch for changes

## Step 4: Test the Component

Create a test file `example/convex/test.ts`:

```typescript
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const testScrape = action({
  handler: async (ctx) => {
    // Extract data from a webpage
    const result = await ctx.runAction(api.stagehand.extract, {
      url: "https://docs.stagehand.dev/",
      instruction: "Extract the page title and description",
      schema: {
        title: "string",
        description: "string",
      },
    });

    return result;
  },
});
```

## Step 5: Run Your First Automation

In the Convex dashboard or using the CLI:

```bash
npx convex run test:testScrape
```

You should see the extracted data returned!

## Step 6: Try Durable Jobs (Production-Ready)

For production workloads, use durable jobs with automatic retries and status
tracking:

```typescript
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Schedule a job
export const scheduleExtraction = mutation({
  handler: async (ctx) => {
    const { jobId } = await ctx.runMutation(api.stagehand.scheduleJob, {
      type: "extract",
      params: {
        url: "https://docs.stagehand.dev/",
        instruction: "Extract page content",
        schema: {
          title: "string",
          description: "string",
        },
      },
      maxRetries: 3,
    });

    return { jobId };
  },
});

// Check job status (reactive query)
export const checkStatus = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.stagehand.getJobStatus, { jobId });
  },
});
```

Run it:

```bash
# Schedule the job
npx convex run test:scheduleExtraction

# Check status (returns job ID)
npx convex run test:checkStatus '{"jobId":"<job_id_from_above>"}'
```

### Set Up Recurring Monitoring

```typescript
// Daily scrape at 9 AM
export const setupDailyScrape = mutation({
  handler: async (ctx) => {
    const { cronJobId } = await ctx.runMutation(api.stagehand.createCronJob, {
      name: "Daily Documentation Check",
      cronExpression: "0 9 * * *",
      jobType: "extract",
      jobParams: {
        url: "https://docs.stagehand.dev/",
        instruction: "Extract latest updates",
        schema: {
          updates: "array",
        },
      },
    });

    return { cronJobId };
  },
});
```

## Next Steps

Check out the example functions in `example/convex/myFunctions.ts` for more
advanced use cases:

- Form automation
- Multi-step workflows
- Screenshot capture
- Action observation

## Troubleshooting

**Error: Missing API key**

- Make sure your `.env.local` file is in the correct directory
- Verify your Browserbase credentials are correct

**Error: Module not found**

- Run `npm install` in the root directory
- Make sure the component is properly referenced in `convex.config.ts`

**Session timeout**

- Browser sessions may timeout after inactivity
- Each action creates a new browser session automatically

## Learn More

- [Full Documentation](./README.md)
- [Stagehand Docs](https://docs.stagehand.dev/)
- [Convex Components Guide](https://docs.convex.dev/components)
