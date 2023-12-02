var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  mapService = require("../services/map_service");

router.post("/create-place", authorize(), createPlace);

module.exports = router;

function createPlace(req, res, next) {
  mapService
    .createPlace(req.auth.id, req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.sendStatus(200);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
