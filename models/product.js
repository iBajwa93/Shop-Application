const mongoose = require("mongoose");

//constructor allows us to create new schemas
const Schema = mongoose.Schema;

//mongoose requires data schemas to be defined before they can be used
//object IDs are automatically added, therefore they need no definition
const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  //refers to the user object model
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

//Mongoose will automatically pluralize the defined model name ('Product') for a collection name
module.exports = mongoose.model("Product", productSchema);

// const mongodb = require("mongodb");

// //calls a function that helps us get access and interact with our mongoDb database
// const getDb = require("../util/database").getDb;

// class Product {
//   constructor(title, price, description, imageUrl, id, userId) {
//     this.title = title;
//     this.price = price;
//     this.imageUrl = imageUrl;
//     this.description = description;
//     //if an id value exists, then make _id (which is an object ID) use that value, else _id  value will be null
//     //this check prevents _id from always being defined before an Product object is even created in save()
//     this._id = id ? new mongodb.ObjectId(id) : null;
//     this.userId = userId;
//   }
//   save() {
//     const db = getDb();
//     let dbOp;
//     //if _id is already defined (meaning if an object already exists with this _id)
//     if (this._id) {
//       //Update the product
//       dbOp = db
//         .collection("products")
//         // object ID field is used to locate the existing database object
//         // $set updates values specified using curly brackets, in this case we update everything in this object
//         //The ID field will not be overwriten by $set, only the other fields are based on user inputs
//         .updateOne({ _id: this._id }, { $set: this });
//     } else {
//       //Create a product
//       dbOp = db.collection("products").insertOne(this);
//     }
//     return dbOp
//       .then((result) => {
//         console.log(result);
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }
//   static fetchAll() {
//     const db = getDb();
//     return (
//       db
//         //find() will retrieve all objects in products and then put them in an array
//         .collection("products")
//         .find()
//         .toArray()
//         .then((products) => {
//           console.log(products);
//           return products;
//         })
//         .catch((err) => console.log(err))
//     );
//   }

//   static findById(prodId) {
//     const db = getDb();
//     return (
//       db
//         .collection("products")
//         //Mongodb stores id in '_id' NOT 'id'. Remember that it uses an underscore.
//         //find() is used to locate the specified ID object that contains prodId
//         .find({ _id: new mongodb.ObjectId(prodId) })
//         .next()
//         .then((product) => {
//           console.log(product);
//           return product;
//         })
//         .catch((err) => console.log(err))
//     );
//   }

//   static deleteById(prodId) {
//     const db = getDb();
//     return db
//       .collection("products")
//       .deleteOne({ _id: new mongodb.ObjectId(prodId) })
//       .then((result) => {
//         console.log("Deleted");
//       })
//       .catch((err) => console.log(err));
//   }
// }

// module.exports = Product;
