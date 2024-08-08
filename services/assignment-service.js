import { readdir } from "node:fs/promises";
import { prismaClient, prismaClientCreds } from "../database/database.js";
import { FileStatus } from "../enum.js";
import path from "node:path";
import { logger } from "../logger.js";

const getClientData = async (clientName) =>
    await prismaClientCreds.tbl_client.findFirst({
        where: { client_name: clientName },
        select: {
            client_id: true,
        },
    });

const generateFile = async (file_name, location, client_id, keyword) => {
    const isCsvExist = await prismaClient.tbl_csv_files.findFirst({
        where: {
            file_name,
        },
    });

    if (!isCsvExist) {
        const result = await prismaClient.tbl_csv_files.create({
            data: {
                file_name,
                created_time_utc: new Date(new Date().toUTCString()),
                status: FileStatus.NEW,
                location,
                client_id,
                keyword,
            },
            select: {
                id: true,
            },
        });
        console.log(result);
    }
};

const assignFiles = async () => {
    const files = await readdir(process.env.CSV_PATH);

    if (Array.isArray(files) && files.length > 0) {
        for (const item in files) {
            if (path.extname(files[item]) !== '.csv')
                continue;
            console.log(files[item]);

            // Filename: 'client_hashtag/user_keyword_number.csv
            const fileNameDetails = path.parse(files[item]).name.split("_");

            // TODO: function below should be uncessary anymore since client Id is not used
            // const client = await getClientData(fileNameDetails[0]);
            // if (!client) {
            //     logger.error(
            //         `file: ${files[item]} with client - ${fileNameDetails[0]} is not found`
            //     );
            //     continue;
            // }
            await generateFile(
                files[item],
                path.join(process.env.CSV_PATH, files[item]),
                'aaaaa', //random string
                fileNameDetails[2]
            );

        }
    }
};

export { assignFiles };
