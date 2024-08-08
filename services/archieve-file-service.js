import path from "path";
import { prismaClient } from "../database/database.js"
import { FileStatus } from "../enum.js"
import fs from 'fs/promises';


const getFinishedFile = async () => await prismaClient.tbl_csv_files.findMany({
    where: {
        status: FileStatus.FINISHED
    },
    take: 100
})


const archiveFile = async () => {
    const list = await getFinishedFile();

    if (list && list.length > 0) {
        list.forEach(async (item) => {
            // move file to archive dir
            const destFolder = path.join(process.env.CSV_PATH, 'archived')

            try {
                await fs.access(destFolder)
            } catch (err) {
                console.log(err.message)

                if (err.code === 'ENOENT') {
                    console.log('The directory does NOT exist');

                    await fs.mkdir(destFolder, { recursive: true });
                }
            }

            const archiveLocation = path.join(destFolder, item.file_name)
            await fs.rename(item.location, archiveLocation)

            await prismaClient.tbl_csv_files.update({
                where: {
                    id: item.id
                },
                data: {
                    status: FileStatus.ARCHIVED,
                    modified_date_utc: new Date(new Date().toUTCString()),
                    location: archiveLocation
                }
            })

        });
    }
}

export default archiveFile;