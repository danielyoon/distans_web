var db = require("../components/mongo.js");

module.exports = scheduler;

async function scheduler() {
  const places = await db.Place.find({}).populate("users");

  for (const place of places) {
    if (place.users.length !== 0) {
      for (const user of place.users) {
        const minutesSinceCheckedIn = Math.floor(
          Math.abs(new Date() - user.checkedInTime) / 1000 / 60
        );

        let checkoutTime = 240;
        if (user.isLocationAlwaysOn) {
          checkoutTime = 360;
        }

        if (minutesSinceCheckedIn > checkoutTime) {
          const updatedUser = await db.User.findById(user.user);

          if (updatedUser) {
            updatedUser.currentLocation = "";
            updatedUser.recentCheckedIn = new Date(0);
            await updatedUser.save();

            await db.Marker.findByIdAndUpdate(marker._id, {
              $pull: { users: { user: updatedUser.id } },
            });
          }
        }
      }
    }
  }
}
