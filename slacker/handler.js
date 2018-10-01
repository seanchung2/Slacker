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
    path: '/services/T6A63UMM3/BD3SGM1DJ/HCb3HoFaIjUqfD7oRCF4ltXC',
    method: 'POST'
}
var slackHistoryRequest = {
    host: 'slack.com',
    path: '/api/channels.history',
    parameters: [
        {
          'key': 'channel',
          'value': 'CD3FKLF7W'
        },
        {
          'key': 'count',
          'value': 3
        }
    ],
    method: 'GET'
}
const slackUsersInfoRequest = {
    host: 'slack.com',
    path: '/api/users.info',
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

async function messageAsSpeech(token, message) {
    var user = ''
    var text = ''
    if (!message.hasOwnProperty('user')) {
        user = message.bot_id
        text = message.text
        user = 'Slacker'
        text = await translateText(token, text)

        return '' + user + ' said, ' + text + '.<break strength="x-strong"/>'
    }
    user = message.user.replace(/<>@/g, '')// or text.user
    text = message.text
    console.log('Pre translation')
    console.log(user)
    console.log(text)
    user = await getUserName(token, user)
    text = await translateText(token, text)
    console.log('Post translation')
    console.log(user)
    console.log(text)

    return '' + user + ' said, ' + text + '.<break strength="x-strong"/>'
}

async function translateText(token, text) {
    var translated = ''
    var text = text.replace(/[\\\[\]]/g, '')

    var index = text.indexOf('<@')
    while((index = text.indexOf('<@')) !== -1) {
        if(index !== -1)
        {
            translated += text.substring(0, index)
            var mention = text.substring(index + 2, text.indexOf('>'))

            var user = await getUserName(token, mention)
            translated += ' at ' + user

            text = text.substring(text.indexOf('>')+1)
        }
    }

    return (translated + text).replace(/[<>]/g, '')
}

function timestampFromDuration(duration) {
    console.log(duration)
    var time = parseInt(duration.replace(/PT([0-9]*)[SMH]/g, '$1'))
    var timeUnit = duration.replace(/PT[0-9]*([SMH])/g, '$1')
    console.log(time)
    console.log(timeUnit)
    if (timeUnit === 'S')
        time *= 1000
    else if (timeUnit === 'M')
        time *= 60000
    else if (timeUnit === 'H')
        time *= 3600000
    console.log((new Date).getTime())
    console.log(time)
    return (new Date).getTime() - time
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
        // Uncomment this section to force Slack authentication
        if (!this.event.session.user.accessToken) {
            this.emit(':tellWithLinkAccountCard', 'Please link your Slack account')
            return
        }

		    var message = this.event.request.intent.slots.message.value
        postToSlack(message, () => {
            this.emit(':tell', 'I successfully posted: ' + message)
        })
    },
    'SlackReadIntent': function () {
        if (this.event.session.user.accessToken == undefined) {
            this.emit(':tellWithLinkAccountCard', 'Please link your account')
            return
        }
        var token = this.event.session.user.accessToken
        var duration = this.event.request.intent.slots.AmazonDuration.value
        if (!duration || true) {
          duration = 'PT5M'
        }
        var timestamp = timestampFromDuration(duration)

        readFromSlack(token, timestamp, (history) => {
            var speech = ''
            console.log(history)
            var promises = history.messages.map((message) => {
                return messageAsSpeech(token, message)
            })

            Promise.all(promises).then((values) => {
                var speech = values.reverse().join(' ')
                this.emit(':tell', speech)
            })
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

function readFromSlack(token, timestamp, callback) {
    var url = JSON.parse(JSON.stringify(slackHistoryRequest))
    var params = url.parameters
    params.push({
      'key': 'token',
      'value': token
    })
    // params.push({
    //   'key': 'oldest',
    //   'value': timestamp
    // })
    url.path += parameterize(params)
    url.parameters = undefined

    var req = https.request(url, (res) => {
        res.setEncoding('utf8')
        var returnData = ''

        res.on('data', (chunk) => {
            returnData += chunk
        })
        res.on('end', () => {
            callback(JSON.parse(returnData))
        })
    })
    req.on('error', (err) => {
    })
    req.end()
}


async function getUserName(token, userID, callback) {
    return new Promise((resolve, reject) => {
        var url = JSON.parse(JSON.stringify(slackUsersInfoRequest))
        var params = [{
            'key': 'token',
            'value': token
        },{
            'key': 'user',
            'value': userID
        }
        ]
        url.path += parameterize(params)
        url.parameters = undefined

        var req = https.request(url, (res) => {
            res.setEncoding('utf8')
            var returnData = ''

            res.on('data', (chunk) => {
                returnData += chunk
            })

            res.on('end', () => {
                console.log(returnData)
                resolve(JSON.parse(returnData).user.real_name)
            })
        })
        req.on('error', (err) => {
          reject(err)
        })
        req.end()
    })
}

function delegateSlotCollection(){
  //console.log("in delegateSlotCollection")
  //console.log("current dialogState: "+this.event.request.dialogState)
      //console.log("returning: "+ JSON.stringify(this.event.request.intent))
    if (this.event.request.dialogState === "STARTED") {
      //console.log("in Beginning")
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
      //console.log("in not completed")
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
      //console.log("in completed")
      //console.log("returning: "+ JSON.stringify(this.event.request.intent))
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
