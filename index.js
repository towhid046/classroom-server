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

    // create a new classroom
    app.post("/classroom", async (req, res) => {
      const newClassroom = req.body;
      newClassroom.students = [];
      newClassroom.name.trim();
      const isClassroomExist = await classroomsCollection.findOne({
        name: newClassroom?.name,
      });
      if (isClassroomExist) {
        return res.send({ message: "A classroom is exist with this name" });
      }
      const result = await classroomsCollection.insertOne({
        ...newClassroom,
        isTeacherHas: false,
      });
      res.send(result);
    });

    // get all classrooms
    app.get("/classrooms", async (req, res) => {
      const result = await classroomsCollection.find().toArray();
      res.send(result);
    });

    // save a teacher
    app.patch("/add-teacher", async (req, res) => {
      const teacher = req.body;
      const isEmailExist = await usersCollection.findOne({
        email: teacher?.email,
      });
      if (isEmailExist) {
        return res.send({ message: "Email is existed" });
      }
      const resp = await usersCollection.insertOne({
        email: teacher?.email,
        password: teacher?.password,
        role: "teacher",
      });
      if (!resp.insertedId) {
        return res.send({ message: "Something went wrong" });
      }
      delete teacher.password;
      const updatedDoc = {
        $set: { isTeacherHas: true, teacher: { ...teacher } },
      };
      const result = await classroomsCollection.updateOne(
        { name: teacher.assignedClass },
        updatedDoc
      );
      res.send(result);
    });

    // save a student
    app.patch("/add-student", async (req, res) => {
      const student = req.body;
      const isEmailExist = await usersCollection.findOne({
        email: student?.email,
      });
      if (isEmailExist) {
        return res.send({ message: "Email is existed" });
      }
      const resp = await usersCollection.insertOne({
        email: student?.email,
        password: student?.password,
        role: "student",
      });
      if (!resp.insertedId) {
        return res.send({ message: "Something went wrong" });
      }
      delete student.password;

      const filter = { name: student?.assignedClass };
      const updatedDoc = { $push: { students: student } };
      const result = await classroomsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get all class names where teacher is not assigned
    app.get("/classroom-names", async (req, res) => {
      try {
        const options = {
          projection: { _id: 0, name: 1 },
        };
        const result = await classroomsCollection
          .find({ isTeacherHas: false }, options)
          .toArray();
        const names = result?.map((classroom) => classroom.name);
        res.send(names);
      } catch (error) {
        res.send(error);
      }
    });

    // get all class names:
    app.get("/classroom-names-all", async (req, res) => {
      try {
        const options = {
          projection: { _id: 0, name: 1 },
        };
        const result = await classroomsCollection.find({}, options).toArray();
        const names = result?.map((classroom) => classroom.name);
        res.send(names);
      } catch (error) {
        res.send(error);
      }
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
