import passport from 'passport';
import { Strategy  as LocalStrategy } from 'passport-local' ;
import User from '../models/user.js';
import google from './google';

passport.use(new LocalStrategy(
    async(username, password, done) => {
        try {
            const user = await User.findOne({username});
            if (!user || !user.comparePassword(password)) {
                return done(null, false, { message: 'Incorrect credentials.' });
            }
            return done(null, user);
        } catch {
            return done(err);
        }
    }
));




passport.serializeUser((user, done) => {
    // console.log(`Serializaing user Id: ${user.id}`)
    done(null, user.id);
  });
  
passport.deserializeUser(async (id, done) => {
    // console.log(`deserializing user Id ${id}`)
try {
    const user = await User.findById(id);
    done(null, user);
} catch (err) {
    done(err);
}
});