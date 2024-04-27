var db = require("../components/mongo.js");

module.exports = scheduler;

async function scheduler() {
  try {
    await handleUserCheckouts();
  } catch (error) {
    console.error("Error in handleUserCheckouts:", error);
  }

  try {
    await handleExpiredRefreshTokens();
  } catch (error) {
    console.error("Error in handleExpiredRefreshTokens:", error);
  }
}

async function handleUserCheckouts() {
  const currentTime = new Date();
  const places = await db.Place.find({}, "users").populate("users");
  let usersToUpdate = [];
  let markersToUpdate = [];

  for (const place of places) {
    for (const user of place.users) {
      const minutesSinceCheckedIn = Math.floor(
        Math.abs(currentTime - user.checkedInTime) / 1000 / 60
      );

      let checkoutTime = user.isLocationAlwaysOn ? 360 : 240;

      if (minutesSinceCheckedIn > checkoutTime) {
        usersToUpdate.push(user.user);
        markersToUpdate.push(place._id);
      }
    }
  }

  if (usersToUpdate.length > 0) {
    await db.User.updateMany(
      { _id: { $in: usersToUpdate } },
      {
        $set: {
          currentLocation: "",
          recentCheckedIn: null,
        },
      }
    );

    await db.Place.updateMany(
      { _id: { $in: markersToUpdate } },
      {
        $pull: { users: { user: { $in: usersToUpdate } } },
      }
    );
  }
}

async function handleExpiredRefreshTokens() {
  try {
    const expiredTokens = await db.RefreshToken.find({
      expires: { $lte: new Date() },
    });

    if (expiredTokens.length > 0) {
      const expiredTokenIds = expiredTokens.map((token) => token._id);
      await db.RefreshToken.deleteMany({ _id: { $in: expiredTokenIds } });
    }
  } catch (error) {
    console.error("Error in handleExpiredRefreshTokens:", error);
  }
}
