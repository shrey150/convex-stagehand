import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Example: Extract product information from a page
 */
export const scrapeProduct = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    const result = await ctx.runAction(api.stagehand.extract, {
      url,
      instruction: "Extract the product name, price, and description",
      schema: {
        name: "string",
        price: "string",
        description: "string",
      },
    });

    return result;
  },
});

/**
 * Example: Navigate and interact with a page
 */
export const submitForm = action({
  args: {
    url: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { url, email }) => {
    // Navigate to the page
    await ctx.runAction(api.stagehand.navigate, {
      url,
    });

    // Fill in the form
    await ctx.runAction(api.stagehand.act, {
      url,
      instruction: `Type "${email}" into the email field and click submit`,
    });

    return { success: true };
  },
});

/**
 * Example: Multi-step workflow
 */
export const searchAndExtract = action({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, { searchTerm }) => {
    const result = await ctx.runAction(api.stagehand.runWorkflow, {
      startUrl: "https://google.com",
      steps: [
        {
          type: "act",
          instruction: `Search for "${searchTerm}"`,
        },
        {
          type: "extract",
          instruction: "Extract the top 3 search results",
          schema: {
            results: "array",
          },
        },
      ],
    });

    return result;
  },
});

/**
 * Example: Take a screenshot
 */
export const captureScreenshot = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    const result = await ctx.runAction(api.stagehand.screenshot, {
      url,
      fullPage: true,
    });

    return result;
  },
});

/**
 * Example: Observe available actions before performing them
 */
export const exploreActions = action({
  args: {
    url: v.string(),
    instruction: v.string(),
  },
  handler: async (ctx, { url, instruction }) => {
    const result = await ctx.runAction(api.stagehand.observe, {
      url,
      instruction,
    });

    return result;
  },
});

//
// ===== DURABLE JOBS EXAMPLES (PRODUCTION-READY) =====
//

/**
 * Example: Schedule a durable scraping job with automatic retries
 */
export const scheduleProductScrape = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    const { jobId } = await ctx.runMutation(api.stagehand.scheduleJob, {
      type: "extract",
      params: {
        url,
        instruction: "Extract product information",
        schema: {
          name: "string",
          price: "string",
          description: "string",
          inStock: "boolean",
        },
      },
      maxRetries: 3,
      webhookUrl: "https://myapp.com/webhook/scrape-complete", // Optional
    });

    return { jobId, message: "Job scheduled successfully" };
  },
});

/**
 * Example: Check job status (reactive query - UI updates automatically!)
 */
export const getJobStatus = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.stagehand.getJobStatus, { jobId });
  },
});

/**
 * Example: List all jobs with optional status filter
 */
export const listAllJobs = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("queued"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, { status }) => {
    return await ctx.runQuery(api.stagehand.listJobs, {
      status,
      limit: 50,
    });
  },
});

/**
 * Example: Batch scraping with progress tracking
 */
export const scrapeManyProducts = mutation({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (ctx, { urls }) => {
    const jobIds = [];

    for (const url of urls) {
      const { jobId } = await ctx.runMutation(api.stagehand.scheduleJob, {
        type: "extract",
        params: {
          url,
          instruction: "Extract product info",
          schema: {
            name: "string",
            price: "string",
          },
        },
      });
      jobIds.push(jobId);
    }

    return { jobIds, totalJobs: jobIds.length };
  },
});

/**
 * Example: Track batch progress
 */
export const getBatchProgress = query({
  args: { jobIds: v.array(v.id("jobs")) },
  handler: async (ctx, { jobIds }) => {
    const jobs = await Promise.all(
      jobIds.map((id) =>
        ctx.runQuery(api.stagehand.getJobStatus, { jobId: id }),
      ),
    );

    const completed = jobs.filter((j) => j?.status === "completed").length;
    const failed = jobs.filter((j) => j?.status === "failed").length;
    const running = jobs.filter((j) => j?.status === "running").length;

    return {
      total: jobIds.length,
      completed,
      failed,
      running,
      progress: (completed + failed) / jobIds.length,
    };
  },
});

/**
 * Example: Set up recurring daily price monitoring
 */
export const setupDailyPriceMonitoring = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    const { cronJobId } = await ctx.runMutation(api.stagehand.createCronJob, {
      name: "Daily Price Check",
      cronExpression: "0 9 * * *", // 9 AM daily
      jobType: "extract",
      jobParams: {
        url,
        instruction: "Extract current price",
        schema: {
          price: "string",
          currency: "string",
        },
      },
      webhookUrl: "https://myapp.com/webhook/price-update",
    });

    return { cronJobId, message: "Recurring job set up successfully" };
  },
});

/**
 * Example: List all cron jobs
 */
export const listCronJobs = query({
  handler: async (ctx) => {
    return await ctx.runQuery(api.stagehand.listCronJobs, {});
  },
});

/**
 * Example: Get cron job health status
 */
export const getCronJobHealth = query({
  handler: async (ctx) => {
    return await ctx.runQuery(api.stagehand.getCronJobHealth, {});
  },
});

/**
 * Example: Durable screenshot with file storage
 */
export const scheduleScreenshot = mutation({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    const { jobId } = await ctx.runMutation(api.stagehand.scheduleJob, {
      type: "screenshot",
      params: {
        url,
        fullPage: true,
      },
    });

    return { jobId };
  },
});

/**
 * Example: Cancel a running job
 */
export const cancelJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runMutation(api.stagehand.cancelJob, { jobId });
  },
});

/**
 * Example: Retry a failed job
 */
export const retryJob = mutation({
  args: {
    jobId: v.id("jobs"),
    resetRetryCount: v.optional(v.boolean()),
  },
  handler: async (ctx, { jobId, resetRetryCount }) => {
    return await ctx.runMutation(api.stagehand.retryJob, {
      jobId,
      resetRetryCount,
    });
  },
});
