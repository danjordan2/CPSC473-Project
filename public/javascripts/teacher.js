//===========================================================
// CPSC 473 Project 2
// Team:  Econometric Rhombus
// File:  /public/javascripts/teacher.js
//===========================================================
$(document).ready(function() {
    //Load global functions from external file
    $.getScript('/javascripts/globals.js', function() {
        //Send username to server
        socket.emit('teacher connected', $('[name=username]').val());
        //Trigger toggle of "Add Question" div
        $(".add").click(function() {
            toggle("#questions_container");
        });
        //Submit question
        $("#add_question").click(function() {
            question.Answer = $(".selected_answer").text();
            //Keep teacher from submit question without choosing answer
            if (question.Answer === "") {
                $("#error").html("<h3>Please select an answer</h3>");
            } else {
                $("#error").html("");
                //Gather all data from question form and reset them
                $("#question_form input[type='text']").each(function() {
                    question[$(this).attr("name")] = $(this).val();
                    $(this).val("");
                });
                //Reset graph values to 0%
                $.each(["A", "B", "C", "D"], function(i, letter) {
                    $("div." + letter + " span").html("");
                    $(".progress-bar." + letter).css("width", "0%");
                });
                //Set correct answer
                question.Answer = $(".selected_answer").text();
                //Remove correct answer indicator
                $(".selected_answer").removeClass("selected_answer");
                //Hide form, and display graph
                toggle("#questions_container");
                $("#results_container").slideDown("slow");
                //Reset save button
                $("#save_question").html('Save').removeAttr("disabled").fadeIn("slow");
                socket.emit('submit question', question);
                $("#chat_rooms").html("");
            }
        });
        //Animate button when submitting answer to db
        $("#save_question").click(function() {
            $(this).fadeOut("fast");
            socket.emit('save question', question);
        });
        //Disable save button to prevent inserting duplicate question
        socket.on('saved question', function(data) {
            $("#save_question").html('<span class=" glyphicon glyphicon-thumbs-up"></span> Saved').attr("disabled", true).fadeIn("slow");
        });
        $(".expand_question").click(function() {
            clickToggle($(this));
        });
    });
});