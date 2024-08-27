import passport from 'passport';
import { Strategy  as GoogleStrategy } from 'passport-google-oauth20' ;
import User from '../models/user';
import dotenv from 'dotenv';

dotenv.config();
// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://api.shefoo.tech/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const data = profile._json; 
      const user = await User.findOrCreate({
        googleId: data.sub,
        email: data.email,
        name: data.name,
        profileImgUrl: data.picture,
      });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
}));

export default passport;
