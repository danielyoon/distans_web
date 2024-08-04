const { expressjwt: jwt } = require("express-jwt");
const secret = process.env.SECRET_OR_KEY;
const db = require("../components/mongo");

module.exports = authorize;

function authorize(roles = []) {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return [
    jwt({
      secret,
      algorithms: ["HS256"],
    }),

    async (req, res, next) => {
      try {
        console.log("Authorization middleware called");
        console.log("Roles required:", roles);
        console.log("Request headers:", req.headers);

        const user = await db.User.findById(req.auth.id);

        if (!user) {
          console.error("User not found");
          return res.status(401).json({ message: "Unauthorized" });
        }

        console.log("User found:", user);
        if (roles.length && !roles.includes(user.role)) {
          console.error(
            `User role (${user.role}) not authorized for roles: ${roles.join(
              ", "
            )}`
          );
          return res.status(401).json({ message: "Unauthorized" });
        }

        req.auth.role = user.role;

        const refreshTokens = await db.RefreshToken.find({ user: user.id });
        if (!refreshTokens) {
          console.error("No refresh tokens found for user");
        }

        req.auth.ownsToken = (token) =>
          !!refreshTokens.find((x) => x.token === token);
        next();
      } catch (error) {
        console.error("Authorization error:", error);
        return res.status(401).json({ message: "Unauthorized" });
      }
    },
  ];
}
