import fs from "fs";
import { parse } from "csv-parse";
import { prismaClient, prismaClientCreds } from "../database/database.js";
import { FileStatus } from "../enum.js";
import { logger } from "../logger.js";
import { generateStreamId, sliceText } from "../utils/general-helper.js";
import path from "path";
import { finished } from "stream/promises";

/**
 * Find feed record by mediaId
 * @param {*} mediaId
 * @returns
 */
const feedByMediaId = async (mediaId) =>
    await prismaClient.tbl_feeds.findFirst({
        where: { stream_source_id: mediaId },
    });

/**
 * For extracting pending csv file and store to existing DB
 * @returns
 */
const csvExtractor = async () => {
    const csv = await prismaClient.tbl_csv_files.findFirst({
        where: {
            status: FileStatus.PROCESSING,
        },
    });

    // if there is a file with status 'PROCESSING' then the process will stop
    if (csv) return;

    // updata status to 'PROCESSING'
    const fileWillBeProcessed = await prismaClient.tbl_csv_files.findFirst({
        where: {
            status: FileStatus.NEW,
        },
        select: {
            id: true,
            file_name: true,
            location: true,
            client_id: true,
            keyword: true,
        },
    });

    if (!fileWillBeProcessed) return;

    await prismaClient.tbl_csv_files.update({
        where: {
            id: fileWillBeProcessed?.id,
        },
        data: {
            status: FileStatus.PROCESSING,
            modified_date_utc: new Date(new Date().toUTCString()),
        },
    });

    const fileNameDetails = path
        .parse(fileWillBeProcessed?.file_name)
        .name.split("_");

    // tbl_social_entity has no primary key, the soultion is using raw query
    const socialEntity =
        await prismaClientCreds.$queryRaw`SELECT * FROM tbl_social_entity WHERE ent_media_id = ${process.env.MEDIA_ID} AND ent_word LIKE ${fileNameDetails[2]} limit 1`;

    console.log('socialEntity', socialEntity)

    if (socialEntity.length == 0) {
        console.log("Invalid keyword. Try again or set new keyword..");
        logger.error(
            `Keyword: ${fileWillBeProcessed?.keyword}. Invalid keyword. Try again or set new keyword..`
        );
        await updateCsvStatus(fileWillBeProcessed?.id, FileStatus.FAILED);
        return;
    }

    const socialSearch = await prismaClientCreds.tbl_social_search.findFirst({
        where: {
            src_id: socialEntity[0]?.ent_src_id,
        },
    });

    console.log('socialSearch', socialSearch)

    if (!socialSearch) {
        logger.error(
            `ent_src_id: ${socialEntity[0]?.ent_src_id}. Invalid search cluster. Try again or set new cluster..`
        );
        await updateCsvStatus(fileWillBeProcessed?.id, FileStatus.FAILED);
        return;
    }

    const isCSVForUser = fileNameDetails[1].toLowerCase() === "user";

    await processFile(fileWillBeProcessed, isCSVForUser, socialSearch);
};

const processFile = async (fileWillBeProcessed, isCSVForUser, socialSearch) => {
    console.log('processFile', fileWillBeProcessed?.location)
    let isError = false;
    const records = [];
    const parser = fs
        .createReadStream(fileWillBeProcessed?.location)
        .pipe(parse({ delimiter: ",", from_line: 2 }));
    parser.on("readable", async function () {
        let row;
        let currentDate = Date.now();
        while ((row = parser.read()) !== null) {
            try {
                const getFeedByMediaId = await feedByMediaId(sliceText(row[0]));

                console.log('feedByMediaId', feedByMediaId)

                let streamId = generateStreamId(currentDate);

                const stream_source_meta = {
                    likes: parseInt(row[5]),
                    comments: parseInt(row[6]),
                    views: !isCSVForUser && row[10] ? parseInt(row[10]) : 0,
                };

                const stream_source_engage =
                    stream_source_meta.likes +
                    stream_source_meta.comments +
                    stream_source_meta.views;

                const model = {
                    stream_id: streamId,
                    stream_client_id: socialSearch?.src_client_id,
                    stream_cluster_id: socialSearch?.src_cluster_id,
                    stream_source_id: sliceText(row[0]), //media_id,
                    stream_src_id: socialSearch?.src_id,
                    stream_media_id: process.env.MEDIA_ID,
                    stream_search: JSON.stringify([fileWillBeProcessed?.keyword]),
                    stream_source_date: new Date(new Date().toUTCString()),
                    stream_source_detail: sliceText(row[3]),
                    stream_source_url: sliceText(row[7]),
                    stream_source_tone: "Neutral",
                    stream_user_name: isCSVForUser ? sliceText(row[14]) : "",
                    stream_user_alias: isCSVForUser
                        ? sliceText(row[13])
                        : sliceText(row[11]),
                    stream_source_meta: JSON.stringify(stream_source_meta),
                    stream_source_engage,
                    stream_analysed: "simple",
                    stream_alert: "No",
                    stream_uploaded: "No",
                    stream_status: "Active",
                    stream_file_reference: fileWillBeProcessed?.file_name
                };

                console.log(model);
                currentDate += 300;
                if (!getFeedByMediaId)
                    await prismaClient.tbl_feeds.create({
                        data: model,
                    });
                else {
                    console.log('updatte db')
                    await prismaClient.tbl_feeds.update({
                        where: {
                            stream_id: getFeedByMediaId?.stream_id,
                        },
                        data: {
                            stream_source_engage,
                            stream_source_meta: JSON.stringify(stream_source_meta),
                        },
                    });
                }

            } catch (error) {
                isError = true;
                console.error(error.message);
            }
        }
    });
    await finished(parser);

    await updateCsvStatus(
        fileWillBeProcessed?.id,
        isError ? FileStatus.FAILED : FileStatus.FINISHED
    );
    return records;
};

const updateCsvStatus = async (id, status) => {
    await prismaClient.tbl_csv_files.update({
        where: { id },
        data: {
            modified_date_utc: new Date(new Date().toUTCString()),
            status: status,
        },
    });
};

export { csvExtractor };
