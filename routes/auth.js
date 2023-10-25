const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Email is not valid. Please try again.")
      //.normalizeEmail() adds a sanitizer which automatically makes capital letters become lowercase, which updates after receiving an error
      .normalizeEmail(),
    body("password", "Password is not valid. Please try again.")
      .isLength({
        min: 5,
      })
      .isAlphanumeric()
      //.trim() automatically removes excess wide-space, which updates after receiving an error
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    //if this validation check fails, a message will pop up saying "Please enter a valid email".
    //^This message is now a  hardcoded value in every error object's message field concerning emails
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        //userdoc means "if there is an existing user document in the database that uses the same email"
        //if this occurs the then() promise (Promise is a built-in javascript object) will be rejected and an error message will be displayed
        //otherwise if this doesn't occur then the promise will be accepted, this helps make validation an async process using return, accessing database and promises
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject(
              "Email already exists, please pick a different one."
            );
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      //default error message for all validators concerning body password
      "Please enter a password with only numbers and text. At least 5 characters."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          //Error() is a built-in object that comes with NodeJs, and throw helps generate a custom error message
          throw new Error("Passwords have to match!");
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
