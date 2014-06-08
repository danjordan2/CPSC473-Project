//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File: /routes/index.js
//===========================================================
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var moment = require('moment');
var dbAddress = "mongodb://localhost:27017/classroom";
//=============================================
// Page user visits after login directs them 
// to their role page
//=============================================
exports.index = function(req, res) {
   res.render('index', {
       username: req.session.username,
       name: req.session.name
   });
};
//=============================================
// Student home page. Displays welcome message, 
// and student nav bar
//=============================================
exports.student = function(req, res) {
    res.redirect('/student/question');
};
//=============================================
// Page where students are prompted with quiz 
// style questions
//=============================================
exports.student_question = function(req, res) {
    res.render('student_question', {
        username: req.session.username,
        name: req.session.name
    });
};
//=============================================
// Teacher home page. Displays welcome message,
// and student nav bar
//=============================================
exports.teacher = function(req, res) {
    res.redirect('/teacher/question');
};
//=============================================
// Page where teacher adds classroom quiz 
// questions, and views results
//=============================================
exports.teacher_question = function(req, res) {
    res.render('teacher_question', {
        username: req.session.username,
        name: req.session.name
    });
};
//=============================================
// Page where teacher can view results of saved
// questions
//=============================================
exports.teacher_class_results = function(req, res) {
    MongoClient.connect(dbAddress, function(err, db) {
        db.collection("questions").aggregate({
            $sort: {
                "question.date": -1
            }
        }, function(err, results) {
            res.render('teacher_class_results', {
                username: req.session.username,
                questions: results
            });
        });
    });
};
//=============================================
// Page that gets loaded in a popup window for 
// private chats. Route is triggered from a POST
// request, to keep students from editing message
// recipients via GET request
//=============================================
exports.chat_pm = function(req, res) {
    res.render('chat_pm',{
        username: req.session.username,
        to: req.body.to,
        from: req.body.from
    });
};
//=============================================
// Page that gets loaded when a user requests
// to join a private chat already in session 
//=============================================
exports.chat_pm_join = function(req, res) {
    var users = req.body.room.split('-');

    if(users[0] === req.session.username){
        var to = users[1];
        var from = users[0];
    }
    else if(users[1] === req.session.username){
        var to = users[0];
        var from = users[1];
    }
    res.render('chat_pm',{
        username: req.session.username,
        to: to,
        from: from,
        action: req.body.room
    });
};
//=============================================
// Renders login page
//=============================================
exports.login = function(req, res) {
    res.render('login');
};
//=============================================
// Function that login page posts to
//=============================================
exports.login_post = function(req, res) {
    var username = req.body.user;
    var password = req.body.password;
    MongoClient.connect(dbAddress, function(err, db) {
        db.collection("accounts").findOne({
            "username": username
        }, function(err, user) {
            if (user) {
                if (user.username == username && user.password == password) {
                    req.session.regenerate(function() {
                        req.session.username = user.username;
                        req.session.name = user.name;
                        req.session.role = user.role;
                        res.redirect("/" + user.role);
                    });
                } else res.redirect('/login');
            } else res.redirect('/login');
        });
    });
};

//=============================================
// Page for teacher to register new students
// or teachers
//=============================================
exports.signup = function(req, res) {
    res.render('signup', {
        username: req.session.username,
        name: req.session.name
    });
};
//=============================================
// Function that signup page posts to
//=============================================
exports.signup_post = function(req, res) {
    MongoClient.connect(dbAddress, function(err, db) {
        db.collection("accounts").insert({
            "name": req.body.name,
            "username": req.body.username,
            "password": req.body.password,
            "role": req.body.role
        }, function(err, db) {
            var messages = {};
            if (err) {
                messages = {
                    message: "User already exists",
                    error: err
                };
            } else {
                messages = {
                    message: "User successfully added",
                    error: ""
                };
            }
            res.render('signup_confirmation', {
                message: messages,
                username: req.session.username,
                name: req.session.name
            });
        });
    });
};
//=============================================
// Destroys a users session, logging them out
//=============================================
exports.logout = function(req, res) {
    req.session.destroy(function() {
        res.redirect('/');
    });
};
//=============================================
// Page used to display message if user tries
// to access page they aren't allowed to access
//=============================================
exports.unauthorized = function(req, res) {
    res.render('unauthorized', {
        username: req.session.username
    });
};