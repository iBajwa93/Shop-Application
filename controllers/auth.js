const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

const User = require("../models/user");

//use an SMTP protocol (included functionality with nodemailer) to test email delivery for email addresses on a fake SMTP server by https://mailtrap.io/
//this was done to prevent flooding my actual gmail address with test emails, will not work with actual email addresses, like yahoo, gmail and outlook
let transport = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "b8f7b8e4530d16",
    pass: "a2f5af7676a2bb",
  },
});

exports.getLogin = (req, res, next) => {
  //message if conditions help prevent the error message array from staying on the login page even after page refresh
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    // this object has default placeholder values that are empty, which can be filled with oldInput values added by postSignup
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password.",
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          //if true
          if (doMatch) {
            //session stores a cookie value on the server side rather than the client-side, making it more secure
            req.session.isLoggedIn = true;
            req.session.user = user;
            //.save() will make sure the above operations have run first, before redirecting and rendering a new page,
            //syntax below must be returned because the doMatch callback executes asyncronously which may cause the page to redirect to /login in the middle of its execution
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          //if false
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password.",
            oldInput: {
              email: email,
              password: password,
            },
            validationErrors: [],
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  //collects all errors into an array of error objects which was collected from the validation middleware that was added in the postSignup route
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    //status 422 indicates that the validation has failed, the page will then refresh for the user to try again
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      //oldInput object helps keep previous user input upon page refresh (after facing an error).
      //However, in order for it to work it must first be entered as a value for each field in the associated ejs.
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  //returned bcrypt package will encrypt the entered password of the user so it is not exposed in the database
  //nested promise below will restrict then() chains to only run if we don't satisfy the if condition above
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      //after redirecting, app sends confirmation mail to the email address the user used to sign-up
      return transport.sendMail({
        to: email,
        from: "shop@node-complete.com",
        subject: "Signup succeeded",
        html: "<h1>You have successfully signed up for the shop website.</h1>",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  //destroys cookie and removes the session from the database
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    //converts hexadecimal characters generated by randomBytes into string value for the token used to reset a user's password
    //this token will be used to validate the user to access the /reset page
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email address found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        //36000 stands for miliseconds = 1 hour
        user.resetTokenExpiration = Date.now() + 36000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        //reset token is sent to the user email address through a link that a user can click to go to the /reset ejs page and reset their password
        transport.sendMail({
          to: req.body.email,
          from: "shop@node-complete.com",
          subject: "Password Reset",
          html: `<p>You have requested a password reset.</p>
          <p>Please click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          <p>Note: This link is only valid for 1 hour</p>`,
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  //finds user by token and checks if its expiration is still greater than (gt) the current date
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      //reset token for password change is sent to the ejs page,
      //this verifies that the user has been validated by clicking the link in their recieved email
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
