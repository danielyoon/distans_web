var db = require("../components/mongo.js");

module.exports = {
  createPlace,
  getNearbyPlaces,
  getPlaceData,
  getPrivatePlace,
};

async function createPlace(id, params) {
  const place = new db.Place({
    name: params.name,
    description: params.description,
    type: params.type,
    isPrivate: params.isPrivate,
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
        $box: [
          [params.west, params.south],
          [params.east, params.north],
        ],
      },
    },
    approved: true,
    isPrivate: { $ne: true },
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

async function getPrivatePlace(id) {}
