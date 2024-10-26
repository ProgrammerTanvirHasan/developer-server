const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wfkgk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const developersBd = client.db("developersHouse").collection("developers");
    const wishlistBd = client.db("developersHouse").collection("wishlist");
    const commentBd = client.db("developersHouse").collection("comment");

    app.get("/developers", async (req, res) => {
      const cursor = developersBd.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/developers/:_id", async (req, res) => {
      const { _id } = req.params;
      const query = { _id: _id };
      const result = await developersBd.findOne(query);
      res.send(result);
    });

    app.post("/developers", async (req, res) => {
      const card = req.body;
      const result = await developersBd.insertOne(card);
      res.send(result);
    });

    app.patch("/developers/:_id", async (req, res) => {
      const { _id } = req.params;
      const filter = { _id: _id };
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
      const result = await commentBd.insertOne(card);
      res.send(result);
    });

    app.get("/comment", async (req, res) => {
      const cursor = commentBd.find();
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

    app.get("/wishlist/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const cursor = wishlistBd.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


    // ////////////////////////wishlist close///////////////////////////////////////////

    app.get("/top-posts", async (req, res) => {
      try {
        const topPosts = await developersBd
          .aggregate([
            {
              $addFields: {
                wordCount: { $size: { $split: ["$description", " "] } },
              },
            },
            { $sort: { wordCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                title: 1,
                image: 1,
                bio: 1,
                description: 1,
                category: 1,
                email: 1,
                time: 1,
                name: 1,
                photoURL: 1,
              },
            },
          ])
          .toArray();
        res.send(topPosts);
      } catch (error) {
        console.error("Error fetching top posts:", error);
        res.status(500).json({ message: "Error fetching top posts" });
      }
    });


  // ///////////////////////top post get///////////////////////////////////////


    app.delete("/wishlist/:_id", async (req, res) => {
      const { _id } = req.params;

      const query = { _id: _id };
      const result = await wishlistBd.deleteOne(query);
      res.send(result);
    });

    // ///////////////////////delete from wishlist//////////////////////////////////

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
  res.send("Hello developer");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
