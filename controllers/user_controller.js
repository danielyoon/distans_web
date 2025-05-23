var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { LOGIN, CHECK } = require("../components/enums"),
  userService = require("../services/user_service");

//TODO: Move functions to corresponding controllers
router.post("/check-in", checkIn);
router.post("/check-out", authorize(), checkOut);
router.post("/contact-us", authorize(), contactUs);
router.post("/create-account", createAccount);
router.post("/delete-account", authorize(), deleteAccount);
router.get("/get-logs", authorize(), getLogs);
router.post("/create-user-qr", createUserQr);
router.post("/login-with-phone-number", loginWithPhoneNumber);
router.post("/login-with-token", loginWithTokens);
router.post("/logout", authorize(), logout);
router.post("/refresh-token", refreshToken);
router.post("/test-login", testLogin);
router.post("/update-logs", authorize(), updateLogs);
router.post("/update-user-permission", authorize(), updateUserPermission);
router.post("/verify-pin-number", verifyPinNumber);

router.post("/add-friend", authorize(), addFriend);
router.get("/get-friends", authorize(), getFriends);
router.post("/post-eta", authorize(), postEta);
router.get("/get-eta", authorize(), getETA);
router.delete("/delete-eta", authorize(), deleteEta);
router.post("/create-payment-intent", createPaymentIntent);
router.post("/upgrade-account", authorize(), upgradeAccount);

module.exports = router;

function checkIn(req, res, next) {
  userService
    .checkIn(req.body)
    .then((result) => {
      if (result.status === CHECK.IN) {
        res.status(200).json(result.data);
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

function contactUs(req, res, next) {
  userService
    .contactUs(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}

function createAccount(req, res, next) {
  userService
    .createAccount(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
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

function getLogs(req, res, next) {
  userService
    .getLogs(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function createUserQr(req, res, next) {
  userService
    .createUserQr(req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

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

function loginWithTokens(req, res, next) {
  userService
    .loginWithTokens(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.status(200).json(result.data);
      } else {
        res.status(401).send("Expired token");
      }
    })
    .catch(next);
}

function logout(req, res, next) {
  userService
    .logout(req.auth.id)
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
        res.status(200).json(result.data);
      } else {
        res.status(404).send("Invalid token");
      }
    })
    .catch(next);
}

function testLogin(req, res, next) {
  userService
    .testLogin(req.body)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(401);
      }
    })
    .catch(next);
}

function updateLogs(req, res, next) {
  userService
    .updateLogs(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
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

function verifyPinNumber(req, res, next) {
  userService
    .verifyPinNumber(req.body, req.ip)
    .then((result) => {
      if (result.status === LOGIN.SUCCESS) {
        res.status(200).json(result.data);
      } else if (result.status === LOGIN.NONEXISTENT) {
        res.status(404).send("User does not exist yet");
      } else {
        res.sendStatus(401);
      }
    })
    .catch(next);
}

//TODO: Everything below this belongs in a different controller!
function addFriend(req, res, next) {
  userService
    .addFriend(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getFriends(req, res, next) {
  userService
    .getFriends(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function postEta(req, res, next) {
  userService
    .postEta(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getETA(req, res, next) {
  userService
    .getEta(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function deleteEta(req, res, next) {
  userService
    .deleteEta(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function createPaymentIntent(req, res, next) {
  userService
    .createPaymentIntent()
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function upgradeAccount(req, res, next) {
  userService
    .upgradeAccount(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
