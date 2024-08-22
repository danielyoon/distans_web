const { time } = require("console");

var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  winston = require("winston"),
  { LOGIN, CHECK } = require("../components/enums"),
  sendEmail = require("../components/send_email"),
  client = require("twilio")(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN),
  stripe = require("stripe")(process.env.STRIPE_KEY),
  SERVICE_ID = process.env.SERVICE_ID,
  db = require("../components/mongo.js");

//TODO: All functions have to be re-made to use try-catch to discover possible errors
//TODO: All non-auth functions should be moved to their own respective controllers ie time, friends, etc
module.exports = {
  checkIn,
  checkOut,
  contactUs,
  createAccount,
  deleteAccount,
  getLogs,
  loginWithPhoneNumber,
  loginWithTokens,
  logout,
  refreshToken,
  testLogin,
  updateLogs,
  updateUserPermission,
  verifyPinNumber,

  getQrData,
  addFriend,
  getFriends,
  postEta,
  getEta,
  deleteEta,
  createPaymentIntent,
  upgradeAccount,
};

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

async function checkIn(params) {
  try {
    // Retrieve refresh token and associated user
    const refreshToken = await getRefreshToken(params.token);
    const user = refreshToken.user;
    const newPlace = await findNearbyPlace(params.longitude, params.latitude);

    // Return an error if no user is found
    if (!user) {
      return { status: "ERROR" };
    }

    // Check if a nearby place is found and if it's approved
    if (!newPlace || newPlace.approved == false) {
      // If no approved place is found, check the user out from their current location
      await checkOut(user._id);
      return { status: CHECK.OUT };
    }

    let checkedInTime = new Date();
    let isLocationAlwaysOn = user.isLocationAlwaysOn;
    let isPrivate = newPlace.isPrivate;

    // If the place is private and the user isn't the requester, exit
    if (isPrivate && !newPlace.requestedBy.equals(user._id)) {
      await checkOut(user._id);
      return { status: CHECK.OUT };
    }

    // If the user is already checked into the same location, update their check-in time
    if (user.currentLocation && user.currentLocation.equals(newPlace._id)) {
      // Find the user in the checkedInUsers array
      const userIndex = newPlace.users.findIndex((checkedInUser) =>
        checkedInUser.user.equals(user._id)
      );

      if (userIndex !== -1) {
        // Update the check-in time for this user
        newPlace.users[userIndex].longStay = true;
        newPlace.markModified("users");

        await newPlace.save();
      }

      // Update the user's current location and check-in time
      user.currentLocation = newPlace._id;

      await user.save();

      return {
        status: CHECK.IN,
        data: {
          placeId: newPlace._id,
          checkedInTime: user.time,
        },
      };
    } else {
      // If the user is checked into a different location, check them out first
      if (user.currentLocation) {
        await checkOut(user._id);
      }

      // Add the user to the new place's check-in list
      newPlace.users.push({
        user: user._id,
        checkedInTime,
        isLocationAlwaysOn,
        longStay: false,
      });
      await newPlace.save();

      // Update the user's check-in history
      const existingHistory = user.history.find((entry) =>
        entry.place.equals(newPlace._id)
      );

      if (existingHistory) {
        // If the user has checked into this place before, increment the visit count
        existingHistory.visitCount += 1;
        existingHistory.time = checkedInTime;
      } else {
        // If this is the first visit, add a new entry to the history
        user.history.push({
          place: newPlace._id,
          time: checkedInTime,
          visitCount: 1,
        });
      }

      // Update the user's current location and check-in time
      user.currentLocation = newPlace._id;
      user.time = checkedInTime;

      // Add a notification for the check-in event
      await addLog(user, "check", newPlace.name, checkedInTime);

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
      return { status: CHECK.OUT };
    }

    // Update the Place/Marker document: remove the user from the checked-in users
    await db.Place.updateOne(
      { _id: user.currentLocation },
      { $pull: { users: { user: id } } }
    );

    // Update the User document: reset currentLocation and time
    await db.User.updateOne(
      { _id: id },
      {
        $set: {
          currentLocation: null,
          time: null,
        },
      }
    );

    return { status: CHECK.OUT };
  } catch (error) {
    console.error("Error in checkOut function:", error);
    return { status: "ERROR" };
  }
}

async function contactUs(id, params) {
  sendUserComments(id, params.email, params.description);

  return { status: "SUCCESS" };
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

  var coupon = await db.Coupon.findOne({ name: "Distans-sign-up-coupon" });

  const redeemed = coupon.redeemed.includes(params.phoneNumber);

  if (!redeemed) {
    user.coupons.push(coupon._id);
    await addLog(user, "coupon", "distans", new Date());
  }

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

async function deleteAccount(id) {
  await db.User.deleteOne({ _id: id });

  return { status: "SUCCESS" };
}

async function loginWithPhoneNumber({ phoneNumber }) {
  const number = "+1" + phoneNumber;

  const result = await client.verify
    .services(SERVICE_ID)
    .verifications.create({ to: number, channel: "sms" });

  return { status: result.status === "pending" ? LOGIN.SUCCESS : LOGIN.WRONG };
}

async function getLogs(id) {
  const user = await db.User.findById(id);

  return { status: "SUCCESS", data: user.logs };
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

async function logout(id) {
  const user = await db.User.findOne({ _id: id });

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  return {
    status: LOGIN.SUCCESS,
  };
}

async function refreshToken(params, ip) {
  try {
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
  } catch (error) {
    logger.error(`Error in refreshToken: ${error.message}`, {
      timestamp: new Date().toISOString(),
      params,
      ip,
      stack: error.stack,
    });

    return {
      status: 400,
      message: "Error refreshing token",
    };
  }
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

async function updateLogs(id, params) {
  const user = await db.User.findById(id);

  console.log(params.index);

  user.logs.forEach((log) => {
    if (log.index <= params.index && log.action !== "assign") {
      console.log(log);
      log.seen = true;
    }
  });

  await user.save();

  user.logs.forEach((log) => {
    console.log(log);
  });

  return { status: "SUCCESS" };
}

async function updateUserPermission(id, params) {
  const user = await db.User.findById(id);

  Object.assign(user, params);
  await user.save();

  return { status: "SUCCESS" };
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

//TODO: Everything below this belongs in a different controller!
async function getQrData(params) {
  const existingCode = await db.QrCode.findOne({ id: params.id });

  if (existingCode) {
    await db.QrCode.deleteOne({ id: params.id });
  }

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
    const decryptedData = decrypt(encryptedParams.friendId);
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
  let existingFriends = user.friends.filter((friend) => friend !== null);

  existingFriends = await Promise.all(
    existingFriends.map(async (friend) => {
      const exists = await db.User.findById(friend._id);
      return exists ? friend : null;
    })
  );

  existingFriends = existingFriends.filter((friend) => friend !== null);

  if (existingFriends.length !== user.friends.length) {
    user.friends = existingFriends.map((friend) => friend._id);
    await user.save();
  }

  let friendsData = await Promise.all(
    existingFriends.map(async (friend) => {
      let currentLocation = "";
      if (friend.currentLocation) {
        const place = await db.Place.findById(friend.currentLocation);
        currentLocation = place ? place.name : "";
      }

      return {
        id: friend._id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        photo: friend.photo,
        currentLocation: currentLocation,
        time: friend.time,
      };
    })
  );

  return { status: "SUCCESS", data: friendsData };
}

async function postEta(id, params) {
  const user = await db.User.findById(id);
  const place = await db.Place.findById(params.placeId);

  if (!user || !place) {
    throw new Error("User or Place not found.");
  }

  // Use the parseTime function to parse the time
  const eventTime = parseTime(params.time);

  // Check if the user already has an ETA that overlaps with the new one
  const userHasOverlappingEta = user.eta.some(
    (existingEta) =>
      new Date(existingEta.time).getTime() === eventTime.getTime()
  );

  // Check if the user is already supposed to be at the place
  const userAlreadyAtPlace = place.eta.some(
    (existingEta) => existingEta.user.toString() === id.toString()
  );

  if (userHasOverlappingEta) {
    throw new Error("User already has an event scheduled for this time.");
  }

  if (userAlreadyAtPlace) {
    throw new Error("User is already supposed to be at this location.");
  }

  const eta = {
    user: id,
    time: eventTime,
    place: params.placeId,
  };

  user.eta.push(eta);
  place.eta.push(eta);

  await user.save();
  await place.save();

  return {
    status: "SUCCESS",
    data: eta,
  };
}

async function getEta(id) {
  const user = await db.User.findById(id);

  return {
    status: "SUCCESS",
    data: user.eta,
  };
}

async function deleteEta(id, params) {
  const place = await db.Place.findById(params.id);

  if (!place) {
    return { status: "FAILURE", message: "Place not found" };
  }

  place.eta = place.eta.filter((item) => item.user !== id);

  await place.save();

  return { status: "SUCCESS" };
}

async function createPaymentIntent() {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 500,
    currency: "usd",
  });

  return { status: "SUCCESS", data: paymentIntent.client_secret };
}

async function upgradeAccount(id) {
  try {
    // Find the user in your database
    const user = await db.User.findById(id);

    // Check if the customer already exists on Stripe
    let customer;
    try {
      customer = await stripe.customers.retrieve(id);
    } catch (error) {
      if (
        error.type === "StripeInvalidRequestError" &&
        error.code === "resource_missing"
      ) {
        customer = null;
      } else {
        throw error;
      }
    }

    // If the customer does not exist, create a new one
    if (!customer) {
      customer = await stripe.customers.create({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phoneNumber,
      });
    }

    // Update the user role to 'Premium'
    user.role = "Premium";
    await user.save();

    return { status: "SUCCESS", message: "Account upgraded to Premium" };
  } catch (error) {
    console.error("Error in upgradeAccount function:", error);
    return { status: "ERROR", message: error.message };
  }
}

//TODO: ALPHABETIZE THESE
// Helper functions
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

function parseTime(timeStr) {
  if (!/^\d{4}$/.test(timeStr)) {
    throw new Error("Invalid time format. Expected HHMM.");
  }

  const hours = parseInt(timeStr.slice(0, 2), 10);
  const minutes = parseInt(timeStr.slice(2), 10);

  const eventTime = new Date();
  eventTime.setHours(hours, minutes, 0, 0);

  return eventTime;
}

async function addLog(user, action, target, time) {
  if (user.logs.length >= 200) {
    user.logs.shift();
  }

  user.logs.push({
    index: user.logs.length,
    action: action,
    target: target,
    time: time,
    seen: false,
  });
}
