var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { ROLE } = require("../components/enums"),
  couponService = require("../services/coupon_service");

router.post("/create-app-coupon", authorize(ROLE.Admin), createAppCoupon);
router.post("/create-coupon", authorize(), createCoupon);
router.get("/get-coupons", authorize(), getCoupons);
router.post("/get-place-coupons", authorize(), getPlaceCoupons);
router.post("/redeem-coupon", authorize(), redeemCoupon);
router.post("/delete-coupon", authorize(), deleteCoupon);

module.exports = router;

function createAppCoupon(req, res, next) {
  console.log(req.body);

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

function createCoupon(req, res, next) {
  couponService
    .createCoupon(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getCoupons(req, res, next) {
  couponService
    .getCoupons(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getPlaceCoupons(req, res, next) {
  couponService
    .getPlaceCoupons(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function redeemCoupon(req, res, next) {
  couponService
    .redeemCoupon(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function deleteCoupon(req, res, next) {
  couponService
    .deleteCoupon(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
