function NotImplemented(response) {
  return response.status(501).send({error: 'Not Implemented'});
}

function Unauthorized(response) {
  return response.status(401).send({error: 'Unauthorized'});
}

function badRequest(response, message) {
  return response.status(400).send({error: message});
}

function notFound(response) {
  return response.status(404).send({error: 'NotFound'});
}


export {
  NotImplemented,
  Unauthorized,
  badRequest,
  notFound,
};