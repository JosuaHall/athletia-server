const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema({
  logo: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  register_date: {
    type: Date,
    default: Date.now,
  },
  teams: [
    {
      sport: {
        type: String,
        required: false,
      },
      access_code: {
        type: Number,
        required: false,
      },
      admin: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      events: [
        {
          date_time: {
            type: Date,
            offset: true,
          },
          opponent: {
            type: String,
            required: true,
          },
          home_away: {
            type: String,
            required: true,
          },
          link: {
            type: String,
            required: false,
          },
          expected_attendance: {
            type: Number,
          },
          people_attending: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          ],
          amenities: [String],
        },
      ],
    },
  ],
});

module.exports = Organization = mongoose.model(
  "organization",
  OrganizationSchema
);
