import mongoose from "mongoose";

const enrollSchema = new mongoose.Schema({
  fullName: String,
  parentEmail: String,
  gender: String,
  age: Number,
  grade: String,
  branch: String 
}, {timestamps:true})

const Enroll = mongoose.model('Enroll', enrollSchema)

export default Enroll