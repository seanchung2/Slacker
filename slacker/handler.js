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

var slackPostRequest = {
    host: 'hooks.slack.com',
    path: '/services/T2STKFLES/B5PLJV61Z/Xcow8mNU57ytCIxyIoxBt773',
    method: 'POST'
}
var slackHistoryRequest = {
    host: 'slack.com',
    path: '/api/channels.history',
    parameters: [
        {
          'key': 'token',
          'value': 'xoxp-214207973717-447071898710-446953101719-9b0312757a80f361c91a897c2013e978'
        },
        {
          'key': 'channel',
          'value': 'CD3FKLF7W'
        }
    ],
    method: 'GET'
}

// 2. Skill Code =======================================================================================================

function parameterize(parameters) {
    var params = '?'
    parameters.forEach((param) => {
        params += param.key + '=' + param.value + '&'
    })
    return params.slice(0, -1) // Cutoff the last & or ?
}

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
        readFromSlack('0', (message) => {
          console.log('Emmiittteddd')
            this.emit(':tell', message)
        })
    }
}

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================
var https = require('https')
function postToSlack(message, callback) {
    var req = https.request(slackPostRequest, (res) => {
        res.setEncoding('utf8')
        var returnData = ""

        res.on('data', (chunk) => {
            // Don't actually need this data
        })
        res.on('end', () => {
            callback() // assume it succeeded ^_^
        })
    })
    req.write(JSON.stringify({"text": message}))
    req.end()
}

function readFromSlack(period, callback) {
    var url = JSON.parse(JSON.stringify(slackHistoryRequest))
    console.log(url)
    var params = url.parameters
    console.log(params)
    //params.oldest = '0'
    url.path += parameterize(params)
    url.parameters = undefined
    console.log(JSON.stringify(url))

    var req = https.request(url, (res) => {
        res.setEncoding('utf8')
        var returnData = ''

        res.on('data', (chunk) => {
            console.log('Chjnked: ' + chunk)
            returnData += chunk
        })
        res.on('end', () => {
          console.log('Returning ' + returnData)
            callback(returnData)
        })
    })
    console.log('req socnturusta')
    req.on('error', (err) => {
      console.error(err.message)
    })
    req.write('')
    req.end()
    console.log('Req ended')
}


function getUserName(userID, callback) {
    var slackUsersInfoRequest = {
        host: 'slack.com',
        path: '/api/users.info',
        parameters: [
            {
                'key': 'token',
                'value': '???',
            },
            {
                'key': 'user',
                'value': userID
            }
        ],
        method: 'GET'
    }

    var url = JSON.parse(JSON.stringify(slackUsersInfoRequest))
    console.log(url)
    var params = url.parameters
    console.log(params)
    url.path += parameterize(params)
    url.parameters = undefined
    console.log(JSON.stringify(url))

    var req = https.request(url, (res) => {
        res.setEncoding('utf8')
        var returnData = ''

        res.on('data', (chunk) => {
            console.log('Chjnked: ' + chunk)
            returnData += chunk
        })

        res.on('end', () => {
          console.log('Returning ' + JSON.parse(returnData).user.real_name)
            callback(JSON.parse(returnData).user.real_name)
        })
    })
    console.log('req socnturusta')
    req.on('error', (err) => {
      console.error(err.message)
    })
    req.write('')
    req.end()
    console.log('Req ended')
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
