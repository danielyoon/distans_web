var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { LOGIN } = require("../components/enums"),
  userService = require("../services/user_service");

router.post("/login-with-phone-number", loginWithPhoneNumber);
router.post("/verify-pin-number", verifyPinNumber);
router.post("/login-with-token", loginWithTokens);
router.post("/create-account", createAccount);
router.post("/logout", authorize(), logout);
router.post("/refresh-token", refreshToken);

module.exports = router;

function loginWithPhoneNumber(req, res, next) {
  userService
    .loginWithPhoneNumber(req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function verifyPinNumber(req, res, next) {
  userService
    .verifyPinNumber(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.json(result.data);
      } else if (result.status === LOGIN.NONEXISTENT) {
        res.status(404).send("User does not exist yet");
      } else {
        res.sendStatus(401);
      }
    })
    .catch(next);
}

function loginWithTokens(req, res, next) {
  userService
    .loginWithTokens(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.json(result.data);
      } else {
        res.status(401).send("Expired token");
      }
    })
    .catch(next);
}

function createAccount(req, res, next) {
  userService
    .createAccount(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function logout(req, res, next) {
  userService
    .logout(req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.sendStatus(200);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}

function refreshToken(req, res, next) {
  userService
    .refreshToken(req.body, req.ip)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.json(result.data);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}