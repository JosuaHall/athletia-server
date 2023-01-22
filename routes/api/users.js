const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");

//User Model
const User = require("../../models/User");
const Organization = require("../../models/Organization");

// @route   Post api/users
// @desc    Register new Users
// @access  Public
router.post("/", (req, res) => {
  const { name, email, password } = req.body;

  //Simple validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }
  let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");
  if (!regex.test(email)) {
    return res.status(400).json({ msg: "Please enter a valid email address" });
  }
  //check for existing user
  User.findOne({ email }).then((user) => {
    if (user) return res.status(400).json({ msg: "User already exists" });

    const newUser = new User({
      name,
      email,
      password,
    });

    //Create salt & hash
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newUser.password, salt, (err, hash) => {
        if (err) throw err;
        newUser.password = hash;
        newUser.save().then((user) => {
          jwt.sign(
            { id: user.id },
            config.get("jwtSecret"),
            {
              expiresIn: 3600,
            },
            (err, token) => {
              if (err) throw err;
              res.json({
                token,
                user: {
                  _id: user.id,
                  name: user.name,
                  email: user.email,
                  profielImg: user.profielImg,
                  teams_followed: user.teams_followed,
                  organizations_followed: user.organizations_followed,
                },
              });
            }
          );
        });
      });
    });
  });
});

router.put("/follow/team/:userid/:orgid/:teamid", (req, res) => {
  const { teamid, orgid } = req.body;
  const userid = req.params.userid;

  User.findOneAndUpdate(
    { _id: userid },
    {
      $addToSet: {
        teams_followed: teamid,
        organizations_followed: orgid,
      },
    },
    { new: true }
  )
    .populate({
      path: "organizations_followed",
      model: Organization,
    })
    .select("-password")
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.put("/unfollow/team/:userid/:orgid/:teamid", (req, res) => {
  const { teamid, orgid } = req.body;
  const userid = req.params.userid;

  User.findByIdAndUpdate(
    { _id: userid },
    {
      $pull: {
        teams_followed: teamid,
        organizations_followed: orgid,
      },
    },
    { new: true }
  )
    .populate({
      path: "organizations_followed",
      model: Organization,
    })
    .select("-password")
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.get("/get/filtered/users", (req, res) => {
  let search_string = req.query.name;

  User.find({ name: new RegExp(search_string, "i") })
    .select("-password")
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

module.exports = router;
