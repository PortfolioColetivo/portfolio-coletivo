//aqui conecta o mongo db por Exemplo:mongodb+srv://admin:[EMAIL_ADDRESS]/

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/portfolio";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB conectado com sucesso"))
  .catch((err) => console.error(err));

module.exports = mongoose;
