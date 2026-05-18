var db = require("../components/mongo.js"),
  { uploadImageToS3 } = require("../components/s3");

module.exports = {
  createPlace,
  getNearbyPlaces,
  getNearbyPOIs,
  getPlaceData,
  getPrivatePlaces,
};

async function createPlace(id, params, file) {
  try {
    let imageUrl = null;

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

    // Attempt to upload image to S3 if a file is provided
    if (file) {
      try {
        imageUrl = await uploadImageToS3(
          file,
          `places/${place._id.toString()}`,
        );
        place.photo = imageUrl;
      } catch (uploadError) {
        console.error("Error uploading file to S3:", uploadError);
        return { status: "ERROR", message: "File upload failed" };
      }
    }

    if (params.isPrivate === true) {
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

async function getNearbyPOIs(params) {
  const nearbyPlaces = await db.Place.find({
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [
            parseFloat(params.longitude),
            parseFloat(params.latitude),
          ],
        },

        $maxDistance: 300,
      },
    },

    approved: true,
    isPrivate: { $ne: true },
  }).limit(20);

  return {
    status: "SUCCESS",

    data: nearbyPlaces.map((place) => ({
      id: place._id,
      lat: place.location.coordinates[1],
      lng: place.location.coordinates[0],
    })),
  };
}

async function getPlaceData(params) {
  const placeData = await db.Place.findById(params.id);

  return { status: "SUCCESS", data: placeData };
}

async function getPrivatePlaces(id) {
  const user = await db.User.findById(id).populate("privatePlaces");

  return { status: "SUCCESS", data: user.privatePlaces };
}
