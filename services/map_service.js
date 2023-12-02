var db = require("../components/mongo.js");

module.exports = {
  createPlace,
};

async function createPlace(id, params) {
  const place = new db.Place({
    name: params.name,
    description: params.description,
    requestedBy: id,
    location: {
      type: "Point",
      coordinates: [params.longitude, params.latitude],
    },
  });

  await place.save();

  return { status: "SUCCESS" };
}
