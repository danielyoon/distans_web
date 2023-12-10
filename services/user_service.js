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
  refreshToken,
  checkIn,
  checkOut,
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
      data: {
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
      },
    };
  }
}

async function loginWithTokens(params, ip) {
  const refreshToken = await getRefreshToken(params.token);

  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: LOGIN.EXPIRED,
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      refreshToken: newRefreshToken.token,
      jwtToken,
    },
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
    data: {
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        birthday: user.birthday,
        createdAt: user.createdAt,
      },
      refreshToken: newRefreshToken.token,
      jwtToken,
    },
  };
}

async function updateUserPermission(id, params) {
  const user = await db.User.findById(id);

  Object.assign(user, params);
  await user.save();

  return { status: "SUCCESS" };
}

async function logout(params) {
  const refreshToken = await getRefreshToken(params.token);
  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: LOGIN.EXPIRED,
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  return {
    status: LOGIN.SUCCESS,
  };
}

async function deleteAccount(id) {
  await db.User.deleteOne({ _id: id });

  return { status: "SUCCESS" };
}

async function refreshToken(params, ip) {
  const refreshToken = await getRefreshToken(params.token);
  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: LOGIN.EXPIRED,
      data: null,
    };
  }

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

async function checkIn(userId, params) {
  try {
    const user = await db.User.findById(userId);
    const newPlace = await findNearbyPlace(params.longitude, params.latitude);

    if (!user) {
      console.log("User not found for ID: ", userId);
      return { status: "ERROR" };
    }

    if (!newPlace) {
      // Handle case where no nearby place is found
      console.log("A location doesn't exist");
      await checkOut(userId);
      return { status: CHECK.OUT };
    }

    let checkedInTime = new Date();

    if (
      user.currentLocation &&
      user.currentLocation.toString() === newPlace._id.toString()
    ) {
      console.log("User already checked in at the location");
      // Find the user in the checkedInUsers array
      const userIndex = newPlace.users.findIndex(
        (checkedInUser) => checkedInUser.user.toString() === user._id.toString()
      );

      if (userIndex !== -1) {
        // Update the check-in time for this user
        newPlace.users[userIndex].checkedInTime = new Date();
        await newPlace.save();
      }
    } else {
      // Check out from the previous location if different
      if (user.currentLocation) {
        await checkOut(userId);
      }

      // Check in to the new place
      newPlace.users.push({ user: user._id, checkedInTime });
      await newPlace.save();

      user.currentLocation = newPlace._id;
      user.time = checkedInTime;
      await user.save();

      console.log("User checked in successfully");
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
  const user = await db.User.findById(userId);
  if (!user || !user.currentLocation) {
    return { status: CHECK.OUT }; // User is not checked in anywhere
  }

  const currentPlace = await db.Place.findById(user.currentLocation);
  if (currentPlace) {
    // Remove user from the current place's checked-in users
    currentPlace.users = currentPlace.users.filter(
      (u) => u.user.toString() !== userId.toString()
    );
    await currentPlace.save();
  }

  // Reset user's current location
  user.currentLocation = null;
  await user.save();
}

function generateJwtToken(user) {
  return jwt.sign({ sub: user.id, id: user.id }, process.env.SECRET_OR_KEY, {
    expiresIn: "24h",
  });
}

/// Token expires after 2 days
function generateRefreshToken(user, ipAddress) {
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(40),
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
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
        $centerSphere: [[longitude, latitude], 0.0155262 / 3963.2],
      },
    },
  };
  return await db.Place.findOne(geoQuery);
}
