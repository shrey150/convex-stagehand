/**
 * Schedule Stagehand AI-Powered Browser Automation Jobs
 *
 * These examples show how to schedule browser automation jobs using Stagehand's AI capabilities.
 *
 * Key difference from Playwright examples:
 * - Stagehand manages its own Browserbase sessions
 * - No need to pass config to scheduleJob (Stagehand reads from env)
 * - AI-powered element finding and actions
 */

import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Schedule AI-powered HackerNews scraper using Stagehand
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.stagehandExamples.scrapeHackerNewsAI, {
 *     maxStories: 5
 *   });
 */
export const scrapeHackerNewsAI = mutation({
  args: {
    maxStories: v.optional(v.number()),
  },
  handler: async (ctx, { maxStories }) => {
    // For Stagehand, we pass a minimal config since it creates its own session
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { maxStories: maxStories || 5 },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.stagehandAutomation.scrapeHackerNewsStagehand",
      maxRetries: 2,
    });

    return { jobId, method: "stagehand-ai" };
  },
});

/**
 * Schedule AI-powered GitHub repository analysis using Stagehand
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.stagehandExamples.analyzeGitHubRepoAI, {
 *     owner: "browserbase",
 *     repo: "stagehand"
 *   });
 */
export const analyzeGitHubRepoAI = mutation({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, { owner, repo }) => {
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { owner, repo },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.stagehandAutomation.analyzeGitHubRepoStagehand",
      maxRetries: 2,
    });

    return { jobId, method: "stagehand-ai" };
  },
});

/**
 * Schedule AI-powered form filling using Stagehand
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.stagehandExamples.fillFormAI, {
 *     url: "https://example.com/contact",
 *     formData: {
 *       name: "John Doe",
 *       email: "john@example.com",
 *       message: "Hello!"
 *     }
 *   });
 */
export const fillFormAI = mutation({
  args: {
    url: v.string(),
    formData: v.object({
      name: v.string(),
      email: v.string(),
      message: v.string(),
    }),
  },
  handler: async (ctx, { url, formData }) => {
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { url, formData },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.stagehandAutomation.fillFormStagehand",
      maxRetries: 2,
    });

    return { jobId, method: "stagehand-ai" };
  },
});

/**
 * Schedule AI-powered multi-step workflow using Stagehand
 *
 * Usage:
 *   const { jobId } = await convex.mutation(api.stagehandExamples.runWorkflowAI, {
 *     searchQuery: "Convex database"
 *   });
 */
export const runWorkflowAI = mutation({
  args: {
    searchQuery: v.string(),
  },
  handler: async (ctx, { searchQuery }) => {
    const jobId = await ctx.runMutation(api.browserbase.scheduleJob, {
      params: { searchQuery },
      config: {
        apiKey: process.env.BROWSERBASE_API_KEY!,
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      },
      userAction: "internal.stagehandAutomation.multiStepWorkflowStagehand",
      maxRetries: 2,
    });

    return { jobId, method: "stagehand-ai" };
  },
});

/**
 * Get job status (works for both Playwright and Stagehand jobs)
 */
export const getJobStatus = query({
  args: { jobId: v.id("browserbase:jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.runQuery(api.browserbase.getJobStatus, { jobId });
  },
});
