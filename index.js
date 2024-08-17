const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT | 5000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q1nysvk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(
  cors({
    origin: ["http://localhost:5173"],
  })
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Classroom server is running...");
});

async function run() {
  const usersCollection = client.db("classroomDB").collection("users");
  const teachersCollection = client.db("classroomDB").collection("teachers");
  const classroomsCollection = client
    .db("classroomDB")
    .collection("classrooms");
  try {
    app.post("/user", async (req, res) => {
      const user = req.body;
      const isUserExist = await usersCollection.findOne({ email: user?.email });
      if (isUserExist) {
        return res.send({ message: "User already exist with this email" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.post("/classroom", async (req, res) => {
      const newClassroom = req.body;
      newClassroom.name.trim();
      const isClassroomExist = await classroomsCollection.findOne({
        name: newClassroom?.name,
      });
      if (isClassroomExist) {
        return res.send({ message: "A classroom is exist with this name" });
      }
      const result = await classroomsCollection.insertOne(newClassroom);
      res.send(result);
    });

    app.get("/classrooms", async (req, res) => {
      const result = await classroomsCollection.find().toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Classroom server is running on port: ${port}`);
});
