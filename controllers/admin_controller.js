var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { LOGIN, ROLE, TOKEN } = require("../components/enums"),
  adminService = require("../services/admin_service");

router.post("/assign-place", authorize(ROLE.Admin), assignPlace);
router.post("/create-account", authorize(ROLE.Admin), createAccount);
router.post("/get-user-by-phone", authorize(ROLE.Admin), getUserByPhone);
router.post("/login-with-email", loginWithEmail);
router.get("/refresh-token", refreshToken);

module.exports = router;

function assignPlace(req, res, next) {
  adminService
    .assignPlace(req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

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

function getUserByPhone(req, res, next) {
  adminService
    .getUserByPhone(req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.status(200).json(result.data);
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
        setTokenCookie(res, result.refreshToken);
        res
          .status(200)
          .json({ user: result.data.user, token: result.jwtToken });
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function refreshToken(req, res, next) {
  console.log(req.cookies);

  const token = req.cookies.refreshToken;

  if (!token) {
    return res.sendStatus(404);
  }
  adminService
    .refreshToken(token, req.ip)
    .then((result) => {
      if (result.status === TOKEN.NEW) {
        setTokenCookie(res, result.refreshToken);
        res
          .status(200)
          .json({ user: result.data.user, token: result.jwtToken });
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
