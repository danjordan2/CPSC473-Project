//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File:  /public/javascripts/student.js
//===========================================================
$(document).ready(function() {
    //Load global functions from external file
    $.getScript('/javascripts/globals.js', function() {
        //Send username to server
        socket.emit('student connected', $('[name=username]').val());
        $("#submit_answer").click(function() {
            //Make sure student has selected an answer
            if ($(".selected_answer").text() === "") {
                //Display error
                $("#error").html("<h3>Please select an answer</h3>");
            } else {
                //Clear error
                $("#error").html("");
                //Send answer to server
                socket.emit('submit answer', $(".selected_answer").text());
            }
        });
        //Correct answer returned to student. Display graph of responses
        socket.on('correct answer', function(data) {
            //Bootstrap stypes for different color progress bars
            var styles = ["success", "info", "warning", "danger"];
            var html = "";
            //Loop through each graph bar
            $.each(["A", "B", "C", "D"], function(i, letter) {
                var answer_status = "";
                //Add checkmark alongside correct answer
                if (letter === data.correct_answer) {
                    answer_status = '<span class="input-group-addon glyphicon glyphicon-ok"></span>';
                }
                //Add X next to incorrect answer
                else if (letter === data.user_answer) {
                    answer_status = '<span class="input-group-addon glyphicon glyphicon-remove"></span>';
                }
                //Generate progress bars with current percentages
                html += '<div class="answer_text"><h5 class="' + letter + '"></h5></div><div class="progress progress"><div class="input-group"><span class="input-group-addon">' + letter + '</span><div class="progress-bar progress-bar-' + styles[i] + ' ' + letter + '" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"><span></span></div>' + answer_status + '</div></div>';
            });
            $(".results").html(html).fadeIn("slow");
        });
        //New question submitted by teacher
        socket.on('new question', function(data) {
            //Redirect students back to quiz page
            $("body#student_quiz").load("/student/question/", function() {
                //Fixes double connection made by ajax call
                socket.disconnect();
            });
        });

    });
});