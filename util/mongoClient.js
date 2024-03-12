const { MongoClient } = require("mongodb");

const mongoClient = new MongoClient(process.env.DB);

try {
    mongoClient.connect().then(() => {
        console.log("Connected to MongoDB!");
    });
} catch (x) {
    console.error('An error occurred trying to connect to the database!');
    console.error(x);
}

module.exports = mongoClient.db();