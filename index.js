import cron from "node-cron";
import { assignFiles } from "./services/assignment-service.js";
import { csvExtractor } from "./services/extractor-service.js";
import { logger } from "./logger.js";

/**
 * To assign pending csv files
 * @param
 */
cron.schedule(process.env.ASSIGNMENT_FILE_SCHEDULER, async () => {
  logger.info("assignFiles is running");
  await assignFiles();
  logger.info("assignFiles is completed");
});

/**
 * Scheduler for extracting csv file by status 'NEW'
 * @param
 */
cron.schedule(process.env.ASSIGNMENT_FILE_SCHEDULER, async () => {
  logger.info("csvExtractor is running");
  await csvExtractor();
  logger.info("csvExtractor is completed");
});
