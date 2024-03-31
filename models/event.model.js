import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    name: String,
    startDate: Date,
    endDate: Date,
    venue: String,
    pic: {
        fileId: mongoose.Types.ObjectId,
        filename: String,
    },
    description: String
}, {timestamps: true});

const Event = mongoose.model('Event', eventSchema);

export default Event
