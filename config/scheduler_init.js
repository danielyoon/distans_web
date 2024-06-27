const cron = require("node-cron"),
  scheduler = require("./scheduler"),
  etaReset = require("./eta_reset"),
  moment = require("moment-timezone");

module.exports = function initScheduler() {
  cron.schedule("*/5 * * * *", scheduler);

  //TODO: This is a ETA reset for EST. Should make a field for timezone for user
  // Calculate the UTC hour for midnight EST/EDT
  const now = moment.tz("America/New_York");
  const midnightEST = now
    .clone()
    .hours(0)
    .minutes(0)
    .seconds(0)
    .milliseconds(0);
  const midnightUTC = midnightEST.clone().tz("UTC");

  const hourUTC = midnightUTC.hours();

  // Schedule the etaReset job for midnight EST/EDT
  const scheduleExpression = `0 ${hourUTC} * * *`;
  cron.schedule(scheduleExpression, etaReset);
};
