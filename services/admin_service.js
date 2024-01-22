var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  bcrypt = require("bcryptjs"),
  { LOGIN, ROLE, TOKEN } = require("../components/enums"),
  db = require("../components/mongo.js");

module.exports = { createAccount, loginWithEmail, refreshToken };

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
  console.log("Cookies token: " + token);
  const refreshToken = await getRefreshToken(token);
  console.log(refreshToken);
  const user = refreshToken.user;
  console.log(user);

  await db.RefreshToken.findOneAndDelete({ user: user.id, isAdminToken: true });

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

  console.log("Function token: " + refreshToken);
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
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
