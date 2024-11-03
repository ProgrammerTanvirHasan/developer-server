const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfkgk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//MIDDLEWARE FOR VERIFY
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "UnAuthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // await client.connect();

    const developersBd = client.db("developersHouse").collection("developers");
    const wishlistBd = client.db("developersHouse").collection("wishlist");
    const commentBd = client.db("developersHouse").collection("comment");
    const subscribeBd = client.db("developersHouse").collection("subscribe");

    //API RELATED
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log(user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //SERVICES RELATED API
    app.post("/developers", async (req, res) => {
      const card = req.body;
      const result = await developersBd.insertOne(card);
      res.send(result);
    });

    app.get("/developers", async (req, res) => {
      const cursor = developersBd.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/developers/:_id", async (req, res) => {
      const { _id } = req.params;

      const query = { _id: new ObjectId(_id) };
      const result = await developersBd.findOne(query);
      res.send(result);
    });

    app.patch("/developers/:_id", async (req, res) => {
      const { _id } = req.params;
      const filter = { _id: new ObjectId(_id) };
      const card = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title: card.title,
          image: card.image,
          bio: card.bio,

          description: card.description,
          category: card.category,
        },
      };

      const result = await developersBd.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // /////////////////developers close///////////////////////////////////////////////////////

    app.post("/comment", async (req, res) => {
      const card = req.body;
      
      try {
        const existingCard = await commentBd.findOne({
          email: card.email,
          title: card.title,
        });

        if (existingCard) {
          return res.status(400).json({
            message: "A comment with this email and title already exists",
          });
        }

        const result = await commentBd.insertOne(card);
        res.send(result);
      } catch (error) {
        console.error("Error inserting comment:", error);
        res.status(500).json({ message: "Error inserting comment" });
      }
    });

    app.get("/comment", async (req, res) => {
      const cursor = commentBd.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/comment/:blogId", async (req, res) => {
      const blogId = req.params.blogId;

      const cursor = commentBd.find({ blogId });
      const result = await cursor.toArray();
      res.send(result);
    });

    //////////////////////////// comment close///////////////////////////////////////////////

    app.post("/wishlist", async (req, res) => {
      const card = req.body;
      try {
        const existingCard = await wishlistBd.findOne({
          _id: card._id,
          email: card.email,
        });

        if (existingCard) {
          return res
            .status(400)
            .json({ message: "Wishlist item with this _id already exists" });
        }

        const result = await wishlistBd.insertOne(card);

        res.send(result);
      } catch (error) {
        console.error("Error inserting wishlist:", error);
        res.status(500).json({ message: "Error inserting wishlist" });
      }
    });

    app.get("/wishlist", async (req, res) => {
      const cursor = wishlistBd.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/wishlist/:email", verifyToken, async (req, res) => {
      if (req.user.email !== req.params.email) {
        return res.status(403).send({ message: "forbidden Access" });
      }

      const { email } = req.params;
      const query = { email: email };
      const cursor = wishlistBd.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // ////////////////////////wishlist close///////////////////////////////////////////

    app.post("/subscribe", async (req, res) => {
      const card = req.body;
      const result = await subscribeBd.insertOne(card);
      res.send(result);
    });
    // ///////////////////////delete from wishlist//////////////////////////////////

    app.delete("/wishlist/:_id", async (req, res) => {
      const { _id } = req.params;

      const query = { _id: _id };
      const result = await wishlistBd.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello developers");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
