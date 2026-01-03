/**
 * Real-World Examples: Schedule browser automation jobs
 *
 * These examples scrape real websites and return actual data.
 */

import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Helper to get Browserbase config
function getBrowserbaseConfig() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error(
      "Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in .env.local",
    );
  }

  return { apiKey, projectId };
}

/**
 * Real-World Example 1: Scrape HackerNews Top Stories
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.example.scrapeHackerNews, {
 *     maxStories: 5
 *   });
 */
export const scrapeHackerNews = mutation({
  args: {
    maxStories: v.optional(v.number()),
  },
  handler: async (ctx, { maxStories }) => {
    const config = getBrowserbaseConfig();

    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { maxStories: maxStories || 5 },
      config,
      userAction: "internal.browserAutomation.scrapeHackerNewsAction",
      sessionOptions: {
        timeout: 60000, // 1 minute
        keepAlive: false,
      },
      maxRetries: 2,
    });

    return { jobId };
  },
});

/**
 * Real-World Example 2: Get GitHub Repository Stats
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.example.scrapeGitHubRepo, {
 *     owner: "browserbase",
 *     repo: "stagehand"
 *   });
 */
export const scrapeGitHubRepo = mutation({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, { owner, repo }) => {
    const config = getBrowserbaseConfig();

    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { owner, repo },
      config,
      userAction: "internal.browserAutomation.scrapeGitHubRepoAction",
      sessionOptions: {
        timeout: 60000, // 1 minute
        keepAlive: false,
      },
      maxRetries: 2,
    });

    return { jobId };
  },
});

/**
 * Real-World Example 3: Scrape Product Hunt Today's Products
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.example.scrapeProductHunt, {
 *     maxProducts: 5
 *   });
 */
export const scrapeProductHunt = mutation({
  args: {
    maxProducts: v.optional(v.number()),
  },
  handler: async (ctx, { maxProducts }) => {
    const config = getBrowserbaseConfig();

    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { maxProducts: maxProducts || 5 },
      config,
      userAction: "internal.browserAutomation.scrapeProductHuntAction",
      sessionOptions: {
        timeout: 60000, // 1 minute
        keepAlive: false,
      },
      maxRetries: 2,
    });

    return { jobId };
  },
});

/**
 * Get job status (reactive - updates automatically!)
 *
 * Usage from client:
 *   const status = useQuery(api.example.getJobStatus, { jobId });
 */
export const getJobStatus = query({
  args: {
    jobId: v.id("browserbase:jobs"),
  },
  handler: async (ctx, { jobId }) => {
    const status = await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
    return status;
  },
});

/**
 * List all jobs with optional status filter
 */
export const listJobs = query({
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
    const jobs = await ctx.runQuery(api.browserbase.listJobs, {
      status,
      limit: 20,
    });
    return jobs;
  },
});

/**
 * Cancel a running job
 */
export const cancelJob = mutation({
  args: {
    jobId: v.id("browserbase:jobs"),
  },
  handler: async (ctx, { jobId }) => {
    await ctx.runMutation(api.browserbase.cancelJob, { jobId });
    return { success: true };
  },
});

/**
 * Example: Batch scraping multiple URLs
 */
export const scheduleBatchScrape = mutation({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (ctx, { urls }) => {
    const apiKey = process.env.BROWSERBASE_API_KEY!;
    const projectId = process.env.BROWSERBASE_PROJECT_ID!;

    const jobIds = [];

    for (const url of urls) {
      const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
        params: { url },
        config: { apiKey, projectId },
        userAction: "internal.browserAutomation.scrapePageAction",
        maxRetries: 1,
      });
      jobIds.push(jobId);
    }

    return { jobIds, total: jobIds.length };
  },
});

/**
 * Example: Schedule a form fill job
 */
export const scheduleFormFill = mutation({
  args: {
    url: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { url, email, name }) => {
    const apiKey = process.env.BROWSERBASE_API_KEY!;
    const projectId = process.env.BROWSERBASE_PROJECT_ID!;

    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: {
        url,
        formData: { email, name },
      },
      config: { apiKey, projectId },
      userAction: "internal.browserAutomation.fillFormAction",
    });

    return { jobId };
  },
});

/**
 * Example: Schedule a multi-page crawl
 */
export const scheduleCrawl = mutation({
  args: {
    startUrl: v.string(),
    maxPages: v.number(),
  },
  handler: async (ctx, { startUrl, maxPages }) => {
    const apiKey = process.env.BROWSERBASE_API_KEY!;
    const projectId = process.env.BROWSERBASE_PROJECT_ID!;

    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: {
        startUrl,
        maxPages,
      },
      config: { apiKey, projectId },
      userAction: "internal.browserAutomation.crawlPagesAction",
      sessionOptions: {
        timeout: 600000, // 10 minutes for longer crawls
      },
    });

    return { jobId };
  },
});
