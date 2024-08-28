import { NotImplemented } from '../utils/response';
import User from '../models/user'
import bcrypt from 'bcrypt';

class authController {
  static async signUp(request, response) {
      try {
        const { username, password } = request.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        response.status(201).send({status: 200, message: 'User created'});
    } catch (err) {
        console.log(err);
        response.status(500).send({status: 500, message: 'Error creating user'});
    }
  }

  static loggedIn(request, response) {
    return response.redirect('https://shefoo.tech');
  }

  static logOut(req, res) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  }

  static profile(request, response) {
    if (!request.isAuthenticated())
      return response.redirect('/');

    return response.status(200).send(request.user);
  }

}

export default authController;
