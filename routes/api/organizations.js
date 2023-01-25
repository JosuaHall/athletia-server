const express = require("express");
const router = express.Router();
const config = require("config");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../../middleware/auth");

const Organization = require("../../models/Organization");
const User = require("../../models/User");
const Sport = require("../../models/Sport");
const TeamAdminRequest = require("../../models/TeamAdminRequest");
const { model } = require("mongoose");
const { events } = require("../../models/Organization");

//define storage for the images
const DIR = "./public/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

// @route   Post api/teams
// @desc    Load Teams
// @access  Private
router.post("/create/:id", upload.single("logo"), (req, res) => {
  const { owner, name } = req.body;
  const logo = req.file.filename;

  if (!name || !logo) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }
  //check for existing user
  Organization.findOne({ name: name }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Organization already exists" });

    const newOrganization = new Organization({
      owner,
      logo,
      name,
    });

    newOrganization
      .save()
      .then((organization) => {
        res.status(200).json(organization);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  });
});

router.put("/create/team/:id/:organizationid", (req, res) => {
  const organizationid = req.params.organizationid;
  const { sport } = req.body;
  //check for all fields entered
  if (!sport) {
    return res.status(400).json({ msg: "Please select a sport" });
  }

  Organization.findOne({
    _id: organizationid,
    teams: { $elemMatch: { sport: sport } },
  }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Team already exists" });

    Organization.findByIdAndUpdate(
      { _id: organizationid },
      { $addToSet: { teams: { sport } } },
      { new: true }
    )
      .then((organization) => {
        res.status(200).json(organization);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  });
});

router.put("/delete/team/:id/:org", (req, res) => {
  const orgid = req.params.org;
  const _id = req.params.id;
  var mongoose = require("mongoose");
  var objectId = mongoose.Types.ObjectId(_id);

  Organization.findOneAndUpdate(
    {
      _id: orgid,
    },
    {
      $pull: {
        teams: { _id: objectId },
      },
    },
    { new: true }
  )
    .then((organization) => {
      res.status(200).json(organization);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/list/:id", (req, res) => {
  const userid = req.params.id;
  Organization.find({ owner: userid })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/organization/:organizationid", (req, res) => {
  //const userid = req.params.userid;
  const organizationid = req.params.organizationid;
  Organization.findOne({ _id: organizationid })
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/all", (req, res) => {
  Organization.find({})
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .select("-password")
    .sort({ name: 1 })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/create/event/:teamid", (req, res) => {
  const teamid = req.params.teamid;

  const { date_time, competitor, home_away, amenities } = req.body;
  Organization.findOneAndUpdate(
    { teams: { $elemMatch: { _id: teamid } } },
    {
      $push: {
        "teams.$.events": {
          opponent: competitor,
          date_time: date_time,
          home_away: home_away,
          amenities: amenities,
        },
      },
    },
    { new: true }
  )
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/delete/event/:orgid/:teamid/:eventid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  const eventid = req.params.eventid;
  var mongoose = require("mongoose");
  var objectId = mongoose.Types.ObjectId(eventid);

  Organization.findOneAndUpdate(
    { _id: orgid, "teams._id": teamid, "teams.events._id": eventid },
    {
      $pull: {
        "teams.$.events": { _id: objectId },
      },
    },
    { new: true }
  )
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/update/event/stream/link/:orgid/:teamid/:eventid", (req, res) => {
  const orgid = req.params.orgid;
  const teamid = req.params.teamid;
  const eventid = req.params.eventid;
  var mongoose = require("mongoose");
  var oid = mongoose.Types.ObjectId(orgid);
  var tid = mongoose.Types.ObjectId(teamid);
  var eid = mongoose.Types.ObjectId(eventid);
  const { link } = req.body;

  Organization.findOneAndUpdate(
    { _id: oid, "teams._id": tid, "teams.events._id": eid },
    {
      $set: {
        "teams.$[].events.$[e].link": link,
      },
    },
    { arrayFilters: [{ "e._id": eid }], new: true }
  )
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/event/list/:teamid", (req, res) => {
  const teamid = req.params.teamid;
  Organization.findOne({ teams: { $elemMatch: { _id: teamid } } })
    .then((team) => {
      res.status(200).json(team);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/sports", (req, res) => {
  Sport.find({})
    .sort({ sport: 1 })
    .then((sports) => {
      res.status(200).json(sports);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/event/attend/:orgid/:teamid/:eventid/:userid", (req, res) => {
  const userid = req.params.userid;
  const eventid = req.params.eventid;
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  Organization.findOneAndUpdate(
    { _id: orgid, "teams._id": teamid, "teams.events._id": eventid },
    {
      $addToSet: {
        "teams.$.events.$[e].people_attending": userid,
      },
    },
    { arrayFilters: [{ "e._id": eventid }], new: true }
  )
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .select("-password")
    .then((team) => {
      res.status(200).json(team);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/event/unattend/:orgid/:teamid/:eventid/:userid", (req, res) => {
  const userid = req.params.userid;
  const eventid = req.params.eventid;
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  Organization.findOneAndUpdate(
    { _id: orgid, "teams._id": teamid, "teams.events._id": eventid },
    {
      $pull: {
        "teams.$.events.$[e].people_attending": userid,
      },
    },
    { arrayFilters: [{ "e._id": eventid }], new: true }
  )
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .select("-password")
    .then((team) => {
      res.status(200).json(team);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put(
  "/updateProfilePicture/:id",
  upload.single("profileImg"),
  (req, res) => {
    const { userid } = req.body;
    const logo = req.file.filename;
    User.findByIdAndUpdate({ _id: userid }, { profileImg: logo }, { new: true })
      .select("-password")
      .then((user) => {
        res.status(200).json({
          _id: user.id,
          name: user.name,
          email: user.email,
          profileImg: user.profileImg,
          teams_followed: user.teams_followed,
          organizations_followed: user.organizations_followed,
        });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
);

router.get("/event/attending/users/:orgid/:teamid/:eventid", (req, res) => {
  const teamid = req.params.teamid;
  const orgid = req.params.orgid;
  const eventid = req.params.eventid;
  Organization.find({
    _id: orgid,
    "teams._id": teamid,
    "teams.events._id": eventid,
  })
    .populate({
      path: "teams.events.people_attending",
      model: User,
      select: "-password",
    })
    .select("-password")
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.post(
  "/send/team/admin/request/:request_by_user/:user_recipient",
  (req, res) => {
    const { request_by_user, user_recipient, organization, team, status } =
      req.body;

    const newTeamAdminRequest = new TeamAdminRequest({
      request_by_user,
      user_recipient,
      organization,
      team,
      status,
    });

    newTeamAdminRequest
      .save()
      .then((teamAdminRequest) => {
        res.status(200).json(teamAdminRequest);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
);

router.get("/get/team/admin/requests/:request_by_user/:team", (req, res) => {
  const request_by_user = req.params.request_by_user;
  const team = req.params.team;
  TeamAdminRequest.find({ request_by_user: request_by_user, team: team })
    .populate({
      path: "user_recipient",
      model: User,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/load/team/admin/requests/:user_recipient", (req, res) => {
  const user_recipient = req.params.user_recipient;
  TeamAdminRequest.find({ user_recipient: user_recipient })
    .populate({
      path: "organization",
      model: Organization,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/accept/request/:id", (req, res) => {
  const id = req.params.id;
  TeamAdminRequest.findByIdAndUpdate(
    { _id: id },
    {
      status: 2,
    }
  )
    .populate({
      path: "organization",
      model: Organization,
      select: "-password",
    })
    .select("-password")
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.delete("/delete/team/admin/request/entry/:id", (req, res) => {
  const id = req.params.id;
  TeamAdminRequest.deleteOne({
    _id: id,
  })
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

module.exports = router;
