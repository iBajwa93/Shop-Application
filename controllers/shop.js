const fs = require("fs");
const path = require("path");

//always keep the stripe key PRIVATE! Do not expose the key in the frontend views files, otherwise users will see it and have access to stripe payments
//to enter a dummy credit card for testing the stripe page, enter 4242 4242 4242 4242, it will no longer ask for a valid credit card if you do this
const stripe = require("stripe")(
  "sk_test_51MQ21hLUnN1f6G5LOZIb42bG4CanGgbcGwAxygAaAB6U0HZiBenNTJXu5HaoA5KhgaxbLy9bRASCHC92abX9C0QV00ucJe48x4"
);

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      //skip() will skip all items available to the previous page number and only limit the display to the current available items for the current page
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  //findById() is a built-in function from Mongoose and needs no user definition to create it
  //along with integers, it also handles strings
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  //stores a page number from the index.ejs /?page
  // the + turns req.query.page value into a number instead of a string, thus allowing it to be used for calculation
  //the || 1 means that if req.query.page is undefined or does not hold a true value, it will automatically be assigned as 1 (this prevents NaN value)
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      //skip() will skip all items available to the previous page number and only limit the display to the current available items for the current page
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    //fetch all product details related to productId inside the User cart field
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let total = 0;
  req.user
    .populate("cart.items.productId")
    //then() will nest another then() in order to have the 'products' variable carry over to it (so it doesn't become 'undefined' in the ejs render)
    .then((user) => {
      const products = user.cart.items;
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      //certain variables and lines like 'price_data' and 'product_data' have been added/edited due to stripe api upgrades, older methods no longer work
      return stripe.checkout.sessions
        .create({
          //'card' means we accept credit card payments
          payment_method_types: ["card"],
          mode: "payment",
          line_items: products.map((p) => {
            return {
              quantity: p.quantity,
              price_data: {
                unit_amount: p.productId.price * 100,
                currency: "usd",
                product_data: {
                  name: p.productId.title,
                  description: p.productId.description,
                },
              },
            };
          }),
          // the req.protocol concatenation builds an http://localhost:3000 setup
          success_url:
            req.protocol + "://" + req.get("host") + "/checkout/success",
          cancel_url:
            req.protocol + "://" + req.get("host") + "/checkout/cancel",
        })
        .then((session) => {
          res.render("shop/checkout", {
            path: "/checkout",
            pageTitle: "Checkout",
            products: products,
            totalSum: total,
            sessionId: session.id,
          });
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      //empty the cart after placing an order
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      //empty the cart after placing an order
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  //params refers to anything in the URL, therefore we are refrencing the order ID number in the address URL
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      //checks to see if the order exists and if the order object is linked to the correct logged-in user._id before allowing the order invoice file to be viewed
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      //path module helps locate the file (which starts looking from the root folder) and allows the app function to work on all operating systems
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();

      //order details are written into a data file and then sent into a response, to become a linked file from the ejs <a href> tag
      //file is read-streamed, this reads in the file step-by-step in chunks, this prevents delayed responses if reading big data and an overflow of memory

      //setHeader adds the proper file extension and name to the invoice file, inline allows the file to be opened in a new page
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );
      //pipe generates a readwrite stream with text, which is later sent into a response
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      //loop through each product in the order and list all the order properties in a pdf text
      pdfDoc.text("--------------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          );
      });
      pdfDoc.text("-----");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);
      //end() signals to node when we are done writing to the stream pdf file
      pdfDoc.end();
    })
    .catch((err) => next(err));
};
