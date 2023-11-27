var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  sendEmail = require("../components/send_email"),
  client = require("twilio")(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN),
  SERVICE_ID = process.env.SERVICE_ID,
  db = require("../components/mongo.js");

module.exports = {
  loginWithPhoneNumber,
  verifyPinNumber,
  loginWithTokens,
  createAccount,
  logout,
  refreshToken,
};

async function loginWithPhoneNumber({ phoneNumber }) {
  const number = "+1" + phoneNumber;

  const result = await client.verify
    .services(SERVICE_ID)
    .verifications.create({ to: number, channel: "sms" });

  return { status: result.status === "pending" ? "SUCCESS" : "WRONG" };
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
        status: "NONEXISTENT",
        data: null,
      };
    }

    await db.RefreshToken.findOneAndDelete({ user: user.id });

    const newRefreshToken = generateRefreshToken(user, ip);
    await newRefreshToken.save();

    const jwtToken = generateJwtToken(user);

    return {
      status: "SUCCESS",
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
  console.log(params.token);

  const refreshToken = await getRefreshToken(params.token);
  console.log(refreshToken);

  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: "EXPIRED",
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: "SUCCESS",
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
    status: "SUCCESS",
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

async function logout(params) {
  const refreshToken = await getRefreshToken(params.token);
  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: "EXPIRED",
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  return {
    status: "SUCCESS",
  };
}

async function refreshToken(params, ip) {
  const refreshToken = await getRefreshToken(params.token);
  const user = refreshToken.user;

  if (refreshToken.isExpired) {
    return {
      status: "EXPIRED",
      data: null,
    };
  }

  await db.RefreshToken.findOneAndDelete({ user: user.id });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: "SUCCESS",
    data: {
      refreshToken: newRefreshToken.token,
      jwtToken,
    },
  };
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
    expires: new Date(Date.now() + 2 * 24 * 60 * 1000),
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
