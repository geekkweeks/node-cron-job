import { PrismaClient as PrismaClientFeeds } from "../prisma/generated/clientFeeds/index.js";
import { PrismaClient as PrismaClientCreds } from "../prisma/generated/clientCreds/index.js";
import { logger } from "../logger.js";

const prismaClient = new PrismaClientFeeds({
    log: [
        // {
        //   emit: "event",
        //   level: "query",
        // },
        {
            emit: "event",
            level: "error",
        },
        // {
        //   emit: "event",
        //   level: "info",
        // },
        // {
        //   emit: "event",
        //   level: "warn",
        // },
    ],
});

const prismaClientCreds = new PrismaClientCreds({
    log: [
        // {
        //   emit: "event",
        //   level: "query",
        // },
        {
            emit: "event",
            level: "error",
        },
        // {
        //   emit: "event",
        //   level: "info",
        // },
        {
            emit: "event",
            level: "warn",
        },
    ],
});

prismaClient.$on("error", (e) => {
    logger.error(e);
});

prismaClient.$on("warn", (e) => {
    logger.warn(e);
});

prismaClient.$on("info", (e) => {
    logger.info(e);
});

prismaClient.$on("query", (e) => {
    logger.info(e);
});

prismaClientCreds.$on("error", (e) => {
    logger.error(e);
});

prismaClientCreds.$on("warn", (e) => {
    logger.warn(e);
});

prismaClientCreds.$on("info", (e) => {
    logger.info(e);
});

prismaClientCreds.$on("query", (e) => {
    logger.info(e);
});

export { prismaClient, prismaClientCreds };
