import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';

const {
  PORT = 8080,
} = dotenv.config().parsed;

const app = express();

app.get('/', (req, res) => {
  res.status(200).send({status: 'All Good'});
});

app.use(routes);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

export default app;