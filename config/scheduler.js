var db = require("../components/mongo.js");

module.exports = scheduler;

async function scheduler() {
  try {
    const currentTime = new Date();

    const places = await db.Place.find({}, "users").populate("users");

    let usersToUpdate = [];
    let markersToUpdate = [];

    for (const place of places) {
      for (const user of place.users) {
        console.log(user.checkedInTime);
        const minutesSinceCheckedIn = Math.floor(
          Math.abs(currentTime - user.checkedInTime) / 1000 / 60
        );

        console.log(minutesSinceCheckedIn);

        let checkoutTime = user.isLocationAlwaysOn ? 360 : 240;

        if (minutesSinceCheckedIn > checkoutTime) {
          print(user.user);
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

    console.log("Scheduler ran successfully.");
  } catch (error) {
    console.error("Error in scheduler function:", error);
  }
}
