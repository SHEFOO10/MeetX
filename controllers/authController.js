import { NotImplemented } from '../utils/response';
import User from '../models/user'

class authController {
  static async signUp(request, response) {
      try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).send('User created');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error creating user');
    }
  }

  static loggedIn(request, response) {
    return response.redirect('/profile');
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

    return response.render('profile', {user: request.user});
  }

}

export default authController;