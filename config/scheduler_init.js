const cron = require("node-cron"),
  scheduler = require("./scheduler"),
  etaReset = require("./eta_reset");

module.exports = function initScheduler() {
  cron.schedule("*/5 * * * *", scheduler);
  cron.schedule("0 0 * * *", etaReset);
};
