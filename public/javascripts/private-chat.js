//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File:  /public/javascripts/private-chat.js
//===========================================================
$(document).ready(function() {
    var socket = io.connect();
    var username = $('[name=username]').val();
    var to = $('[name=to]').val();
    var from = $('[name=from]').val();
    var action = $('[name=action]').val();
    //User is the one who initiated contact
    if (username === from) {
        //Create a new room
        socket.emit("create room", {
            "from": from,
            "to": to
        });
    }
    //User is invited to private chat
    if (username === to) {
        //Join room
        socket.emit("join room", {
            "from": from,
            "to": to
        })
    }
    //Update list of users in channel
    socket.on('update pm users', function(data) {
        var users = "";
        //Add button in chat user list, for each user
        $.each(data.users, function(key, username) {
            users += "<a class='btn btn-student chat_users_button'>" + username + "</a>\n";
        })
        $("#chat_users_pm").html(users);
    });
    $("#chat").submit(function(e) {
        //Keep form from posting
        e.preventDefault();
        //Send message
        socket.emit('new private message', {
            "message": $('[name=message]').val(),
            "room": from + "-" + to
        });
        //Clear message input
        $('[name=message]').val('');
    });
    //Update chat window with new message
    socket.on('update private message', function(data) {
        $("#chat_window_pm").append("<p><strong>" + data.message.username + ": </strong>" + data.message.text + "</p>");
    });
    socket.on('close windows', function(data) {
        // Workaround for closing a window that was created by a different page.
        // Create new popup with the same name as the window we're trying to close
        var popup = window.open('about:blank', data);
        // Make sure popup is still open
        if (popup && !popup.closed) {
            //Close popup
            popup.close();
        }
        //Disconnect user from room
        socket.emit('leave room', data);
    });
});