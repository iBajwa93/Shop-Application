const path = require("path");

const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin.js");

//any get request with isAuth will redirect if you are not logged in and attempt to access the route by entering the URL link manually
const isAuth = require("../middleware/is-auth");

const router = express.Router();

//request will go into the isAuth imported middleware for verification before either showing an accessible hyperlink for the get route
//or removing the hyperlink from being visible on the navigation bar

// URL is actually /admin/add-product (due to app.js) => GET
router.get("/add-product", isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, adminController.getProducts);

// URL is actually /admin/add-product (due to app.js) => POST
router.post(
  "/add-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 1, max: 400 }).trim(),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

// //data is enclosed in the post request being sent,
// //No dynamic specification (such as productID) is needed for a post request
router.post(
  "/edit-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 1, max: 400 }).trim(),
  ],
  isAuth,
  adminController.postEditProduct
);

//we are now sending requests through javascript JSON file, thus we now use .delete() instead of post for our route. This allows for Async requests.
router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
