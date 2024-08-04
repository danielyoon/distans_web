var db = require("../components/mongo.js");
// { v4: uuidv4 } = require("uuid");

module.exports = {
  createAppCoupon,
  createCoupon,
  getCoupons,
  getPlaceCoupons,
  redeemCoupon,
  deleteCoupon,
};

//TODO: Use app logo for this
async function createAppCoupon(params) {
  let coupon = new db.Coupon({
    id: params.id,
    placeId: "distans",
    description: params.description,
    amount: params.amount !== undefined ? params.amount : 0,
    image: params.image !== undefined ? params.image : null,
    punches: params.punches !== undefined ? params.punches : null,
    expiry: params.expiry !== undefined ? params.expiry : null,
  });

  await coupon.save();

  return { status: "SUCCESS" };
}

async function createCoupon(id, params) {}

async function getCoupons(id) {}

async function getPlaceCoupons(id) {}

async function redeemCoupon(id, params) {}

async function deleteCoupon(id, params) {}
