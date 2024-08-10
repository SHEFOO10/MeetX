import express from 'express';
import passport from 'passport';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passportConfig from './auth/passport'
import dotenv from 'dotenv';
import routes from './routes';
import RedisClient from './utils/redis';
import { checkDB, checkRedis } from './utils/helper';

dotenv.config();

const {
  PORT = 8080,
  SESSION_SECRET = 'your-session-secret'
} = process.env;

const app = express();

// Middleware to handle Redis connection errors
app.use(checkRedis);

// Middleware to handle MongoDB connection errors
app.use(checkDB);

(async () => {
  try {
    const { client } = await RedisClient.getInstance();

    // Session setup with RedisStore
    app.use(session({
      store: new RedisStore({
        client: client,
        prefix: "meetX:",
      }),
      secret: SESSION_SECRET, // Replace with a secure secret
      cookie: { secure: true }, // Ensure HTTPS is used, or set to false during development
      resave: false,
      saveUninitialized: false
    }));

    // Initialize Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.use(routes);

    app.get('/', (req, res) => {
      return res.status(200).send({ status: 'All Good' });
    });
  
    // Start the server after middleware is set up
    
  } catch (error) {
    console.error("Error during server initialization:", error);
  }
})();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
