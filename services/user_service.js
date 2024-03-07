var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  { LOGIN, CHECK } = require("../components/enums"),
  sendEmail = require("../components/send_email"),
  client = require("twilio")(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN),
  SERVICE_ID = process.env.SERVICE_ID,
  db = require("../components/mongo.js");

module.exports = {
  loginWithPhoneNumber,
  verifyPinNumber,
  loginWithTokens,
  createAccount,
  updateUserPermission,
  logout,
  deleteAccount,
  contactUs,
  refreshToken,
  checkIn,
  checkOut,
  testLogin,
};

async function loginWithPhoneNumber({ phoneNumber }) {
  const number = "+1" + phoneNumber;

  const result = await client.verify
    .services(SERVICE_ID)
    .verifications.create({ to: number, channel: "sms" });

  return { status: result.status === "pending" ? LOGIN.SUCCESS : LOGIN.WRONG };
}

async function verifyPinNumber({ phoneNumber, pinNumber }, ip) {
  const number = "+1" + phoneNumber;

  const result = await client.verify
    .services(SERVICE_ID)
    .verificationChecks.create({ to: number, code: pinNumber });

  if (result.status === "approved") {
    const user = await db.User.findOne({ phoneNumber: phoneNumber });

    if (!user) {
      return {
        status: LOGIN.NONEXISTENT,
        data: null,
      };
    }

    await db.RefreshToken.findOneAndDelete({ user: user.id });

    const newRefreshToken = generateRefreshToken(user, ip);
    await newRefreshToken.save();

    const jwtToken = generateJwtToken(user);

    return {
      status: LOGIN.SUCCESS,
      data: createUserData(user, newRefreshToken, jwtToken),
    };
  }
}

async function loginWithTokens(params, ip) {
  const refreshToken = await getRefreshToken(params.token);

  const user = refreshToken.user;

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: createUserData(user, newRefreshToken, jwtToken),
  };
}

async function createAccount(params, ip) {
  const isFirstUser =
    (await db.User.countDocuments({ verified: { $ne: null } })) === 0;

  let user = new db.User({
    role: isFirstUser ? "Admin" : "User",
    firstName: params.firstName,
    lastName: params.lastName,
    countryCode: "+1",
    phoneNumber: params.phoneNumber,
    birthday: params.birthday,
  });

  await user.save();

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: createUserData(user, newRefreshToken, jwtToken),
  };
}

async function updateUserPermission(id, params) {
  const user = await db.User.findById(id);

  Object.assign(user, params);
  await user.save();

  return { status: "SUCCESS" };
}

async function logout(id) {
  const user = await db.User.findOne({ _id: id });

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  return {
    status: LOGIN.SUCCESS,
  };
}

async function deleteAccount(id) {
  await db.User.deleteOne({ _id: id });

  return { status: "SUCCESS" };
}

async function contactUs(id, params) {
  sendUserComments(id, params.email, params.description);

  return { status: "SUCCESS" };
}

async function refreshToken(params, ip) {
  const refreshToken = await getRefreshToken(params.token);
  const user = refreshToken.user;

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: {
      refreshToken: newRefreshToken.token,
      jwtToken,
    },
  };
}

async function checkIn(params) {
  try {
    const refreshToken = await getRefreshToken(params.token);
    const user = refreshToken.user;
    const newPlace = await findNearbyPlace(params.longitude, params.latitude);

    if (!user) {
      return { status: "ERROR" };
    }

    if (!newPlace || newPlace.approved == false) {
      // Handle case where no nearby approved place is found
      await checkOut(user._id);
      return { status: CHECK.OUT };
    }

    let checkedInTime = new Date();
    let isLocationAlwaysOn = user.isLocationAlwaysOn;

    if (
      user.currentLocation &&
      user.currentLocation.toString() === newPlace._id.toString()
    ) {
      // Find the user in the checkedInUsers array
      const userIndex = newPlace.users.findIndex(
        (checkedInUser) => checkedInUser.user.toString() === user._id.toString()
      );

      if (userIndex !== -1) {
        // Update the check-in time for this user
        newPlace.users[userIndex].checkedInTime = new Date();
        newPlace.markModified("users");
        await newPlace.save();
      }
    } else {
      // Check out from the previous location if different
      if (user.currentLocation) {
        await checkOut(user._id);
      }

      // Check in to the new place
      newPlace.users.push({
        user: user._id.toString(),
        checkedInTime,
        isLocationAlwaysOn,
      });
      await newPlace.save();

      user.history.push({
        location: newPlace.name,
        time: checkedInTime,
      });
      user.currentLocation = newPlace._id;
      user.time = checkedInTime;
      await user.save();
    }

    return {
      status: CHECK.IN,
      data: {
        placeId: newPlace._id,
        checkedInTime: checkedInTime,
      },
    };
  } catch (error) {
    console.error("Check-in error:", error);
    return { status: "ERROR" };
  }
}

async function checkOut(userId) {
  try {
    // Find the user and check if they are checked in somewhere
    const user = await db.User.findById(userId);
    if (!user || !user.currentLocation) {
      return { status: CHECK.OUT }; // User is not checked in anywhere
    }

    // Update the Place/Marker document: remove the user from the checked-in users
    await db.Place.updateOne(
      { _id: user.currentLocation },
      { $pull: { users: { user: userId.toString() } } }
    );

    // Update the User document: reset currentLocation and recentCheckedIn
    await db.User.updateOne(
      { _id: userId },
      {
        $set: {
          currentLocation: "",
          recentCheckedIn: null,
        },
      }
    );

    return { status: CHECK.OUT };
  } catch (error) {
    console.error("Error in checkOut function:", error);
    return { status: "ERROR", message: error.message };
  }
}

async function testLogin(ip) {
  const user = await db.User.findOne({ phoneNumber: "5553478267" });

  if (!user) {
    return {
      status: LOGIN.NONEXISTENT,
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: createUserData(user, newRefreshToken, jwtToken),
  };
}

function generateJwtToken(user) {
  return jwt.sign({ sub: user.id, id: user.id }, process.env.SECRET_OR_KEY, {
    expiresIn: "1h",
  });
}

/// Token expires after 2 days
function generateRefreshToken(user, ipAddress) {
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(40),
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
    isAdminToken: false,
  });
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || refreshToken.isExpired) throw "Invalid token";
  return refreshToken;
}

function randomTokenString(number) {
  return crypto.randomBytes(number).toString("hex");
}

async function findNearbyPlace(longitude, latitude) {
  const geoQuery = {
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], 5.73e-6],
      },
    },
  };
  return await db.Place.findOne(geoQuery);
}

//TODO: Make a more readable HTML structure
async function sendUserComments(id, email, comments) {
  await sendEmail({
    to: "daniel@distans.app",
    subject: "User Comments",
    html: `<h3>User Comments</h3><br><p>${comments} sent by <br>${id} with email ${email}</p>`,
  });
}

function createUserData(user, newRefreshToken, jwtToken) {
  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
      birthday: user.birthday,
      role: user.role,
      createdAt: user.createdAt,
    },
    refreshToken: newRefreshToken.token,
    jwtToken,
  };
}
