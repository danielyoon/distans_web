var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
};

//TODO: Use app logo for this
async function createAppCoupon(params) {
  console.log(params);

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
