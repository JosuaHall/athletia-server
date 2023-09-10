const express = require("express");
const router = express.Router();
const config = require("config");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../../middleware/auth");
//const cloudinary = require("../../cloudinary/config");
const cloudinary = require("../../cloudinary/config");

const Organization = require("../../models/Organization");
const User = require("../../models/User");
const Sport = require("../../models/Sport");
const TeamAdminRequest = require("../../models/TeamAdminRequest");
const OrganizationAdminRequest = require("../../models/OrganizationAdminRequest");
const ChangeOrganizationAdminRequest = require("../../models/ChangeOrganizationAdminRequest");
const { model } = require("mongoose");
const { events } = require("../../models/Organization");

/*define storage for the images on local
const DIR = "./public/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
*/
//for deployment
const storage = multer.memoryStorage();
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
  limits: { fieldSize: 25 * 1024 * 1024 },
});

// @route   Post api/teams
// @desc    Load Teams
// @access  Private
router.post("/create/:id", upload.single("logo"), (req, res) => {
  const { owner, name } = req.body;
  const logo = req.file.buffer;

  if (!name || !logo) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  //check for existing user
  Organization.findOne({ name: name }).then((organization) => {
    if (organization)
      return res.status(400).json({ msg: "Organization already exists" });

    cloudinary.v2.uploader
      .upload_stream(
        { resource_type: "image", folder: "organizations" },
        (error, result) => {
          if (error) {
            return res.status(400).send(error);
          }

          const newOrganization = new Organization({
            owner,
            logo: result.url,
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
        }
      )
      .end(logo);
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
  Organization.find({ status: 1 })
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

router.get("/get/all/requested", (req, res) => {
  Organization.find({ status: 0 })
    .populate({
      path: "created_by",
      model: User,
      select: "-password",
    })
    .populate({
      path: "owner",
      model: User,
      select: "-password",
    })
    .select("-password")
    .sort({ register_date: 1 })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/all/owner/requests", (req, res) => {
  OrganizationAdminRequest.find({})
    .populate({
      path: "request_by_user",
      model: User,
      select: "-password",
    })
    .populate({
      path: "organization",
      model: Organization,
    })
    .select("-password")
    .sort({ register_date: 1 })
    .then((list) => {
      res.status(200).json(list);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/all/head/admin/change/requests", (req, res) => {
  ChangeOrganizationAdminRequest.find({})
    .populate({
      path: "requesting_admin",
      model: User,
      select: "-password",
    })
    .populate({
      path: "organization",
      model: Organization,
      populate: {
        path: "owner",
        model: User,
        select: "-password",
      },
    })
    .select("-password")
    .sort({ register_date: 1 })
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
    //const logo = req.file.filename;
    const logo = req.file.buffer;

    cloudinary.v2.uploader
      .upload_stream(
        { resource_type: "image", folder: "users" },
        (error, result) => {
          if (error) {
            return res.status(400).send(error);
          }

          User.findByIdAndUpdate(
            { _id: userid },
            { profileImg: result.url },
            { new: true }
          )
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
      )
      .end(logo);
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

router.put("/approve/ownership/:reqid/:orgid/:userid", (req, res) => {
  const reqid = req.params.reqid;
  const orgid = req.params.orgid;
  const userid = req.params.userid;

  Organization.findByIdAndUpdate(
    { _id: orgid },
    {
      owner: userid,
    }
  )
    .then((organization) => {
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      // Delete the organization admin request
      return OrganizationAdminRequest.findByIdAndDelete({ _id: reqid });
    })
    .then(() => {
      res
        .status(200)
        .json({ message: "Ownership updated and request deleted" });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.delete("/delete/ownership/request/:reqid", (req, res) => {
  const reqid = req.params.reqid;
  OrganizationAdminRequest.deleteOne({
    _id: reqid,
  })
    .then((teamAdminRequest) => {
      res.status(200).json(teamAdminRequest);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put(
  "/approve/admin/change/request/:reqid/:orgid/:userid",
  (req, res) => {
    const reqid = req.params.reqid;
    const orgid = req.params.orgid;
    const userid = req.params.userid;

    Organization.findByIdAndUpdate(
      { _id: orgid },
      {
        owner: userid,
      }
    )
      .then((organization) => {
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }
        // Delete the organization admin request
        return ChangeOrganizationAdminRequest.findByIdAndDelete({ _id: reqid });
      })
      .then(() => {
        res
          .status(200)
          .json({ message: "Ownership updated and request deleted" });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
);

router.delete("/delete/admin/change/request/:reqid", (req, res) => {
  const reqid = req.params.reqid;
  ChangeOrganizationAdminRequest.deleteOne({
    _id: reqid,
  })
    .then((organizationChangeAdminRequest) => {
      res.status(200).json(organizationChangeAdminRequest);
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

router.delete("/delete/organization/:orgid", async (req, res) => {
  const orgid = req.params.orgid;
  const organization = await Organization.findById(orgid);

  if (!organization) {
    return res.status(404).json({ msg: "Organization not found" });
  }

  const public_id = organization.logo.match(/\/([^\/]+)$/)[1].split(".")[0];

  cloudinary.v2.uploader.destroy(
    `organizations/${public_id}`,
    { resource_type: "image" },
    function (error, result) {
      if (error) {
        return res
          .status(500)
          .json({ msg: "Failed to delete image on Cloudinary" });
      }
      if (result.result === "not found") {
        return res.status(404).json({ msg: "Image not found on Cloudinary" });
      }
      // Image was successfully deleted, delete organization document
      organization.remove(function (err) {
        if (err) {
          return res
            .status(500)
            .json({ msg: "Failed to delete organization document" });
        }
        res.status(200).json({ msg: "Organization deleted" });
      });
    }
  );
});

/*
router.delete("/delete/organization/:orgid", async (req, res) => {
  const orgid = req.params.orgid;

  try {
    const organization = await Organization.findById(orgid);

    if (!organization) {
      return res.status(404).json({ msg: "Organization not found" });
    }

    const logoUrl = organization.logo;
    const publicId = logoUrl.substring(
      logoUrl.lastIndexOf("/") + 1,
      logoUrl.lastIndexOf(".")
    );

    console.log("logoUrl: ", logoUrl);
    console.log("publicId: ", publicId);
    await cloudinary.v2.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ msg: "Failed to delete image on Cloudinary" });
      }
      console.log(result);
    });

    await Organization.deleteOne({ _id: orgid });

    res.status(200).json({ msg: "Organization deleted" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ msg: "Failed to delete organization" });
  }
});*/

router.put("/approve/organization/:orgid", (req, res) => {
  const orgid = req.params.orgid;
  Organization.updateOne(
    {
      _id: orgid,
    },
    {
      status: 1,
    }
  )
    .then((result) => {
      if (result.nModified === 0) {
        return res.status(404).json({ message: "Organization not found." });
      }
      res.status(200).json(result);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

module.exports = router;
