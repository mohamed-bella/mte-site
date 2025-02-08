const mongoose = require('mongoose');

const startingCitySchema = new mongoose.Schema({
    city: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    tours: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('StartingCity', startingCitySchema); 