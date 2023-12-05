var db = require("../components/mongo.js");

module.exports = {
  createPlace,
  getNearbyPlaces,
  getPlaceData,
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

async function getNearbyPlaces(params) {
  const geoQuery = {
    location: {
      $geoWithin: {
        $centerSphere: [
          [params.longitude, params.latitude],
          0.0155262 / 3963.2,
        ],
      },
    },
    approved: true,
  };

  let nearbyPlaces = await db.Place.find(geoQuery);

  return {
    status: "SUCCESS",
    data: nearbyPlaces,
  };
}

async function getPlaceData(params) {
  const placeData = await db.Place.findById(params.id);

  return { status: "SUCCESS", data: placeData };
}
