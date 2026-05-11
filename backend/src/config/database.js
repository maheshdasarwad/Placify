const mongoose = require('mongoose')

async function ConnectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to Database.")
    } catch(error) {
        console.error("Database connection error : ", error)
    }
}

module.exports = ConnectDB;