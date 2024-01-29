import { performance } from "perf_hooks";

export const sliceText = (text) => text.slice(2).slice(0, -1);

export const generateStreamId = () => {
  var loadTimeInMS = Date.now();
  const time = (loadTimeInMS + performance.now()) * 1000;
  return time.toString().substring(0, 16);
};
