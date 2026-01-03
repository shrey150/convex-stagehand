/**
 * AI-Powered Browser Automation Examples using Stagehand
 *
 * Stagehand provides AI-powered browser automation with natural language commands.
 *
 * Key difference from Playwright:
 * - Stagehand manages its own Browserbase sessions
 * - Uses AI to find elements and perform actions
 * - No need for complex selectors
 *
 * The component still provides:
 * - Durable execution (survives restarts)
 * - Automatic retries
 * - Job tracking and status
 * - Webhook notifications
 */

import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Get Browserbase config from environment
 */
function getBrowserbaseConfig() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error(
      "Missing BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID in environment",
    );
  }

  return { apiKey, projectId };
}

/**
 * Example 1: AI-Powered HackerNews Scraper
 *
 * Uses Stagehand's AI to intelligently extract story data
 */
export const scrapeHackerNewsStagehand = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    params: v.object({
      maxStories: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { jobId, params }) => {
    const startTime = Date.now();
    let stagehand: Stagehand | null = null;

    try {
      const config = getBrowserbaseConfig();

      // Initialize Stagehand with Browserbase
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: config.apiKey,
        projectId: config.projectId,
        enableCaching: false,
        // Optional: Specify AI model
        model: "openai/gpt-4o-mini",
      });

      await stagehand.init();
      const page = stagehand.page;

      // Navigate to HackerNews
      await page.goto("https://news.ycombinator.com");

      // Use AI to extract stories - much simpler than manual selectors!
      const stories = await page.extract({
        instruction: `Extract the top ${params.maxStories || 5} stories from the front page.
                      For each story, get the rank, title, URL, score, and age.`,
        schema: {
          stories: [
            {
              rank: "string",
              title: "string",
              url: "string",
              score: "string",
              age: "string",
            },
          ],
        },
      });

      await stagehand.close();

      const duration = Date.now() - startTime;

      // Report success to component
      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          stories: stories.stories,
          count: stories.stories.length,
          scrapedAt: new Date().toISOString(),
          method: "stagehand-ai",
        },
        metrics: { duration },
      });

      console.log(
        `[Stagehand HN] Successfully scraped ${stories.stories.length} stories using AI`,
      );
    } catch (error: any) {
      console.error(`[Stagehand HN] Job ${jobId} failed:`, error.message);

      if (stagehand) {
        await stagehand.close().catch(() => {});
      }

      // Report failure to component
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Example 2: AI-Powered GitHub Repository Analysis
 *
 * Uses Stagehand's AI to analyze a repository page
 */
export const analyzeGitHubRepoStagehand = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    params: v.object({
      owner: v.string(),
      repo: v.string(),
    }),
  },
  handler: async (ctx, { jobId, params }) => {
    const startTime = Date.now();
    let stagehand: Stagehand | null = null;

    try {
      const config = getBrowserbaseConfig();

      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: config.apiKey,
        projectId: config.projectId,
        enableCaching: false,
        model: "openai/gpt-4o-mini",
      });

      await stagehand.init();
      const page = stagehand.page;

      const url = `https://github.com/${params.owner}/${params.repo}`;
      await page.goto(url);

      // Let AI extract all relevant repo information
      const repoInfo = await page.extract({
        instruction:
          "Extract the repository information including name, description, stars, forks, language, license, and recent commit activity.",
        schema: {
          name: "string",
          description: "string",
          stars: "string",
          forks: "string",
          language: "string",
          license: "string",
          lastCommit: "string",
        },
      });

      await stagehand.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          ...repoInfo,
          url,
          analyzedAt: new Date().toISOString(),
          method: "stagehand-ai",
        },
        metrics: { duration },
      });

      console.log(
        `[Stagehand GitHub] Successfully analyzed ${params.owner}/${params.repo} using AI`,
      );
    } catch (error: any) {
      console.error(`[Stagehand GitHub] Job ${jobId} failed:`, error.message);

      if (stagehand) {
        await stagehand.close().catch(() => {});
      }

      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Example 3: AI-Powered Interactive Form Filling
 *
 * Demonstrates Stagehand's act() method for intelligent interactions
 */
export const fillFormStagehand = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    params: v.object({
      url: v.string(),
      formData: v.object({
        name: v.string(),
        email: v.string(),
        message: v.string(),
      }),
    }),
  },
  handler: async (ctx, { jobId, params }) => {
    const startTime = Date.now();
    let stagehand: Stagehand | null = null;

    try {
      const config = getBrowserbaseConfig();

      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: config.apiKey,
        projectId: config.projectId,
        enableCaching: false,
        model: "openai/gpt-4o-mini",
      });

      await stagehand.init();
      const page = stagehand.page;

      await page.goto(params.url);

      // Use AI to fill the form - it figures out which fields to fill!
      await page.act({
        action: `Fill in the name field with "${params.formData.name}"`,
      });

      await page.act({
        action: `Fill in the email field with "${params.formData.email}"`,
      });

      await page.act({
        action: `Fill in the message field with "${params.formData.message}"`,
      });

      // Optionally submit
      await page.act({
        action: "Click the submit button",
      });

      // Extract confirmation message
      const confirmation = await page.extract({
        instruction:
          "Get the success or confirmation message after form submission",
        schema: {
          message: "string",
        },
      });

      await stagehand.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          formFilled: true,
          confirmation: confirmation.message,
          submittedAt: new Date().toISOString(),
          method: "stagehand-ai",
        },
        metrics: { duration },
      });

      console.log(`[Stagehand Form] Successfully filled form using AI`);
    } catch (error: any) {
      console.error(`[Stagehand Form] Job ${jobId} failed:`, error.message);

      if (stagehand) {
        await stagehand.close().catch(() => {});
      }

      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Example 4: AI-Powered Multi-Step Workflow
 *
 * Demonstrates complex multi-step automation with Stagehand
 */
export const multiStepWorkflowStagehand = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    params: v.object({
      searchQuery: v.string(),
    }),
  },
  handler: async (ctx, { jobId, params }) => {
    const startTime = Date.now();
    let stagehand: Stagehand | null = null;

    try {
      const config = getBrowserbaseConfig();

      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: config.apiKey,
        projectId: config.projectId,
        enableCaching: false,
        model: "openai/gpt-4o-mini",
      });

      await stagehand.init();
      const page = stagehand.page;

      // Step 1: Navigate to Google
      await page.goto("https://www.google.com");

      // Step 2: Search using AI
      await page.act({
        action: `Search for "${params.searchQuery}"`,
      });

      // Step 3: Extract top 3 results
      const searchResults = await page.extract({
        instruction: "Extract the top 3 search results with title and URL",
        schema: {
          results: [
            {
              title: "string",
              url: "string",
              snippet: "string",
            },
          ],
        },
      });

      // Step 4: Visit first result
      if (searchResults.results.length > 0) {
        await page.goto(searchResults.results[0].url);

        // Step 5: Extract main content from the page
        const pageContent = await page.extract({
          instruction:
            "Summarize the main content of this page in 2-3 sentences",
          schema: {
            summary: "string",
            pageTitle: "string",
          },
        });

        searchResults.results[0].summary = pageContent.summary;
        searchResults.results[0].pageTitle = pageContent.pageTitle;
      }

      await stagehand.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          searchQuery: params.searchQuery,
          results: searchResults.results,
          completedSteps: 5,
          completedAt: new Date().toISOString(),
          method: "stagehand-ai",
        },
        metrics: { duration },
      });

      console.log(
        `[Stagehand Workflow] Successfully completed multi-step workflow using AI`,
      );
    } catch (error: any) {
      console.error(`[Stagehand Workflow] Job ${jobId} failed:`, error.message);

      if (stagehand) {
        await stagehand.close().catch(() => {});
      }

      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
