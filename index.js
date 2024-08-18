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

    // get a specific user:
    app.get("/user", async (req, res) => {
      try {
        const { email, password } = req?.query;
        if (!email || !password) {
          return res.send({ message: "Both email and password is required" });
        }
        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.send({ message: `User doesn't found with this email` });
        }
        if (user.password !== password) {
          return res.send({ message: `Password doesn't match` });
        }
        delete user.password;
        res.send(user);
      } catch (error) {
        res.send(error);
      }
    });

    app.get("/user-role", async (req, res) => {
      const { id, email } = req?.query;
      const user = await usersCollection.findOne(
        { _id: new ObjectId(id), email },
        { projection: { _id: 0, role: 1 } }
      );
      res.send(user);
    });

    // get all students:
    app.get("/specific-users/:role", async (req, res) => {
      const role = req.params?.role;
      if (!role) {
        return res.send({ message: "User role is needed" });
      }
      const users = await usersCollection
        .find(
          { role },
          { projection: { name: 1, role: 1, email: 1, assignedClass: 1 } }
        )
        .toArray();
      res.send(users);
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

    // remove a classroom:
    app.delete("/remove-classroom", async (req, res) => {
      const id = req.query?.id;
      if (!id) {
        return res.send({ message: "Id is required" });
      }
      const result = await classroomsCollection.deleteOne({
        _id: new ObjectId(id),
      });
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
        ...teacher,
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
        ...student,
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

    app.patch("/add-period", async (req, res) => {
      const { id, title, time } = req.body;
      if (!id || !title || !time) {
        return res.send({ message: "Title, time and id are required" });
      }

      const filter = { _id: new ObjectId(id) };
      const classroom = await classroomsCollection.findOne(filter);

      if (!classroom) {
        return res.status(404).send({ message: "Classroom not found" });
      }

      // Check if the time exists in classroom.availableTimes
      const timeIndex = classroom.availableTimes.findIndex((t) => t === time);
      if (timeIndex !== -1) {
        // Remove the time from availableTimes
        classroom.availableTimes.splice(timeIndex, 1);
        await classroomsCollection.updateOne(filter, {
          $set: { availableTimes: classroom.availableTimes },
        });
      }

      // Add the new period
      const updatedDoc = { $push: { periods: { title, time } } };
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

    // remove a student:
    app.delete("/remove-student", async (req, res) => {
      const email = req?.query?.email;
      const assignedClass = req?.query?.assignedClass;
      if (!email || !assignedClass) {
        return res.send({
          message: "Both Email and assigned class is require",
        });
      }
      const student = await usersCollection.deleteOne({ email });
      if (!student.deletedCount) {
        return res.send({ message: "User not found" });
      }
      const query = { name: assignedClass };
      const updatedDoc = {
        $pull: { students: { email } },
      };
      const result = await classroomsCollection.updateOne(query, updatedDoc);
      if (!result.modifiedCount) {
        return res.send({ message: "Student not Found" });
      }
      res.send(result);
    });

    // remove a teacher:
    app.delete("/remove-teacher", async (req, res) => {
      const email = req?.query?.email;
      const assignedClass = req?.query?.assignedClass;
      if (!email || !assignedClass) {
        return res.send({
          message: "Both Email and assigned class is require",
        });
      }
      const student = await usersCollection.deleteOne({ email });
      if (!student.deletedCount) {
        return res.send({ message: "User not found" });
      }
      const query = { name: assignedClass };
      const updatedDoc = {
        $unset: { teacher: "" },
        $set: { isTeacherHas: false },
      };
      const result = await classroomsCollection.updateOne(query, updatedDoc);
      if (!result.modifiedCount) {
        return res.send({ message: "Student not Found" });
      }
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
