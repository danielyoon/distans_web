const cron = require("node-cron"),
  scheduler = require("./scheduler");

module.exports = function initScheduler() {
  cron.schedule("*/5 * * * *", scheduler);
};
