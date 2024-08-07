var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
};

async function createAppCoupon(id, params) {
  let coupon = new db.Coupon({
    id: params.id,
    createdBy: id,
    description: params.description,
    amount: params.amount,
    image: "distans",
    punches: params.punches !== undefined ? params.punches : null,
    expiry: params.expiry !== undefined ? params.expiry : null,
    isAppCoupon: true,
  });

  await coupon.save();

  return { status: "SUCCESS" };
}
