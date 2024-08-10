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
    return NotImplemented(response);
  }

  static logOut(request, response) {
    request.logout((err) => {
      if (err) { 
        return next(err); 
      }
      req.session.destroy(); // Optionally destroy the session
      return res.redirect('/'); // Redirect to the homepage or login page
    });
  }
}

export default authController;