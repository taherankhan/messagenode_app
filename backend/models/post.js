const mongoose = require('mongoose');

const postModel = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,  //creates a connection with the user model
        ref: 'User',
        required: true
    }
}, { timestamps: true })

module.exports = mongoose.model('Post', postModel);