var db = require("../components/mongo.js");

module.exports = scheduler;

async function scheduler() {
  const currentTime = new Date();

  const places = await db.Place.find({}, "users").populate(
    "users",
    "time isLocationAlwaysOn"
  );

  let usersToUpdate = [];
  let markersToUpdate = [];

  for (const place of places) {
    for (const user of place.users) {
      const minutesSinceCheckedIn = Math.floor(
        Math.abs(currentTime - user.time) / 1000 / 60
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
          recentCheckedIn: new Date(0),
        },
      }
    );

    await db.Marker.updateMany(
      { _id: { $in: markersToUpdate } },
      {
        $pull: { users: { user: { $in: usersToUpdate } } },
      }
    );
  }
}
