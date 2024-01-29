import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export const logger = winston.createLogger({
  level: "info", // minimum level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({}),
    new DailyRotateFile({
      filename: "./logs/error-%DATE%.log",
      level: "error",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "5m",
      maxFiles: "15d", 
      handleExceptions: true,
      handleRejections: true,
    }),
    new DailyRotateFile({
      filename: "./logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "5m",
      maxFiles: "15d",
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}



