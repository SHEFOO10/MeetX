import express from 'express';
import passport from 'passport';
import session from 'express-session';
import RedisStore from 'connect-redis';
import './auth/passport'
import dotenv from 'dotenv';
import routes from './routes';
import RedisClient from './utils/redis';
import { checkDB, checkRedis } from './utils/helper';
import path from 'path';
import https from 'https';
import bodyParser from 'body-parser';
import signaling from './signaling';
import fs from 'fs';
import cors from 'cors';

const __dirname = path.resolve();

dotenv.config();

const {
  PORT = 8080,
  SESSION_SECRET = 'your-session-secret'
} = process.env;

const privKey = fs.readFileSync('/etc/letsencrypt/live/api.shefoo.tech/privkey.pem', 'utf-8');
const cert = fs.readFileSync('/etc/letsencrypt/live/api.shefoo.tech/fullchain.pem', 'utf-8');

const credentials = { key: privKey, cert};

const app = express();
const httpsServer = https.createServer(credentials, app);
const socket = signaling(httpsServer);

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(cors({
	origin: 'https://shefoo.tech',
	credentials: true
}));

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: false }));
// Middleware to handle Redis connection errors
app.use(checkRedis);

// Middleware to handle MongoDB connection errors
app.use(checkDB);

app.use(express.static(path.join(__dirname, '/public')));

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
      cookie: {
	httpOnly: true,
	secure: true,
	domain: '.shefoo.tech',
	sameSite: 'None',
      }, // Ensure HTTPS is used, or set to false during development
      resave: false,
      saveUninitialized: false
    }));

    // Initialize Passport middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.use(routes);

    app.get('/', (req, res) => {
      console.log(req.isAuthenticated())
      return res.status(200).send({ status: 'All Good' });
    });
  
    // Start the server after middleware is set up
    
  } catch (error) {
    console.error("Error during server initialization:", error);
  }
})();
httpsServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
