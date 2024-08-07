var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
};

async function createAppCoupon(id, params) {
  console.log(id);
  console.log(params);

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

  console.log("Coupon:");
  console.log(coupon);

  try {
    await coupon.save();
    return { status: "SUCCESS", data: coupon };
  } catch (error) {
    console.error("Error saving coupon:", error);
    return { status: "ERROR", error: error.message };
  }
}
