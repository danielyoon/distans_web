var db = require("../components/mongo.js");

module.exports = etaReset;

async function etaReset() {
  try {
    await db.Place.updateMany({}, { $set: { eta: [] } });
    await db.User.updateMany({}, { $set: { eta: [] } });

    console.log("ETA fields have been reset for all places and users.");
  } catch (error) {
    console.error("Error resetting ETA fields: ", error);
  }
}
