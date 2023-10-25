const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const errorController = require("./controllers/error.js");
const User = require("./models/user");

const MONGODB_URI =
  "mongodb+srv://Username:Password@cluster0.kepvwpe.mongodb.net/shop";

const app = express();

//memory storage for sessions are less secure and can slow applications that have high user traffic
//therefore it is best to store user sessions in a database
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    //callback (cb) will be null if there's an error or go back and see which image name/location it should have from the images folder
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    // For Date().toISOString() the character ":" is not a valid character on windows filenames, therefore it must be replaced with '-'
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  // mimetype is used as a filter for files in the destination folder to only accept the specified file extensions
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin.js");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

//if using image file upload (instead of a URL) with this bodyparser, it will fail because bodyparser will try to attempt extract a file upload as a text
//we will keep bodyparser for sign up process
app.use(bodyParser.urlencoded({ extended: false }));

//multer verifies with mixed data such as both text and binary, this is used for the image property of objects
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(express.static(path.join(__dirname, "public")));

//'/images' means that if we have a request that starts with /images, only then can we serve the other files statically,
//this prevents the URL from automatically calling files (from the 'images' folder) from root and will instead link to /images
app.use("/images", express.static(path.join(__dirname, "images")));

//in serious production, secret should be a much longer string value
//session will automatically set a cookie as a value inside the session and upload to database
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
//Used to create csrf tokens for get/post validation on ejs pages,
//which helps negate csrf attacks towards users by using fraud, copycat webpages and server manipulation
app.use(csrfProtection);

//helps with user feedback by flashing error messages
app.use(flash());

//every request which is executed will have these fields loaded into the rendered ejs views (prevents having to add them for each function in the js controllers)
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

//sessions don't allow us to use mongoose functionality to access a user class fields within a session object (besides _id, which MongoDB automatically adds)
//therefore we must locate a user object within req.session.user._id and then store the user object in req.user, this way we will
//be able to use mongoose functionality again, with .addToCart()  and .name methods for user objects in a session.
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
//no leading filter (such as "/admin"), just like shopRoutes,
//this means anything not found in shopRoutes above will be looked for within authRoutes below
app.use(authRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error);
  res.redirect("/500");
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
