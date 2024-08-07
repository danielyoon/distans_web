var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { ROLE } = require("../components/enums"),
  couponService = require("../services/coupon_service");

router.post("/create-app-coupon", authorize(ROLE.Admin), createAppCoupon);

module.exports = router;

function createAppCoupon(req, res, next) {
  couponService
    .createAppCoupon(req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
