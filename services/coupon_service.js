var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
};

async function createAppCoupon(id, params) {
  let coupon = new db.Coupon({
    name: params.name,
    createdBy: id,
    description: params.description,
    amount: params.amount,
    image: "distans",
    isAppCoupon: true,
  });

  console.log(coupon);

  await coupon.save();
  return { status: "SUCCESS", data: coupon };
}
