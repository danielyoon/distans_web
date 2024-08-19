var db = require("../components/mongo.js"),
  { uploadImageToS3 } = require("../components/s3");

module.exports = {
  createPlace,
  getNearbyPlaces,
  getPlaceData,
  getPrivatePlaces,
};

async function createPlace(id, params, file) {
  try {
    let imageUrl = null;

    // Attempt to upload image to S3 if a file is provided
    if (file) {
      try {
        imageUrl = await uploadImageToS3(file);
      } catch (uploadError) {
        console.error("Error uploading file to S3:", uploadError);
        return { status: "ERROR", message: "File upload failed" };
      }
    }

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
      photo: imageUrl,
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
  const user = await db.User.findById(id).populate("privatePlaces");

  return { status: "SUCCESS", data: user.privatePlaces };
}
