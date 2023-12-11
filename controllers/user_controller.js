var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { LOGIN, CHECK } = require("../components/enums"),
  userService = require("../services/user_service");

router.post("/login-with-phone-number", loginWithPhoneNumber);
router.post("/verify-pin-number", verifyPinNumber);
router.post("/login-with-token", loginWithTokens);
router.post("/create-account", createAccount);
router.post("/update-user-permission", authorize(), updateUserPermission);
router.post("/logout", authorize(), logout);
router.post("/delete-account", authorize(), deleteAccount);
router.post("/contact-us", authorize(), contactUs);
router.post("/refresh-token", refreshToken);
router.post("/check-in", authorize(), checkIn);
router.post("/check-out", authorize(), checkOut);

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

function updateUserPermission(req, res, next) {
  userService
    .updateUserPermission(req.auth.id, req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function logout(req, res, next) {
  userService
    .logout(req.auth.id, req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.sendStatus(200);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}

function deleteAccount(req, res, next) {
  userService
    .deleteAccount(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}

function contactUs(req, res, next) {
  userService
    .deleteAccount(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
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

function checkIn(req, res, next) {
  userService
    .checkIn(req.auth.id, req.body)
    .then((result) => {
      if (result.status === CHECK.IN) {
        res.json(result.data);
      } else {
        res.status(404).send("No place exists");
      }
    })
    .catch(next);
}

function checkOut(req, res, next) {
  userService
    .checkOut(req.auth.id)
    .then((result) => {
      if (result.status === CHECK.OUT) {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
