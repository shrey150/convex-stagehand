import { defineApp } from "convex/server";
import browserbase from "../../convex.config";

const app = defineApp();
app.use(browserbase, { name: "browserbase" });

export default app;
