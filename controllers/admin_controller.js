var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { LOGIN, ROLE } = require("../components/enums"),
  adminService = require("../services/admin_service");

router.post("/create-account", authorize(ROLE.Admin), createAccount);
router.post("/login-with-email", loginWithEmail);
// router.post("/refresh-token", refreshToken);

module.exports = router;

function createAccount(req, res, next) {
  adminService
    .createAccount(req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function loginWithEmail(req, res, next) {
  adminService
    .loginWithEmail(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        console.log("TESTING");
        console.log(result);
        console.log("------------");
        console.log(result.refreshToken);
        setTokenCookie(res, result.refreshToken);
        res.json({ user: result.data.user, token: result.jwtToken });
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function setTokenCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  };
  res.cookie("refreshToken", token, cookieOptions);
}
