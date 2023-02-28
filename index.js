const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const imgDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const User = require("./models/user");
const Place = require("./models/place");
const BookingModel = require("./models/bookingModel");

const app = express();

const sceretJwtKey = "76bangladesh7sahjt767sa878";
const upload = multer({ dest: "uploads/" });

// middleware
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 5000;

const tokenFromReq = (req) => {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, sceretJwtKey, {}, async (err, user) => {
      if (err) throw err;

      resolve(user);
    });
  });
};

app.get("/", (req, res) => {
  res.status(200).json("hello there!");
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const salt = bcrypt.genSaltSync(10);

    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, salt),
    });

    res.status(200).json(userDoc);
  } catch (err) {
    res.status(500).send({ message: err });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userDoc = await User.findOne({ email });

    if (userDoc) {
      const passOk = bcrypt.compareSync(password, userDoc.password);

      if (passOk) {
        jwt.sign(
          { email: userDoc.email, id: userDoc._id },
          sceretJwtKey,
          {},
          (err, token) => {
            if (err) {
              throw err;
            }

            res
              .cookie("token", token, { sameSite: "none", secure: true })
              .json(userDoc);
          }
        );
      } else {
        res.status(422).json("Pass Not Ok");
      }
    } else {
      res.status(404).json("not found");
    }
  } catch (err) {
    res.status(500).send({ message: err });
  }
});

// profile get req
app.get("/profile", async (req, res) => {
  try {
    const { token } = req.cookies;

    if (token) {
      jwt.verify(token, sceretJwtKey, {}, async (err, user) => {
        if (err) throw err;
        const { email, name, _id } = await User.findById(user.id);

        res.status(200).json({ email, name, _id });
      });
    } else {
      res.status(404).json({});
    }
  } catch (err) {
    res.status(500).send({ message: err });
  }
});

// logout
app.post("/logout", (req, res) => {
  try {
    res.cookie("token", "").json("");
  } catch (err) {
    res.status(500).send({ message: "not logout problem || " + err });
  }
});

// img download by link
app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;

  const newName = "photo" + Date.now() + ".jpg";

  await imgDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });

  res.json(newName);
});

// img upload useing multer
app.post("/upload", upload.array("photos", 100), (req, res) => {
  try {
    const uploadedFile = [];
    for (let i = 0; i < req.files.length; i++) {
      const { path, originalname } = req.files[i];
      const parts = originalname.split(".");
      const ext = parts[parts.length - 1];
      const newPath = path + "." + ext;
      fs.renameSync(path, newPath);
      const removeDirName = "uploads/";
      uploadedFile.push(newPath.substring(removeDirName.length));
    }
    res.status(200).json(uploadedFile);
  } catch (err) {
    res.status(500).json(err);
  }
});

// my accommondations form
app.post("/places", (req, res) => {
  const {
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuest,
    price,
  } = req.body;

  try {
    const { token } = req.cookies;

    jwt.verify(token, sceretJwtKey, {}, async (err, user) => {
      if (err) throw err;

      const placeDoc = await Place.create({
        owner: user.id,
        title: title,
        address: address,
        photos: addedPhotos,
        description: description,
        perks: perks,
        extraInfo: extraInfo,
        checkIn: checkIn,
        checkOut: checkOut,
        maxGuest: maxGuest,
        price: price,
      });

      res.status(200).json(placeDoc);
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// user's places list
app.get("/places", (req, res) => {
  try {
    const { token } = req.cookies;

    jwt.verify(token, sceretJwtKey, {}, async (err, user) => {
      if (err) throw err;
      const { id } = user;
      const allPlaces = await Place.find({ owner: id });
      res.status(200).json(allPlaces);
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// single data
app.get("/places/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const singlePlace = await Place.findById(id);
    res.status(200).json(singlePlace);
  } catch (err) {
    res.status(500).json(err);
  }
});

// update places
app.put("/places", (req, res) => {
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuest,
    price,
  } = req.body;

  const { token } = req.cookies;

  try {
    jwt.verify(token, sceretJwtKey, {}, async (err, user) => {
      if (err) throw err;

      const placesDoc = await Place.findById(id);

      if (placesDoc.owner.toString() === user.id) {
        placesDoc.set({
          title: title,
          address: address,
          photos: addedPhotos,
          description: description,
          perks: perks,
          extraInfo: extraInfo,
          checkIn: checkIn,
          checkOut: checkOut,
          maxGuest: maxGuest,
          price: price,
        });

        await placesDoc.save();
        res.json(placesDoc);
      }
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// get all places
app.get("/all-place", async (req, res) => {
  try {
    const allPlaces = await Place.find();
    res.status(200).json(allPlaces);
  } catch (err) {
    res.status(500).json(err);
  }
});

// bookings
app.post("/bookings", async (req, res) => {
  const userData = await tokenFromReq(req);
  try {
    const { place, checkIn, checkOut, name, mobile, price, guestNumber } =
      req.body;
    const doc = await BookingModel.create({
      place,
      checkIn,
      checkOut,
      name,
      mobile,
      price,
      guestNumber,
      user: userData.id,
    });

    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get bookings
app.get("/bookings", async (req, res) => {
  try {
    const userData = await tokenFromReq(req);

    const bookings = await BookingModel.find({ user: userData.id }).populate(
      "place"
    );

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json(err);
  }
});

// DATABASE AND SERVER
mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `Database is connected || server runing on http://localhost:${PORT}`
      );
    });
  })
  .catch((err) => {
    console.log(err);
  });
