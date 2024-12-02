const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Domain = mongoose.model('Domain', domainSchema);

module.exports = Domain;
