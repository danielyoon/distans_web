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

  try {
    await handleExpiredQrCodes();
  } catch (error) {
    console.error("Error in handleExpiredQrCodes:", error);
  }

  try {
    await handleDemoUser();
  } catch (error) {
    console.error("Error in handleExpiredQrCodes:", error);
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

      let checkoutTime = 240;
      if (user.isLocationAlwaysOn) {
        checkoutTime = 360;
      }

      if (user.longStay) {
        checkoutTime = 480;
      }

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
          currentLocation: null,
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

async function handleExpiredQrCodes() {
  try {
    const expiredCodes = await db.Qr.find({
      expires: { $lte: new Date() },
    });

    if (expiredCodes.length > 0) {
      const expiredCodesIds = expiredCodes.map((token) => token._id);
      await db.Qr.deleteMany({ _id: { $in: expiredCodesIds } });
    }
  } catch (error) {
    console.error("Error in handleExpiredQrCodes:", error);
  }
}

async function handleDemoUser() {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const result = await db.User.deleteMany({
      phoneNumber: 5553478267,
      createdAt: { $lt: twoDaysAgo },
    });
  } catch (error) {
    console.error("Error in handleDemoUser:", error);
  }
}
