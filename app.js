const express = require("express");
const path = require("path");
const app = express();
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const passport = require("passport");
const multer = require("multer");

let userSession;

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
  },
});
const upload = multer({ storage: storage });
const PORT = 3000;

const db = new sqlite3.Database(
  "./db/book.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.log("Getting error " + err);
      exit(1);
    }
    console.log("DB connected sucessfully");
  }
);

// /*  PASSPORT SETUP  */

var userProfile;

// Session
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: "YXNkc2Fkc2Fk",
    cookie: { maxAge: 60000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

// /*  Google AUTH  */
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const { exit } = require("process");
const GOOGLE_CLIENT_ID =
  "816439540651-u7e83p9guff4v5afj5mvndqmck8jsg6a.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/google/callback`,
    },
    function (accessToken, refreshToken, profile, done) {
      userProfile = profile;
      return done(null, userProfile);
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/error" }),
  function (req, res) {
    // Successful authentication, redirect success.
    userSession = req.session;
    userSession.userId = userProfile.id;
    res.redirect("/");
  }
);

// app.get("/success", (req, res) => {
//   console.log(userProfile);
//   res.render("success", {
//     user: userProfile,
//   });
// });
app.get("/error", (req, res) => res.send("error logging in"));

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/", express.static(path.join(__dirname, "views")));

// view engine setup
app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");

// Books DB Query
const createBookQuery = `CREATE TABLE books(title, description, imageName, isPublished, userId)`;
const insertBook = `INSERT INTO books (title, description, imageName, isPublished, userId) VALUES(?,?,?,?,?)`;

db.get("SELECT * FROM books", (err, row) => {
  if (err) {
    console.error(err.message);
    createBooksDBHandler();
  } else {
    console.log("Book table exists");
    // addNewBookHandler();
    // deleteBooksHandler();
  }
});

const createBooksDBHandler = () => {
  db.run(createBookQuery);
  console.log("Book table created");
};

const addNewBookHandler = (rowData) => {
  db.run(insertBook, rowData);
  console.log("New book added");
};

const deleteBooksHandler = () => {
  db.run(`DELETE FROM books WHERE userId=1`, (err) => {
    if (err) {
      console.log(err.message);
    }
    console.log("Books records deleted successfully");
  });
};

// app.use('/vendors', express.static(__dirname + 'node_modules'));

// Homepage
app.get("/", function (req, res) {
  if (!userSession) {
    res.redirect("/login");
    return;
  } else {
    db.all("SELECT * FROM books", function (err, bookData) {
      if (err) {
        console.log(err.message);
      }
      res.render("index", {
        user: userProfile,
        books: bookData,
      });
    });
  }
});

app.get("/login", function (req, res) {
  res.render("pages/auth");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(upload.array());

app.get("/upload", (req, res) => {
  if (!userSession) {
    res.redirect("/login");
    return;
  }
  res.render("addBook", {
    user: userProfile,
  });
});

app.post("/upload", upload.single("cover_image"), (req, res) => {
  try {
    addNewBookHandler([
      req.body.title,
      req.body.description,
      req.file.filename,
      true,
      req.session.userId,
    ]);
    res.json(200).json({ message: "New book added successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Failed to upload", error: error.message });
  }
});

app.listen(PORT);
console.log("Port Connected in 3000");

// db.close((err) => {
//   if (err) {
//     console.log(err.message);
//   }
// });

exports = module.exports = app;
