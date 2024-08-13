var db = require("../components/mongo.js");

module.exports = {
  createPlace,
  getNearbyPlaces,
  getPlaceData,
  getPrivatePlaces,
};

async function createPlace(id, params) {
  try {
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

    if (params.isPrivate) {
      const user = await db.User.findById(id);

      place.approved = true;

      user.privatePlaces.push(place._id);
      await user.save();
    }

    await place.save();

    return { status: "SUCCESS" };
  } catch (error) {
    console.error("Error creating place:", error);
    return { status: "ERROR" };
  }
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

async function getPrivatePlaces(id) {
  console.log(id);
  const user = await db.User.findById(id).populate("privatePlaces");

  console.log(user);

  console.log(user.privatePlaces);

  return { status: "SUCCESS", data: user.privatePlaces };
}
