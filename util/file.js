const fs = require("fs");

//this exported function will help with deleting files (such as images) in the app folder
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;
