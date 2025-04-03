import { body } from "express-validator";

export const artistProfileValidator = [
    body("artistName").notEmpty().withMessage("Artist name is required").trim(),
    body("genres")
      .isArray({ min: 1 })
      .withMessage("At least one genre must be provided"),
    body("genres.*")
      .isIn([
        "pop",
        "rock",
        "jazz",
        "hip-hop",
        "electronic",
        "classical",
        "folk",
        "reggae",
        "r&b",
        "country",
        "blues",
        "other",
      ])
      .withMessage("Invalid genre"),
    body("bio")
      .notEmpty()
      .withMessage("Bio is required")
      .isLength({ max: 1000 })
      .withMessage("Bio cannot exceed 1000 characters"),
    body("location").notEmpty().withMessage("Location is required"),
    body("rate.amount")
      .isNumeric()
      .withMessage("Rate must be a number")
      .custom((value) => value > 0)
      .withMessage("Rate must be greater than zero"),
    body("rate.currency")
      .optional()
      .isString()
      .withMessage("Currency must be a string"),
    body("rate.per")
      .optional()
      .isIn(["hour", "performance", "day"])
      .withMessage("Rate per must be hour, performance, or day"),
    body("availability.availableDays")
      .optional()
      .isArray()
      .withMessage("Available days must be an array"),
    body("availability.availableDays.*")
      .optional()
      .isIn([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ])
      .withMessage("Invalid day of the week"),
  ];