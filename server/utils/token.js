const jwt = require("jsonwebtoken");
const JWT_SECRET =
  "5059dcccc721d4700925442cd0ta8de2f2249b7ff3213597aad027c1e6e403a61b793d3d52142225be68b2b0d471fdb3829cd68d0bb490d5ae9d2c26ea73743873bd47a14152769219e0dbb3512b60f603529e9e2f429d6d4452cbee5c75ce3c158902103578230d9d79507715771deb7343e082b59b1fe67d947e0bf2c675073abb957b7beb38c7a35aac480bf7a7802996eb2f045695a339c13769e8dcfd9710335c1f070a34e1903dae2da663915d1c07e13bc8cea73efcaa036b4ba38ef854e20f274939588fb0a377591508c7eb5b5832e484ed9aaeb5565b908f847e038f3c487f12824dfa1b8a9c10a4147f1fb0faf91c68a9f69b228a18d4429725a2";

var privateKey = JWT_SECRET;

module.exports = {
  verifyToken: function (token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, privateKey, function (err, decoded) {
        if (err) {
          resolve({ token_valid: false, error: err });
        } else {
          delete decoded.iat;
          delete decoded.exp;
          resolve({ token_valid: true, token_decoded: decoded });
        }
      });
    });
  },

  createToken: function (data) {
    return new Promise((resolve, reject) => {
      jwt.sign(JSON.parse(JSON.stringify(data)), privateKey, { expiresIn: "5d" }, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
  },
};
