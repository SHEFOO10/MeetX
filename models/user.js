import  mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  profileImgUrl: String,
  password: String,
  googleId: String,
  facebookId: String,
  microsoftId: String
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.statics.findOrCreate = async function(profile) {
  let user;
  if (profile.googleId) {
    user = await this.findOne({ googleId: profile.googleId });
  }
  if (!user) {
    user = await this.create(profile);
  }
  return user;
};

export default mongoose.model('User', userSchema);
