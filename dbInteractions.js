const { connectToDatabase } = require("./db")

async function getData(key, value) {
  try {
    await connectToDatabase()

    const database = client.db("your-database-name")
    const collection = database.collection("your-collection-name")
    const result = await collection.findOne({ [key]: value })

    if (result) {
      console.log("Found document:", result)
    } else {
      console.log("Document not found")
    }
  } catch (error) {
    console.error("Error getting data by key", error)
  } finally {
    await client.close()
  }
}

async function insertData(data) {
  try {
    await connectToDatabase()

    const database = client.db("your-database-name")
    const collection = database.collection("your-collection-name")

    const result = await collection.insertOne(data)

    console.log(`Document inserted with _id: ${result.insertedId}`)
  } catch (error) {
    console.error("Error inserting data", error)
  } finally {
    await client.close()
  }
}

insertData({ "nb": "12345" })

module.exports = { getData, insertData }