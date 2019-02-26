var request = require("request")
// const pickRandom = require('pick-random');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

    if (event.session.application.applicationId !== "amzn1.ask.skill.c6ca00fd-506e-4e7a-9240-1ea5feb73e2a") {
        context.fail("Invalid Application ID");
     }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;
    // var slotName= intentRequest.intent.slots.topic.value.toLowerCase()

    // dispatch custom intents to handlers here
    if (intentName == "GetNewsIntent") {
        handleGetNewsIntent(intent, session, callback)
    } else if (intentName == "AMAZON.YesIntent") {
        handleYesResponse(intent, session, callback)
    } else if (intentName == "AMAZON.NoIntent") {
        handleNoResponse(intent, session, callback)
    } else if (intentName == "AMAZON.HelpIntent") {
        handleGetHelpRequest(intent, session, callback)
    } else if (intentName == "AMAZON.StopIntent") {
        handleFinishSessionRequest(intent, session, callback)
    } else if (intentName == "AMAZON.CancelIntent") {
        handleFinishSessionRequest(intent, session, callback)
    } else {
        throw "Invalid intent"
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    // var speechOutput = outputSpeech
    var speechOutput= "Welcome to My NewsReader skill! Do you want to hear latest news headlines on any topic?"
    var reprompt = "What topic would you like to hear news headline on?"
    var rereprompt= "Would you like to hear more ?"

    var header = "Get Headlines"

    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

function handleGetNewsIntent(intent, session, callback) {

    var speechOutput = "We have an error"
    var rereprompt= "Would you like to hear more ?"

    getJSON(intent,function(data) {
        if (data != "ERROR") {
            var speechOutput = data+" . Hmmm... Would you like to hear more? Just say the topic, and i'll read the headlines for you! Or else, simply say exit."
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, rereprompt, false))
    })

}

function handleYesResponse(intent, session, callback) {
    var speechOutput = "Great! Which topic would you like to hear headlines on now?"
    var repromptText = speechOutput
    var shouldEndSession = false

    getJSON(intent,function(data) {
        if (data != "ERROR") {
            var speechOutput = data+" . Hmmm... Would you like to hear more? Just say the topic, and i'll read the headlines for you! Or else, simply say exit."
        }
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, rereprompt, false))
    })
}

function handleNoResponse(intent, session, callback) {
    var speechOutput = "No Problem! Thanks for using the skill. Good bye"
    var repromptText = speechOutput
    var shouldEndSession = true

    buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession)
}

function handleGetHelpRequest(intent, session, callback) {
    // Ensure that session.attributes has been initialized
    if (!session.attributes) {
        session.attributes = {};
    }

   var speechOutput = "I can read you latest headlines on any current topic in debate, or in the News. " + 
    "Remember, I can give only one topic headline at a time. Now... What topic are you interested in?" 

    var repromptText = speechOutput

    var shouldEndSession = false

    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession))

}

function handleFinishSessionRequest(intent, session, callback) {
    // End the session with a "Good bye!" if the user wants to quit the game
    callback(session.attributes,
        buildSpeechletResponseWithoutCard("Good bye! Thank you for using MY NYT skill!", "", true));
}

function url() {
    return "https://api.tronalddump.io/search/quote?query="
}

function url2(slotName) {
    return {
        url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
        qs: {
            "api-key" : "8430ae194d0a446a8b1b9b9d607b2acc",
            "q" : slotName
        }
    }
}

function getJSON(intent,callback) {
    // HTTP - WIKPEDIA
    // request.get(url(), function(error, response, body) {
    //     var d = JSON.parse(body)
    //     var result = d.query.searchinfo.totalhits
    //     if (result > 0) {
    //         callback(result);
    //     } else {
    //         callback("ERROR")
    //     }
    // })

    // HTTPS with NYT
    var slotName= intent.slots.topic.value.toLowerCase()


    request.get(url2(slotName), function(error, response, body) {
        var d = JSON.parse(body)
        var result = d.response.docs
        if (result.length > 0) {
            callback(result[Math.floor(Math.random() * result.length)].snippet)
        } else {
            callback("ERROR")
        }
    })
}


// ------- Helper functions to build responses for Alexa -------

function buildSSMLSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: "<speak> Welcome to My NewsReader skill!<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_neutral_response_01'/> Do you want to hear latest news headlines on any topic? </speak>"
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}