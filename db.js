const { MongoClient } = require("mongodb")

const connectionString =
  "mongodb+srv://nbUser:nbPass@nb.nw8zuui.mongodb.net/"
const client = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

async function connectToDatabase() {
  try {
    await client.connect()
    console.log("Connected to the MongoDB server")
  } catch (error) {
    console.error("Error connecting to the MongoDB server", error)
  }
}

connectToDatabase()

module.exports = {connectToDatabase}