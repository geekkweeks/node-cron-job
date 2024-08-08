import dateFormat from "dateformat";
import moment from "moment-timezone";

export const sliceText = (text) => text.slice(2).slice(0, -1);

export const generateStreamId = (currentDate) => {
    const customDate = new Date(currentDate);
    return `${dateFormat(
        customDate,
        "yyyymmddHHMMss"
    )}${customDate.getMilliseconds()}`.substring(0, 16);
};

export const getLocalDate = (strDate) => {
    // 6/13/2023, 12:00:05 PM
    const res = moment.utc(strDate, "M/D/YYYY, hh:mm:ss A");
    const cloneRes = res.clone().tz('Asia/Jakarta')
    return cloneRes;
};
