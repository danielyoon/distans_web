var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  bcrypt = require("bcryptjs"),
  { LOGIN, ROLE, TOKEN } = require("../components/enums"),
  db = require("../components/mongo.js");

module.exports = {
  assignPlace,
  createAccount,
  getUserByPhone,
  loginWithEmail,
  refreshToken,
};

async function assignPlace(params) {
  const user = await db.User.findById(params.user);
  const place = await db.Place.findById(params.place);

  await addLog(user, "assign", place.name, place._id.toString());

  return { status: "SUCCESS" };
}

async function createAccount(params) {
  const user = await db.User.findOne({ phoneNumber: params.phoneNumber });

  if (!user) {
    return { status: LOGIN.NONEXISTENT };
  }

  const email = params.email;
  const passwordHash = hash(params.password);
  user.role = ROLE.Admin;

  Object.assign(user, { email: email, passwordHash: passwordHash });
  await user.save();

  return { status: LOGIN.SUCCESS };
}

//TODO: In the future, needs country code
async function getUserByPhone(params) {
  const user = await db.User.findOne({ phoneNumber: params.phoneNumber });

  return {
    status: "SUCCESS",
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      photo: user.photo,
    },
  };
}

async function loginWithEmail(params, ip) {
  const { email, password } = params;
  const user = await db.User.findOne({ email: email });

  if (!user) {
    return {
      status: LOGIN.NONEXISTENT,
    };
  }

  if (
    user.role !== ROLE.Admin &&
    !bcrypt.compareSync(password, user.passwordHash)
  ) {
    return {
      status: LOGIN.WRONG,
    };
  }

  await db.RefreshToken.findOneAndDelete({
    user: user._id,
    isAdminToken: true,
  });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: LOGIN.SUCCESS,
    data: {
      user: {
        id: user._id,
        email: user.email,
      },
    },
    refreshToken: newRefreshToken.token,
    jwtToken,
  };
}

async function refreshToken(token, ip) {
  const refreshToken = await getRefreshToken(token);
  const user = refreshToken.user;

  await db.RefreshToken.findOneAndDelete({
    user: user._id,
    isAdminToken: true,
  });

  const newRefreshToken = generateRefreshToken(user, ip);
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    status: TOKEN.NEW,
    data: {
      user: {
        id: user._id,
        email: user.email,
      },
      refreshToken: newRefreshToken.token,
      jwtToken,
    },
  };
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || refreshToken.isExpired) throw "Invalid token";
  return refreshToken;
}

function generateJwtToken(user) {
  return jwt.sign({ sub: user.id, id: user.id }, process.env.SECRET_OR_KEY, {
    expiresIn: "1h",
  });
}

/// Token expires after 1 day
function generateRefreshToken(user, ipAddress) {
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(40),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
    isAdminToken: true,
  });
}

function randomTokenString(number) {
  return crypto.randomBytes(number).toString("hex");
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
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
