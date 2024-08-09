const { NotImplemented } = require('../utils/response');

class signalController {
  static notImplemented(request, response) {
    return NotImplemented(response);
  }
}

export default signalController;
