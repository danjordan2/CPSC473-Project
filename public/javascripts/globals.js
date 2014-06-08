//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File:  /public/javascripts/globals.js
//===========================================================
//Connect to socket
var socket = io.connect();
//Store question data
var question = {};
//Get users role, based on url being accessed
var role = location.pathname.split('/')[1];
//Controls which users can be invited to pm
if (role === 'teacher') {
    //Teachers pm students
    var inviteRole = 'student';
} else if (role === 'student') {
    //Students can only pm teacher
    var inviteRole = 'teacher';
}
// Toggles collapsing divs
// Gets called from other functions
var toggle = function(div) {
    if ($(".expand").text() === "-") {
        $(".expand").text("+");
    } else {
        $(".expand").text("-");
    }
    $(div).slideToggle("slow");
};
// Toggles collapsing divs from click handler
var clickToggle = function(div) {
    if ($(div).children(".expand").text() === "-") {
        $(div).children(".expand").text("+");
    } else {
        $(div).children(".expand").text("-");
    }
    $(div).next("div.history").slideToggle("slow");
};
//Select correct answer when adding question
$(".answer_label").click(function() {
    //Clear any previously selected answer
    $(".answer_label").each(function() {
        $(this).removeClass("selected_answer");
    });
    //Set selected answer
    $(this).addClass("selected_answer");
});
//Show chat window
socket.on('expand chat', function(data) {
    $("#chat").slideDown();
})
//Update list of connected chat users
socket.on('update users', function(data) {
    var users = "";
    //Add button in chat user list, for each user
    $.each(data.users, function(username, fields) {
        users += "<a class='btn btn-" + fields.role + " chat_users_button' value='" + username + "'>" + username + "</a>\n";
    })
    $("#chat_users").html(users);
});
//Update question and result data
socket.on('update', function(data) {
    if (data.scores.total > 0) {
        $.each(data.scores.letters, function(letter) {
            var total = data.scores.total;
            var value = data.scores.letters[letter];
            var percent = Math.floor(value / total * 100);
            if (value) {
                //Text representation of percentage value
                $("div." + letter + " span").html(percent + "% (" + value + ")");
            }
            //Graphical representation of percentage value
            $(".progress-bar." + letter).css("width", percent + "%");
        });
    }
    //Only show labels if a question is live. Prevents showing NaN results
    if (data.question.question) {
        $.each(data.scores.letters, function(letter) {
            //Populate results with question text
            $("#results_container h5." + letter).text(data.question[letter]);
            $("#answers_container h5." + letter).text(data.question[letter]);
            //Populate input fields with question data
            $("#answers_container input[name='answer_" + letter + "']").val(data.question[letter]);
        });
        //Reset selected answer label
        $(".selected_answer").removeClass("selected_answer");
        //Populate fields with question data
        $("#results_container input[name='question']").val(data.question.question);
        $("#answers_container input[name='question']").val(data.question.question);
        //Show results
        $("#results_container").slideDown("slow");
    }
});
$("#chat").submit(function(e) {
    //Keep form from posting
    e.preventDefault();
    //Send message
    socket.emit('new message', $('[name=message]').val());
    //Clear message input
    $('[name=message]').val('');
});
//Update chat window with new message
socket.on('update message', function(data) {
    $("#chat_window").append("<p><strong>" + data.message.username + ": </strong>" + data.message.text + "</p>");
});
//Retrieve entire message history and insert into chat window
socket.on('update messages', function(data) {
    var html = "";
    $.each(data.messages, function(i, message) {
        html += "<p><strong>" + message.username + ": </strong>" + message.text + "</p>";
    })
    $("#chat_window").html(html);
});
//Open new chat window when user invites you
socket.on('invite', function(data) {
    var post = {
        to: data.to,
        from: data.from
    }
    //Post data to /pm, and open results in popup.
    //Keeps students from messaging eachother, by editing GET request
    $.post("/pm", post, function(data) {
        //Create popup window
        var popup = window.open("", post.from + "-" + post.to, "menubar=0,titlebar=0,resizable=0,width=700,height=365");
        //Write results sent back from server
        popup.document.write(data);
        //Close the write
        popup.document.close();
    });
});
// Creates a private chat session
// .on used to bind click handler for dynamically created user list buttons
$(document).on('dblclick', '.btn-' + inviteRole, function() {
    var post = {
        to: $(this).text(),
        from: $('[name=username]').val()
    }
    //Post data to /pm and open results in popup
    $.post("/pm", post, function(data) {
        //Create popup window
        var popup = window.open("", post.from + "-" + post.to, "menubar=0,titlebar=0,resizable=0,width=700,height=365");
        //Write results sent back from server
        popup.document.write(data);
        //Close the write
        popup.document.close();
    });
});
socket.on('add room', function(data) {
    $("#chat_rooms").append('<button  name="' + data.room + '" type="button" class="btn btn-primary btn-xs private_chats" disabled>' + data.user + '</button>');
});
socket.on('remove room name', function(data) {
    $("button[name='" + data.room + "']").remove();
    //Notify other chat user, if they've already closed popup window
    socket.emit('remove room name', {
        "room": data.room,
        "username": data.username
    });
});
socket.on('remove room button', function(data) {
    //Remove button
    $("button[name='" + data + "']").remove();
});
socket.on('enable room button', function(data) {
    //Enable button control
    $("button[name='" + data + "']").prop("disabled", false);
})
$(document).on('dblclick', '.private_chats', function() {

});