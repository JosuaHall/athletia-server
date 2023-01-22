const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");
const auth = require("../../middleware/auth");

//User Model
const User = require("../../models/User");
const Organization = require("../../models/Organization");

// @route   Post api/auth
// @desc    Auth user
// @access  Public
router.post("/", (req, res) => {
  const { email, password } = req.body;

  //Simple validation
  if (!email || !password) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  if (email)
    //check for existing user
    User.findOne({ email })
      .populate({
        path: "organizations_followed",
        model: Organization,
      })
      .then((user) => {
        if (!user) return res.status(400).json({ msg: "User Does not exist" });

        //Validate password
        bcrypt.compare(password, user.password).then((isMatch) => {
          if (!isMatch)
            return res.status(400).json({ msg: "Invalid credentials" });

          jwt.sign(
            { id: user.id },
            config.get("jwtSecret"),
            {
              expiresIn: 7200,
            },
            (err, token) => {
              if (err) throw err;
              res.json({
                token,
                user: {
                  _id: user.id,
                  name: user.name,
                  email: user.email,
                  profileImg: user.profileImg,
                  teams_followed: user.teams_followed,
                  organizations_followed: user.organizations_followed,
                },
              });
            }
          );
        });
      });
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get("/user", auth, (req, res) => {
  User.findById(req.user.id)
    .populate({
      path: "organizations_followed",
      model: Organization,
    })
    .select("-password")
    .then((user) => res.json(user));
});

module.exports = router;
