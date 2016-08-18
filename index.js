var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');
var url = require('url');
mongoose.Promise = global.Promise;
var querystring = require('querystring');
var passport = require('passport');
var bcrypt = require('bcrypt');

var app = express();

var jsonParser = bodyParser.json();

var BasicStrategy = require('passport-http').BasicStrategy;

var strategy = new BasicStrategy(function(username, password, callback) {
    User.findOne({
        username: username
    }, function (err, user) {
        console.log("----------------------", username);
        if (err) {
            callback(err);
            return;
        }

        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }
        console.log(user);
        user.validatePassword(password, function(err, isValid) {
            console.log('---------------------', err, isValid, password)
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});

passport.use(strategy);

app.use(passport.initialize());

// Add your API endpoints here
app.get('/users', function(req, res){
    var users = [];
  
    User.find(function(err, users) {
        if(err) {
            return res.status(500).json({
                message: 'Horrible Error'
            });
        }
        res.status(200).json(users);
    });
});

// Password testing endpoint
app.get('/hidden', passport.authenticate('basic', {session: false}), function(req, res) {
    res.json({
        message: 'Luke... I am your father'
    });
});

/* OLD SUP POST FOR TESTING
app.post('/users', jsonParser, function(req, res) {
        console.log("Hello World", typeof(req.body.username));
    if(req.body.username == undefined) {
        return res.status(422).json({
                message: 'Missing field: username'
            });
        }
    
    if(typeof(req.body.username) !== 'string') {
        return res.status(422).json({
                message: 'Incorrect field type: username'
                }); 
            }
    
    User.create({
        username: req.body.username

    }, function(err, user) {
        if(err) {
            return res.status(422).json({
                message: 'Missing field: username'
            });
        }
        res.location('/users/' + user._id).status(201).json({});
    });
});
*/

//NEW SUP POST FOR PASSWORD IMPLEMENTATION
app.post('/users', jsonParser, function(req, res) {
    if (!req.body) {
        return res.status(400).json({
            message: "No request body"
        });
    }

    if (!('username' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }

    var username = req.body.username;

    if (typeof username !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }

    username = username.trim();

    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }

    if (!('password' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: password'
        });
    }

    var password = req.body.password;

    if (typeof password !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: password'
        });
    }

    password = password.trim();

    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }

    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }

        bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }
   
            var user = new User({
                username: username,
                password: hash
            });

            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }

                res.location('/users/' + user._id).status(201).json({});
            });
        });
    });
});

app.get('/users/:userId', function(req, res) {
    
    User.findById(req.params.userId, function(err, user) {
        if (user == null) {
            return res.status(404).json({
                message: 'User not found'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500);
        }
         res.status(200).json(user);
    });
});

app.put('/users/:userId', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
    User.findByIdAndUpdate({_id: req.user._id}, {username: req.body.username},
        function(err, user) {
            
            if (err) {
                return res.status(500).json({
                    message: 'Internal Server Error'
                });
            }
             res.status(200).json({});
            if(!user) {
                User.create({
                    username: req.body.username,
                    password: req.body.password,                    
                    _id: req.params.userId
                });
            }
        }); 
            if(req.body.username == undefined) {
                return res.status(422).json({
                    message: 'Missing field: username'
                });
            }
             if (typeof(req.body.username) !== 'string') {
                return res.status(422).json({
                    message: 'Incorrect field type: username'
                });
             }
        
});


app.delete('/users/:userId', function(req, res) {
    User.findByIdAndRemove(req.params.userId, function(err, user) {
        if (err) {
            return res.status(500).json({
                  message: 'Internal Server Error'
            });
        }
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        res.status(200).json({});
    });
});


//MESSAGE
app.get('/messages', function(req, res){
    var message = [];
     Message.find(querystring.parse(url.parse(req.url).query))
     .populate('from to')
     .exec(function(err, message) {
        if(err) {
            return res.status(500).json({
                message: 'Horrible Error'
            });
        }
            res.status(200).json(message);
    });
});

app.get('/messages/:id', passport.authenticate('basic', {session: false}), function(req, res) {

 var filter = {
     to: req.user._id,
     from: req.user._id
 };
 
 Message.find(filter)
     .populate('from')
     .populate('to')
     .then(function(messages) {
         if (!messages) {
            console.log('404 error');
            return res.status(404).json({message: 'Message not found'})
            }
         res.json(messages)
     });
     
});
app.post('/messages', passport.authenticate('basic', {session: false}), jsonParser, function(req, res) {
     if(req.body.text == undefined) {
      return res.status(422).json({
          message: 'Missing field: text'
      });
    }
    //  if(!req.body.from) {
    //   return res.status(422).json({
    //       message: 'Incorrect field value: from'
    //   });
    // }    
    if(typeof(req.body.text) !== 'string') {
      return res.status(422).json({
          message: 'Incorrect field type: text'
      });
    }
    if(typeof(req.body.to) !== 'string') {
      return res.status(422).json({
          message: 'Incorrect field type: to'
      });
    }
    // if(typeof(req.body.from) !== 'string') {
    //   return res.status(422).json({
    //       message: 'Incorrect field type: from'
    //   });
    // }
    var fromPromise = User.findById(req.body.from, function (err, user) {
        
    })
     Message.create({
        from: req.user._id,
        to: req.body.to,
        text: req.body.text
    }, function(err, message) {
        if(err) {
            return res.status(422).json({
                message: 'Missing field:'
            });
        }
        res.location('/messages/'+message._id).status(201).json(message);
    });

});

//   app.post('/messages', jsonParser, function(req, res) {
//      if(req.body.text == undefined) {
//       return res.status(422).json({
//           message: 'Missing field: text'
//       });
//     }
//      if(!req.body.from) {
//       return res.status(422).json({
//           message: 'Incorrect field value: from'
//       });
//     }    
//     if(typeof(req.body.text) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: text'
//       });
//     }
//     if(typeof(req.body.to) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: to'
//       });
//     }
//     if(typeof(req.body.from) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: from'
//       });
//     }


//     var userPromise = User.findById(req.body.from).exec();
    
//     var toPromise = userPromise.then(function(user) {
//         if (user == null) {
//             return res.status(422).json({
//                 message: 'Incorrect field value: from'
//             });
//         }
        
//         return User.findById(req.body.to);    
//     }, function(err) {
//          if (err) {
//             return res.status(500);
//         }
//     });
//     var messagePromise = toPromise.then(function(user) {
//         if (user == null) {
//             return res.status(422).json({
//                 message: 'Incorrect field value: to'
//             });
//         }
//         return Message.create({
//         from: req.body.from,
//         to: req.body.to,
//         text: req.body.text
//         });
//     });
//     messagePromise.then(function(message) {
        
//         res.location('/messages/'+ message._id).status(201).json({});
//     }, function(err) {
//         if(err) {
//             return res.status(422).json({
//                 message: 'Missing field: message'
//             });
//         }
//     });
// });   



var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;







//EJERSON'S CHANGES
// app.post('/messages', jsonParser, function(req, res) {
//      if(req.body.text == undefined) {
//       return res.status(422).json({
//           message: 'Missing field: text'
//       });
//     }
//      if(!req.body.from) {
//       return res.status(422).json({
//           message: 'Incorrect field value: from'
//       });
//     }    
//     if(typeof(req.body.text) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: text'
//       });
//     }
//     if(typeof(req.body.to) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: to'
//       });
//     }
//     if(typeof(req.body.from) !== 'string') {
//       return res.status(422).json({
//           message: 'Incorrect field type: from'
//       });
//     }

//     var userPromise = User.findById(req.body.from).exec();
    
//     var toPromise = userPromise.then(function(user) {
//         if (user == null) {
//             return res.status(422).json({
//                 message: 'Incorrect field value: from'
//             });
//         }
        
//         return User.findById(req.body.to);    
//     }, function(err) {
//          if (err) {
//             return res.status(500);
//         }
//     });
//     var messagePromise = toPromise.then(function(user) {
//         if (user == null) {
//             return res.status(422).json({
//                 message: 'Incorrect field value: to'
//             });
//         }
//         return Message.create({
//         from: req.body.from,
//         to: req.body.to,
//         text: req.body.text
//         });
//     });
//     messagePromise.then(function(message) {
        
//         res.location('/messages/'+ message._id).status(201).json({});
//     }, function(err) {
//         if(err) {
//             return res.status(422).json({
//                 message: 'Missing field: message'
//             });
//         }
//     });
// });



