var jwt = require("jsonwebtoken"),
  crypto = require("crypto"),
  bcrypt = require("bcryptjs"),
  { LOGIN, ROLE } = require("../components/enums"),
  db = require("../components/mongo.js");

module.exports = { createAccount, loginWithEmail };

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
    !user.role === ROLE.Admin ||
    bcrypt.compareSync(password, user.password)
  ) {
    return {
      status: LOGIN.WRONG,
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
      },
    },
    refreshToken: newRefreshToken.token,
    jwtToken,
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
  });
}

function randomTokenString(number) {
  return crypto.randomBytes(number).toString("hex");
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
}
