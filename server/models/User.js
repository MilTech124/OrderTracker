const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: '' },
    role: { type: String, enum: ['superadmin', 'admin', 'user'], default: 'user' },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    fullName: this.fullName,
    role: this.role,
    companyId: this.companyId || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
