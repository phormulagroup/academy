const jwt = require("jsonwebtoken");
const { verifyToken } = require("./token");

const middleware = (req, res, next) => {
  let headers = JSON.stringify(req.headers);
  headers = JSON.parse(headers);
  let token = headers.authorization;
  if (!token) {
    return res.status(403).send("A token is required for authentication");
  } else {
    verifyToken(token)
      .then((res) => {
        if (res.token_valid) {
          return next();
        } else {
          return res.status(401).send("Invalid Token");
        }
      })
      .catch((err) => {
        return res.status(401).send("Invalid Token");
      });
  }
};

module.exports = middleware;
