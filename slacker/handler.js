// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

var languageStrings = {
    'en': {
        'translation': {
            'WELCOME' : "Welcome to Slack Talk, your voice-to-Slack interface",
            'HELP'    : "Give me a message to post",
            'STOP'    : '<prosody rate="200%">bye bye bye</prosody>'
        }
    }
}

var slackRequest = {
    host: 'hooks.slack.com',
    path: '/services/T2STKFLES/B5PLJV61Z/Xcow8mNU57ytCIxyIoxBt773',
    method: 'POST'
}
// 2. Skill Code =======================================================================================================

var Alexa = require('alexa-sdk')

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context)

    // alexa.appId = 'amzn1.echo-sdk-ams.app.1234'
    ///alexa.dynamoDBTableName = 'YourTableName' // creates new table for session.attributes
    alexa.resources = languageStrings
    alexa.registerHandlers(handlers)
    alexa.execute()
}

var handlers = {
    'LaunchRequest': function () {
        var say = this.t('WELCOME') + ' ' + this.t('HELP')
        this.emit(':ask', say, say)
    },
    'AboutIntent': function () {
        this.emit(':ask', this.t('ABOUT'))
    },
    'SlackPostIntent': function () {
        //delegate to Alexa to collect all the required slot values
        //var filledSlots = delegateSlotCollection.call(this)
        /* // Uncomment this section to force Slack authentication
        if (this.event.session.user.accessToken == undefined) {
            this.emit(':tellWithLinkAccountCard', 'Please link your account')
            return
        }
        */
		    var message = this.event.request.intent.slots.message.value
        postToSlack(message, () => {
            this.emit(':tell', 'I successfully posted: ' + message)
        })
    },
    'SlackReadIntent': function () {
        var message = 'T.J. said This is an example'
        message += '<break strength="x-strong"/> Sean said This is another example'
        this.emit(':tell', 'message')
    }
}

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function postToSlack(message, callback) {
    var https = require('https')
    
    //slackRequest.headers = {
    //      'Content-Type': 'application/x-www-form-urlencoded',
    //      'Content-Length': Buffer.byteLength(message)
    //  }
    var req = https.request(slackRequest, res => {
        res.setEncoding('utf8')
        var returnData = ""

        res.on('data', (chunk) => {
            //returnData = returnData + chunk
        });
        res.on('end', () => {
            callback()
            //var channelObj = JSON.parse(returnData)

            //callback()
        })
    });
    req.write(JSON.stringify({"text": message}))
    req.end()
}

function delegateSlotCollection(){
  console.log("in delegateSlotCollection")
  console.log("current dialogState: "+this.event.request.dialogState)
      console.log("returning: "+ JSON.stringify(this.event.request.intent))
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning")
	  var updatedIntent= null
	  // updatedIntent=this.event.request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      //this.emit(":delegate", updatedIntent); //uncomment this is using ASK SDK 1.0.9 or newer
	  
	  //this code is necessary if using ASK SDK versions prior to 1.0.9 
	  if(this.isOverridden()) {
			return
		}
		this.handler.response = buildSpeechletResponse({
			sessionAttributes: this.attributes,
			directives: getDialogDirectives('Dialog.Delegate', updatedIntent, null),
			shouldEndSession: false
		})
		this.emit(':responseReady', updatedIntent)
		
    } else if (this.event.request.dialogState !== "COMPLETED") {
      console.log("in not completed")
      // return a Dialog.Delegate directive with no updatedIntent property.
      //this.emit(":delegate"); //uncomment this is using ASK SDK 1.0.9 or newer
	  
	  //this code necessary is using ASK SDK versions prior to 1.0.9
		if(this.isOverridden()) {
			return
		}
		this.handler.response = buildSpeechletResponse({
			sessionAttributes: this.attributes,
			directives: getDialogDirectives('Dialog.Delegate', updatedIntent, null),
			shouldEndSession: false
		})
		this.emit(':responseReady')
		
    } else {
      console.log("in completed")
      console.log("returning: "+ JSON.stringify(this.event.request.intent))
      // Dialog is now complete and all required slots should be filled,
      // so call your normal intent handler.
      return this.event.request.intent;
    }
}

function buildSpeechletResponse(options) {
    var alexaResponse = {
        shouldEndSession: options.shouldEndSession
    };

    if (options.output) {
        alexaResponse.outputSpeech = createSpeechObject(options.output);
    }

    if (options.reprompt) {
        alexaResponse.reprompt = {
            outputSpeech: createSpeechObject(options.reprompt)
        };
    }

    if (options.directives) {
        alexaResponse.directives = options.directives;
    }

    if (options.cardTitle && options.cardContent) {
        alexaResponse.card = {
            type: 'Simple',
            title: options.cardTitle,
            content: options.cardContent
        };

        if(options.cardImage && (options.cardImage.smallImageUrl || options.cardImage.largeImageUrl)) {
            alexaResponse.card.type = 'Standard';
            alexaResponse.card['image'] = {};

            delete alexaResponse.card.content;
            alexaResponse.card.text = options.cardContent;

            if(options.cardImage.smallImageUrl) {
                alexaResponse.card.image['smallImageUrl'] = options.cardImage.smallImageUrl;
            }

            if(options.cardImage.largeImageUrl) {
                alexaResponse.card.image['largeImageUrl'] = options.cardImage.largeImageUrl;
            }
        }
    } else if (options.cardType === 'LinkAccount') {
        alexaResponse.card = {
            type: 'LinkAccount'
        };
    } else if (options.cardType === 'AskForPermissionsConsent') {
        alexaResponse.card = {
            type: 'AskForPermissionsConsent',
            permissions: options.permissions
        };
    }

    var returnResult = {
        version: '1.0',
        response: alexaResponse
    };

    if (options.sessionAttributes) {
        returnResult.sessionAttributes = options.sessionAttributes;
    }
    return returnResult;
}

function getDialogDirectives(dialogType, updatedIntent, slotName) {
    let directive = {
        type: dialogType
    };

    if (dialogType === 'Dialog.ElicitSlot') {
        directive.slotToElicit = slotName;
    } else if (dialogType === 'Dialog.ConfirmSlot') {
        directive.slotToConfirm = slotName;
    }

    if (updatedIntent) {
        directive.updatedIntent = updatedIntent;
    }
    return [directive];
}