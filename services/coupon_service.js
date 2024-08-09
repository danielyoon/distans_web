var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
  getCoupons,
};

async function createAppCoupon(id, params) {
  console.log(params);

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

async function getCoupons(id) {
  const user = await db.User.findById(id);

  return {
    status: "SUCCESS",
    data: user.coupons,
  };
}
