const mongoose = require("mongoose");
const product = require("./product");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    //must convert product._id ToString to match with cp.productId else the quantity won't be incremented
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = 1;
  //adds current cart items array into updatedCartItems
  const updatedCartItems = [...this.cart.items];

  //if the item already exists in the cart, its quantity will be incremented in the array
  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    //adds a new item in the array
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }
  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.removeFromCart = function (productId) {
  //filters all items that do not match the productId we are looking for
  //This will add all filtered items into an array that will update the cart.items
  //the matching productId will be left out of the new array, thus meaning it gets deleted
  const updatedCartItems = this.cart.items.filter((item) => {
    return item.productId.toString() !== productId.toString();
  });
  this.cart.items = updatedCartItems;
  return this.save();
};

//adding an empty array to the cart.items
userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);

// const mongodb = require("mongodb");
// const getDb = require("../util/database").getDb;

// const ObjectId = mongodb.ObjectId;

// class User {
//   constructor(username, email, cart, id) {
//     this.name = username;
//     this.email = email;
//     this.cart = cart; // {items: []}
//     this._id = id;
//   }

//   save() {
//     const db = getDb();
//     return db.collection("users").insertOne(this);
//   }

//   addToCart(product) {
//     const cartProductIndex = this.cart.items.findIndex((cp) => {
//       //must convert product._id ToString to match with cp.productId else the quantity won't be incremented
//       return cp.productId.toString() === product._id.toString();
//     });
//     let newQuantity = 1;
//     //adds current cart items array into updatedCartItems
//     const updatedCartItems = [...this.cart.items];

//     //if the item already exists in the cart, its quantity will be incremented in the array
//     if (cartProductIndex >= 0) {
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//     } else {
//       //adds a new item in the array
//       updatedCartItems.push({
//         productId: new ObjectId(product._id),
//         quantity: newQuantity,
//       });
//     }
//     const updatedCart = {
//       items: updatedCartItems,
//     };
//     const db = getDb();
//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new ObjectId(this._id) },
//         { $set: { cart: updatedCart } }
//       );
//   }

//   getCart() {
//     const db = getDb();
//     //maps an array of cart items into an array of just their productId strings, which is then stored in productIds
//     const productIds = this.cart.items.map((i) => {
//       return i.productId;
//     });
//     return (
//       db
//         .collection("products")
//         //$in takes in an array of all elements that are in the productIds array
//         //we use find() to look for all of the elements that match _id string and make a new array from it (using toArray())
//         .find({ _id: { $in: productIds } })
//         .toArray()
//         .then((products) => {
//           //After using toArray() to locate all productIds, map() will go through the created products array
//           //It will find the quantity of the matching item id it is looking for
//           //which can only be located and compared if the ids are a similar data type, such as a string in this case
//           return products.map((p) => {
//             return {
//               ...p,
//               quantity: this.cart.items.find((i) => {
//                 return i.productId.toString() === p._id.toString();
//               }).quantity,
//             };
//           });
//         })
//     );
//   }

//   deleteItemFromCart(productId) {
//     //filters out elements in the array based on the criteria, it will then return a new array with the filtered items
//     const updatedCartItems = this.cart.items.filter((item) => {
//       //makes an array of all the items with productIds that do not match our productId argument,
//       //thus leaving out and deleting the product that does match the productId we are looking for
//       return item.productId.toString() !== productId.toString();
//     });
//     const db = getDb();
//     return (
//       db
//         .collection("users")
//         //updated the cart to have all cart items except for the one that was deleted
//         .updateOne(
//           { _id: new ObjectId(this._id) },
//           { $set: { cart: { items: updatedCartItems } } }
//         )
//     );
//   }

//   addOrder() {
//     const db = getDb();
//     return (
//       this.getCart()
//         .then((products) => {
//           //retrieve cart items and user fields
//           const order = {
//             items: products,
//             user: {
//               _id: new ObjectId(this._id),
//               name: this.name,
//             },
//           };
//           db.collection("orders").insertOne(order);
//         })
//         //empty the cart after entering it in the order collection and update the users collection in the database
//         .then((result) => {
//           this.cart = { items: [] };
//           return db
//             .collection("users")
//             .updateOne(
//               { _id: new ObjectId(this._id) },
//               { $set: { cart: { items: [] } } }
//             );
//         })
//     );
//   }

//   getOrders() {
//     const db = getDb();
//     return db
//       .collection("orders")
//       .find({ "user._id": new ObjectId(this._id) })
//       .toArray();
//   }
//   static findById(userId) {
//     const db = getDb();
//     return db
//       .collection("users")
//       .findOne({ _id: new ObjectId(userId) })
//       .then((user) => {
//         console.log(user);
//         return user;
//       })
//       .catch((err) => console.log(err));
//   }
// }

// module.exports = User;
