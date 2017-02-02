var mongoose = require('mongoose');
var User = mongoose.model('User');

var sendJSONresponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};

//app.get('/api/users/:userid/dpoas/:dpoaid'
module.exports.dpoasReadOne = function(req, res) {
  console.log("Getting Dpoa for a user");
  if (req.params && req.params.userid && req.params.dpoaid) {
    User
      .findById(req.params.userid)
      .select('dpoas')
      .exec(
        function(err, user) {
          console.log(user);
          var response, dpoa;
          if (!user) {
            sendJSONresponse(res, 404, {
              "message": "user with that userid not found"
            });
            return;
          } else if (err) {
            sendJSONresponse(res, 400, err);
            return;
          }
          if (user.dpoas && user.dpoas.length > 0) {
            dpoa = user.dpoas.id(req.params.dpoaid);
            if (!dpoa) {
              sendJSONresponse(res, 404, {
                "message": "dpoaid not found"
              });
            } else {
              response = {
                user: {
                  id: req.params.userid
                },
                dpoa: dpoa
              };
              sendJSONresponse(res, 200, response);
            }
          } else {
            sendJSONresponse(res, 404, {
              "message": "No durable powers of attorney found"
            });
          }
        }
    );
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, userid and dpoaid are both required"
    });
  }
};


module.exports.dpoasCreate = function(req, res) {
  if (req.params.userid) {
    User
      .findById(req.params.userid)
      .select('dpoas')
      .exec(
        function(err, user) {
          if (err) {
            sendJSONresponse(res, 400, err);
          } else {
            doAddDpoa(req, res, user);
          }
        }
    );
  } else {
    sendJSONresponse(res, 404, {
      "message": "Not found, userid required"
    });
  }
};

var doAddDpoa = function(req, res, user) {
  if (!user) {
    sendJSONresponse(res, 404, "userid not found");
  } else {
    user.dpoas.push({
      //todo: Add logic for adding multiple agents in order
      effectiveNow: req.body.effectiveNow
    });
    user.save(function(err, user) {
      var thisDpoa;
      if (err) {
        sendJSONresponse(res, 400, err);
      } else {
        thisDpoa = user.dpoas[user.dpoas.length - 1];
        sendJSONresponse(res, 201, thisDpoa);
      }
    });
  }
};

module.exports.dpoasUpdateOne = function(req, res) {
  if (!req.params.userid || !req.params.dpoaid) {
    sendJSONresponse(res, 404, {
      "message": "Not found, userid and dpoaid are both required"
    });
    return;
  }
  User
    .findById(req.params.userid)
    .select('dpoas')
    .exec(
      function(err, user) {
        var thisDpoa;
        if (!user) {
          sendJSONresponse(res, 404, {
            "message": "userid not found"
          });
          return;
        } else if (err) {
          sendJSONresponse(res, 400, err);
          return;
        }
        if (user.dpoas && user.dpoas.length > 0) {
          thisDpoa = user.dpoas.id(req.params.dpoaid);
          if (!thisDpoa) {
            sendJSONresponse(res, 404, {
              "message": "dpoaid not found"
            });
          } else {
          //todo: Add logic to update multiple agents in order
            thisDpoa.effectiveNow = req.body.effectiveNow;
            user.save(function(err, user) {
              if (err) {
                sendJSONresponse(res, 404, err);
              } else {
                sendJSONresponse(res, 200, thisDpoa);
              }
            });
          }
        } else {
          sendJSONresponse(res, 404, {
            "message": "No Dpoa to update"
          });
        }
      }
  );
};

// app.delete('/api/users/:userid/dpoas/:dpoaid'
module.exports.dpoasDeleteOne = function(req, res) {
  if (!req.params.userid || !req.params.dpoaid) {
    sendJSONresponse(res, 404, {
      "message": "Not found, userid and dpoaid are both required"
    });
    return;
  }
  User
    .findById(req.params.userid)
    .select('dpoas')
    .exec(
      function(err, user) {
        if (!user) {
          sendJSONresponse(res, 404, {
            "message": "userid not found"
          });
          return;
        } else if (err) {
          sendJSONresponse(res, 400, err);
          return;
        }
        if (user.dpoas && user.dpoas.length > 0) {
          if (!user.dpoas.id(req.params.dpoaid)) {
            sendJSONresponse(res, 404, {
              "message": "dpoaid not found"
            });
          } else {
            user.dpoas.id(req.params.dpoaid).remove();
            user.save(function(err) {
              if (err) {
                sendJSONresponse(res, 404, err);
              } else {
                sendJSONresponse(res, 204, null);
              }
            });
          }
        } else {
          sendJSONresponse(res, 404, {
            "message": "No durable power of attorney to delete"
          });
        }
      }
  );
};
