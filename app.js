//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File:    app.js
//===========================================================
var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var app = express();
var server = app.listen(3001);
var io = require('socket.io').listen(server, {
    log: false
});
var moment = require('moment');
var dbAddress = "mongodb://localhost:27017/classroom";
//========================================
// Middleware  
//========================================
app.set('port', process.env.PORT || 3001);
app.set('views', path.join(__dirname, 'views'));
//Uses hogan-express templating engine
app.engine('html', require('hogan-express'));
//With html views
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
    secret: 'secret'
}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}
//========================================
// Stores question/answer values in memory.
// If teacher decides to save the question,
// these objects are written to the db
//========================================
var question = {};
var messages = [];
var sockets = {};
var chat_users = [];
var chat_admins = {};
var quiz_users = {};
var scores = {
    letters: {
        "A": 0,
        "B": 0,
        "C": 0,
        "D": 0,
    },
    total: 0
};
//========================================
//Returns list of users in a specific chat room
//Needed to avoid returning circular JSON object
//========================================
function privateUsers(room) {
    var connected_clients = [];
    var clients = io.sockets.clients(room);
    clients.forEach(function(client) {
        connected_clients.push(client.username);
    });
    return connected_clients;
}
//========================================
// Checks if a user is already in a private
// chat room. Prevents attempting to create
// duplicate connections. 
//========================================
function inRoom(user, room) {
    var found = false;
    var clients = io.sockets.clients(room);
    clients.forEach(function(client) {
        if (user === client.username) {
            found = true;
        }
    });
    return found;
}
//========================================
// Handles user authentication via sessions 
//========================================
var auth = function(req, res, next) {
    var path = req.path.split("/");
    //Check if user is logged in
    if (req.session.username) {
        //Only allow users to access their section
        if (path[1] == req.session.role) {
            next();
        } else {
            res.redirect('/' + req.session.role);
        }
    }
    //User isn't logged in
    else {
        res.redirect('/login');
    }
};
//========================================
// Routes 
//========================================
app.get('/', auth, routes.index);
//Student home page
app.get('/student', auth, routes.student);
//Student quiz page
app.get('/student/question', auth, routes.student_question);
//Teacher home page
app.get('/teacher', auth, routes.teacher);
//Teacher quiz control page
app.get('/teacher/question', auth, routes.teacher_question);
//Class results page
app.get('/teacher/results', auth, routes.teacher_class_results);
//Teacher new user signup page
app.get('/teacher/signup', auth, routes.signup);
//Process new user signups
app.post('/teacher/signup', auth, routes.signup_post);
//Process private chat request
app.post('/pm', routes.chat_pm);
//Join private chat already in progress
app.post('/pm/join', routes.chat_pm_join);
//Login page
app.get('/login', routes.login);
//Process login request
app.post('/login', routes.login_post);
//Logout page
app.get('/logout', routes.logout);
//Unauthorized access page
app.get('/unauthorized', auth, routes.unauthorized);
//========================================
// Socket connections and disconnections 
//========================================
io.sockets.on('connection', function(socket) {
    //Fetch current question data as soon as user connects
    io.sockets.emit('update', {
        question: question,
        scores: scores,
    });
    socket.on('disconnect', function(data) {
        //Check if user connected to chat
        if (chat_users[socket.username]) {
            //Get list of open chat rooms
            for (room in io.sockets.manager.roomClients[socket.id]) {
                //Only send to chat rooms we've created
                if (room) {
                    //Remove slash on front of room name
                    room = room.replace('/', '');
                    //Leave room
                    socket.leave(room);
                    //Update connected users for private room
                    io.sockets.in(room).emit('update pm users', {
                        users: privateUsers(room),
                    });
                    //Check if room is now empty
                    if (privateUsers(room).length === 0) {
                        //Remove room from listing on main page
                        io.sockets.socket(chat_users[socket.username].id).emit('remove room name', {
                            "room": room,
                            "username": socket.username
                        });
                    //Room still has atleast 1 user connected
                    } else {
                        //Enable button for re-connecting
                        io.sockets.socket(chat_users[socket.username].id).emit('enable room button', room);
                    }
                }
            }
            //Make sure user is disconnecting from correct chatroom
            if (chat_users[socket.username].id === socket.store.id) {
                //Remove user from chat. 
                delete chat_users[socket.username];
            }
        }
        //Update list of chat users for main room
        io.sockets.emit('update users', {
            users: chat_users
        });
    });
    //Student has connected
    socket.on('student connected', function(data) {
        //Attach username to socket
        socket.username = data;
        //Attach role to socket
        socket.role = "student";
        //Check if user already submitted answer
        if (quiz_users[socket.username]) {
            //Check if user has already connected to the chat
            if (!chat_users[socket.username]) {
                //Connect them if they havent. 
                chat_users[socket.username] = {
                    "role": socket.role,
                    "id": socket.store.id
                }
            }
            //Bypass quiz and go straight to chat
            socket.emit('correct answer', {
                correct_answer: question.Answer,
                user_answer: quiz_users[socket.username]
            });
            //Grab existing question and scores
            socket.emit('update', {
                question: question,
                scores: scores,
            });
            //Show chat
            socket.emit('expand chat');
            //Update list of chat users
            io.sockets.emit('update users', {
                users: chat_users
            });
            //Allows user to see full chat conversation
            socket.emit('update messages', {
                messages: messages
            });
        }
    });
    //Teacher has connected
    socket.on('teacher connected', function(data) {
        //Attach username to socket
        socket.username = data;
        //Attach role to socket
        socket.role = "teacher";
        //Teacher has already submitted question
        if (question.question) {
            //Check if user has already connected to the chat
            if (!chat_users[socket.username]) {
                //Connect them if they havent 
                chat_users[socket.username] = {
                    "role": socket.role,
                    "id": socket.store.id
                }
            }
            //Grab existing question and scores
            socket.emit('update', {
                question: question,
                scores: scores,
            });
            //Show chat window
            socket.emit('expand chat');
            //Update list of chat users
            io.sockets.emit('update users', {
                users: chat_users
            });
            //Allows user to see full chat conversation
            socket.emit('update messages', {
                messages: messages
            });
        }
    });

    //========================================
    // Quiz functionality 
    //========================================

    //Answer submitted by student
    socket.on('submit answer', function(data) {
        //Increment total responses
        scores.total++;
        //Increment total responses for particular choice
        scores.letters[data]++;
        //Add student's answer
        quiz_users[socket.username] = data;
        //Check if user has already connected to the chat
        if (!chat_users[socket.username]) {
            //Connect them if they havent. 
            chat_users[socket.username] = {
                "role": socket.role,
                "id": socket.store.id
            }
        }
        //Send correct answer to client
        socket.emit('correct answer', {
            correct_answer: question.Answer,
            user_answer: data
        });
        //Update scores
        io.sockets.emit('update', {
            question: question,
            scores: scores,
        });
        //Show chat window
        socket.emit('expand chat');
        //Update list of chat users
        io.sockets.emit('update users', {
            users: chat_users
        });
        //Allows user to see full chat conversation
        socket.emit('update messages', {
            messages: messages
        });
    });
    //Question submitted by teacher
    socket.on('submit question', function(data) {
        //Clear chat
        messages.length = 0;
        //Reset quiz users
        quiz_users = {};
        //Reset chat users
        chat_users = {};
        //reset score values
        scores.letters.A = scores.letters.B = scores.letters.C = scores.letters.D = scores.total = 0;
        //Set new question data
        question = data;
        //Get list of open chat rooms
        for (room in io.sockets.manager.rooms) {
            //Only send to chat rooms we've created
            if (room) {
                //Remove slash on front of room name
                room = room.replace('/', '');
                //Send alert to all users in room
                io.sockets.in(room).emit('close windows', room);
            }
        }
        //Alert student clients of a new question
        io.sockets.emit('new question');
        //Update display with zeroed out scores
        io.sockets.emit('update', {
            question: question,
            scores: scores,
        });
        //Check if user has already connected to the chat
        if (!chat_users[socket.username]) {
            //Connect them if they havent. 
            chat_users[socket.username] = {
                "role": socket.role,
                "id": socket.store.id
            }
        }
        //Show chat window
        socket.emit('expand chat');
        //Update list of connected chat users
        io.sockets.emit('update users', {
            users: chat_users
        });
        //Show previous messages
        socket.emit('update messages', {
            messages: messages
        });
    });
    //========================================
    // Chat functionality 
    //========================================

    //Send new chat message to main room
    socket.on('new message', function(data) {
        //Add new message to messages array
        messages.push({
            "username": socket.username,
            "text": data
        });
        //Send message to all connected sockets
        io.sockets.emit('update message', {
            message: {
                "username": socket.username,
                "text": data
            }
        });
    });
    //Send message in private chat room
    socket.on('new private message', function(data) {
        //Send message to all connected sockets in the room
        io.sockets. in (data.room).emit('update private message', {
            message: {
                "username": socket.username,
                "text": data.message
            }
        });
    });
    //Create private chat room
    socket.on('create room', function(data) {
        socket.username = data.from;
        //Create room name from sending/receiving usernames
        var room = data.from + "-" + data.to;
        //Make sure user isn't already in the room
        if (!inRoom(data.from, room)) {
            //Join the room
            socket.join(room);
            //Update connected users
            io.sockets.in(room).emit('update pm users', {
                users: privateUsers(room),
            });
            //Send room name to user
            io.sockets.socket(chat_users[socket.username].id).emit('add room', {
                "room": room,
                "user": data.to
            })
        }
        //Send request to other user
        io.sockets.socket(chat_users[data.to].id).emit('invite', {
            "to": data.to,
            "from": data.from
        })
    });
    //Join private room that has already been created
    socket.on('join room', function(data) {
        socket.username = data.to;
        var room = data.from + "-" + data.to;
        //Make sure user isn't already in the room
        if (!inRoom(socket.username, room)) {
            //Join the room
            socket.join(room);
            //Update connected users
            io.sockets.in(room).emit('update pm users', {
                users: privateUsers(room),
            });
            //Send room name to user
            io.sockets.socket(chat_users[socket.username].id).emit('add room', {
                "room": room,
                "user": data.from
            })
    
        }
    });
    //Leave private chat room
    socket.on('leave room', function(data) {
        socket.leave(data);
        //Update connected users
        io.sockets.in(data).emit('update pm users', {
            users: privateUsers(data),
        });
    });
    //Remove room name from list of connected chat rooms
    socket.on('remove room name', function(data) {
        var users = data.room.split('-');
        if (socket.username === users[0]) {
            io.sockets.socket(chat_users[users[1]].id).emit('remove room button', data.room);
        } else if (socket.username === users[1]) {
            io.sockets.socket(chat_users[users[0]].id).emit('remove room button', data.room);
        }
    });
    //========================================
    // Save live question in the database 
    //========================================
    socket.on('save question', function(data) {
        MongoClient.connect(dbAddress, function(err, db) {
            db.collection("questions").insert({
                question: {
                    date: moment(new Date()).format("MM/DD/YY"),
                    title: question.question,
                    choices: {
                        A: question.A,
                        B: question.B,
                        C: question.C,
                        D: question.D
                    },
                    answer: question.Answer,
                    scores: {
                        letters: {
                            A: {
                                total: scores.letters.A,
                                percent: Math.floor((scores.letters.A / scores.total) * 100)
                            },
                            B: {
                                total: scores.letters.B,
                                percent: Math.floor((scores.letters.B / scores.total) * 100)
                            },
                            C: {
                                total: scores.letters.C,
                                percent: Math.floor((scores.letters.C / scores.total) * 100)
                            },
                            D: {
                                total: scores.letters.D,
                                percent: Math.floor((scores.letters.D / scores.total) * 100)
                            },
                        },
                        total: scores.total,
                        correct: Math.floor((scores.letters[question.Answer] / scores.total) * 100),
                        incorrect: Math.floor((1 - (scores.letters[question.Answer] / scores.total)) * 100)
                    }
                }
            }, function(err, db) {
                if (err) {} else {
                    //Let client know data was saved successfully 
                    socket.emit('saved question');
                }
            });
        });
    });
});
console.log('Express server listening on port ' + app.get('port'));