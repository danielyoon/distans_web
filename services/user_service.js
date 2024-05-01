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
  getQrData,
  addFriend,
  getFriends,
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

async function checkOut(id) {
  try {
    // Find the user and check if they are checked in somewhere
    const user = await db.User.findById(id);
    if (!user || !user.currentLocation) {
      return { status: CHECK.OUT }; // User is not checked in anywhere
    }

    // Update the Place/Marker document: remove the user from the checked-in users
    await db.Place.updateOne(
      { _id: user.currentLocation },
      { $pull: { users: { user: id.toString() } } }
    );

    // Update the User document: reset currentLocation and recentCheckedIn
    await db.User.updateOne(
      { _id: id },
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

async function getQrData(params) {
  const qr = new db.QrCode({
    id: params.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  await qr.save();

  const encryptedData = encrypt(qr._id.toString());
  return { status: "SUCCESS", data: encryptedData };
}

async function addFriend(id, encryptedParams) {
  try {
    const decryptedData = decrypt(encryptedParams);
    const qr = await db.QrCode.findById(decryptedData);

    if (!qr) {
      throw new Error("Qr Code doesn't exist!");
    }

    if (qr.isExpired) {
      throw new Error("QR Code has expired.");
    }

    const user = await db.User.findById(id);
    const friend = await db.User.findById(qr.id);

    const friendExists = user.friends.some((f) => f.equals(friend._id));
    if (friendExists) {
      return {
        status: "ERROR",
        message: "Friend already exists",
      };
    }

    user.friends.push(friend._id);
    await user.save();

    friend.friends.push(user._id);
    await friend.save();

    const friendsData = {
      id: friend._id,
      firstName: friend.firstName,
      lastName: friend.lastName,
      photo: friend.photo,
      currentLocation: friend.currentLocation,
      time: friend.time,
    };

    return {
      status: "SUCCESS",
      data: friendsData,
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: error.message,
    };
  }
}

async function getFriends(id) {
  let user = await db.User.findById(id).populate("friends");

  const existingFriends = user.friends.filter((friend) => friend !== null);

  if (existingFriends.length !== user.friends.length) {
    user.friends = existingFriends.map((friend) => friend._id);
    await user.save();
  }

  const friendsData = existingFriends.map((friend) => ({
    id: friend._id,
    firstName: friend.firstName,
    lastName: friend.lastName,
    photo: friend.photo,
    currentLocation: friend.currentLocation,
    time: friend.time,
  }));

  return { status: "SUCCESS", data: friendsData };
}

async function testLogin(params) {
  if (params.pin == 2024) {
    return {
      status: LOGIN.SUCCESS,
    };
  } else {
    return {
      status: LOGIN.WRONG,
    };
  }
}

function generateJwtToken(user) {
  return jwt.sign({ sub: user.id, id: user.id }, process.env.SECRET_OR_KEY, {
    expiresIn: "1h",
  });
}

function encrypt(text) {
  const secretKey = process.env.ENCRYPT_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secretKey),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return Buffer.from(iv.toString("base64") + ":" + encrypted).toString(
    "base64"
  );
}

function decrypt(text) {
  const secretKey = process.env.ENCRYPT_KEY;
  const buffer = Buffer.from(text, "base64");
  const combined = buffer.toString();

  const splitIndex = combined.indexOf(":");
  const ivBase64 = combined.substring(0, splitIndex);
  const encryptedTextBase64 = combined.substring(splitIndex + 1);

  const iv = Buffer.from(ivBase64, "base64");
  const encryptedText = Buffer.from(encryptedTextBase64, "base64");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secretKey),
    iv
  );
  let decrypted = decipher.update(encryptedText, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
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
