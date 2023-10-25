const deleteProduct = (btn) => {
  //parentNode will located the tag that is the parent of the btn tag in products.ejs
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  //.closest() locates the closest element in the ejs with the specified tag name (in this case it's "article"),
  const productElement = btn.closest("article");

  fetch("/admin/product/" + prodId, {
    //upper-case for method value is good convention in programming
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      return result.json();
    })
    .then((data) => {
      console.log(data);
      //node will now locate the closest article tag near the referenced list item's btn and remove it, thus removing the entire list item
      productElement.parentNode.removeChild(productElement);
    })
    .catch((err) => {
      console.log(err);
    });
};
