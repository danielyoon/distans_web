var db = require("../components/mongo.js");

module.exports = {
  createAppCoupon,
  getCoupons,
};

async function createAppCoupon(id, params) {
  try {
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
  } catch (error) {
    console.error("Error creating coupon:", error);
    return { status: "ERROR", message: error.message };
  }
}

async function getCoupons(id) {
  const user = await db.User.findById(id);

  return {
    status: "SUCCESS",
    data: user.coupons,
  };
}
