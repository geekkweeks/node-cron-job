import cron from "node-cron";
import { assignFiles } from "./services/assignment-service.js";
import { csvExtractor } from "./services/extractor-service.js";
import { logger } from "./logger.js";
import archiveFile from "./services/archieve-file-service.js";

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
cron.schedule(process.env.EXTRACTOR_CSV_SCHEDULER, async () => {
    logger.info("csvExtractor is running");
    await csvExtractor();
    logger.info("csvExtractor is completed");
});

// /**
//  * Scheduler for archiving csv files from finished file
//  * @param
//  */
// cron.schedule(process.env.ARCHIVE_FILE_SCHEDULER, async () => {
//     logger.info("archiveFile is running");
//     await archiveFile();
//     logger.info("archiveFile is completed");
// });


