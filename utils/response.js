function NotImplemented(response) {
  return response.status(501).send({error: 'Not Implemented'});
}

function Unauthorized(response) {
  return response.status(401).send({error: 'Unauthorized'});
}

function badRequest(response, message) {
  return response.status(400).send({error: message});
}

function notFound(response, message = 'NotFound') {
  return response.status(404).send({error: message});
} 

function serverError(response, message = 'ServerError') {
  return response.status(500).send({error: message});
}


export {
  NotImplemented,
  Unauthorized,
  badRequest,
  notFound,
  serverError,
};