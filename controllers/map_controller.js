var express = require("express"),
  router = express.Router(),
  authorize = require("../config/authorize"),
  { ROLE } = require("../components/enums"),
  mapService = require("../services/map_service");

router.post("/create-place", authorize(ROLE.Admin), createPlace);
router.post("/get-nearby-places", getNearbyPlaces);
router.post("/get-place-data", getPlaceData);
router.get("/get-private-places", authorize(), getPrivatePlaces);

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

function getNearbyPlaces(req, res, next) {
  mapService
    .getNearbyPlaces(req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getPlaceData(req, res, next) {
  mapService
    .getPlaceData(req.body)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}

function getPrivatePlaces(req, res, next) {
  mapService
    .getPrivatePlaces(req.auth.id)
    .then((result) => {
      if (result.status === "SUCCESS") {
        res.status(200).json(result.data);
      } else {
        res.sendStatus(404);
      }
    })
    .catch(next);
}
