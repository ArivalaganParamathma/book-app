function saveBook() {
  var formElement = document.querySelector("#upload_form");
  const formData = new FormData(formElement);

  fetch("/upload", {
    method: "POST",
    body: formData,
  }).then(res => {
      alert("Book created successfully");
      window.location.href = '/';
  }).catch(err => alert(err.message));
}
