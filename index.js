'use strict';
 
const todayMenuBeverageType = {
    'mocha': { 'size': ['short', 'small', 'medium', 'large'] },
    'chai': { 'size': ['small', 'short'] },
};
 
function buildMessage(messageContent) {
    return {
        contentType: 'PlainText',
        content: messageContent,
    };
}
 
function buildResponseCard(title, subTitle, options) {
    let buttons = null;
    if (options !== null) {
        buttons = [];
        for (let i = 0; i < Math.min(5, options.length); i++) {
            buttons.push(options[i]);
        }
    }
    return {
        "title": title,
        "subtitle": subTitle,
        "buttons": buttons,
    };
}
 
function buildResponseOptions(optionsArray = Array) {
    var responseOptions = [];
    for (var i = 0; i < optionsArray.length; i++) {
        var temp = {
            "text": optionsArray[i],
            "value": optionsArray[i],
        };
        responseOptions.push(temp);
    }
    return responseOptions;
}
 
function keyExists(key, search) {
    if (!search || (search.constructor !== Array && search.constructor !== Object)) {
        return false;
    }
    for (var i = 0; i < search.length; i++) {
        if (search[i] === key) {
            return true;
        }
    }
    return key in search;
}
 
function elicitSlot(sessionAttributes, intentRequest, slots, slotToElicit, message, responseCard) {
    return {
        "sessionState": {
            "sessionAttributes": sessionAttributes,
            "dialogAction": {
                "type": "ElicitSlot",
                "slotToElicit": slotToElicit,
            },
            "intent": {
                "name": intentRequest['sessionState']['intent']['name'],
                "slots": slots,
                "state": "Fulfilled",
            },
        },
        'sessionId': intentRequest['sessionId'],
        "messages": [
            {
                "contentType": message ? message.contentType : "PlainText",
                "content": message ? message.content : " ",
            },
            responseCard ? {
                "contentType": "ImageResponseCard",
                "content": message ? message.content : " ",
                "imageResponseCard": responseCard ? responseCard : {},
            } : {
                "contentType": message ? message.contentType : "PlainText",
                "content": message ? message.content : " ",
            },
        ],
    };
}
 
function close(sessionAttributes, intentRequest, fulfillmentState, message, responseCard) {
    return {
        "sessionState": {
            "sessionAttributes": sessionAttributes,
            "dialogAction": {
                "type": "Close",
            },
            "intent": {
                "name": intentRequest['sessionState']['intent']['name'],
                "state": "Fulfilled",
            },
        },
        'sessionId': intentRequest['sessionId'],
        "messages": [
            {
                "contentType": message ? message.contentType : null,
                "content": message ? message.content : null,
            },
            {
                "contentType": "ImageResponseCard",
                "content": message.content,
                "imageResponseCard": responseCard,
            },
        ],
    };
}
 
function delegate(intentRequest) {
    return {
        "sessionState": {
            "dialogAction": {
                "type": "Delegate",
            },
            "intent": {
                "name": intentRequest["sessionState"]["intent"]["name"],
                "state": 'Fulfilled',
                "slots": intentRequest["interpretations"][0]["intent"]["slots"],
            },
        },
        'sessionId': intentRequest['sessionId'],
    };
}
 
function orderBeverage(intentRequest, callback) {
    const outputSessionAttributes = intentRequest.sessionState.sessionAttributes;
    const source = intentRequest.invocationSource;
 
    if (source === 'DialogCodeHook') {
        const slots = intentRequest["interpretations"][0]["intent"]["slots"];
 
        const beverageType = intentRequest["interpretations"][0]["intent"]["slots"]["BeverageType"]["value"]["interpretedValue"] || null;
        const beverageSize = intentRequest["interpretations"][0]["intent"]["slots"]["BeverageSize"] ? intentRequest["interpretations"][0]["intent"]["slots"]["BeverageSize"]["value"]["interpretedValue"] : null;
        const beverageTemp = intentRequest["interpretations"][0]["intent"]["slots"]["BeverageTemp"] ? intentRequest["interpretations"][0]["intent"]["slots"]["BeverageTemp"]["value"]["interpretedValue"] : null;
 
        if (!(beverageType && keyExists(beverageType, todayMenuBeverageType))) {
            var menuItem = buildResponseOptions(Object.keys(todayMenuBeverageType));
 
            callback(
                elicitSlot(
                    outputSessionAttributes,
                    intentRequest,
                    slots,
                    'BeverageType',
                    buildMessage('Sorry, but we can only do a mocha or a chai. What kind of beverage would you like?'),
                    buildResponseCard("Menu", "Today's Menu", menuItem)
                )
            );
        }
 
        if (!(beverageSize && beverageSize.match(/short|tall|grande|venti|small|medium|large/) && keyExists(beverageSize, todayMenuBeverageType[beverageType].size))) {
            if (beverageSize) {
                var sizeOfItem = buildResponseOptions(todayMenuBeverageType[beverageType].size);
 
                callback(
                    elicitSlot(
                        outputSessionAttributes,
                        intentRequest,
                        slots,
                        'BeverageSize',
                        buildMessage('Sorry, but we don\'t have this size; consider a small.  What size?'),
                        buildResponseCard(`${beverageType}`, "available sizes", sizeOfItem)
                    )
                );
            } else {
                var sizeOfItem = buildResponseOptions(todayMenuBeverageType[beverageType].size);
 
                callback(
                    elicitSlot(
                        outputSessionAttributes,
                        intentRequest,
                        slots,
                        'BeverageSize',
                        buildMessage("What size?"),
                        buildResponseCard(`${beverageType}`, "available sizes", sizeOfItem)
                    )
                );
            }
        }
 
        if (!(beverageTemp && beverageTemp.match(/kids|hot|iced/))) {
            callback(
                elicitSlot(
                    outputSessionAttributes,
                    intentRequest,
                    slots,
                    'BeverageTemp',
                    buildMessage('What temperature?'),
                    buildResponseCard('Temperature', "Available Temperatures", buildResponseOptions(['kids', 'iced', 'hot']))
                )
            );
        }
 
        callback(delegate(intentRequest));
        return;
    } else {
        callback(
            close(
                outputSessionAttributes,
                intentRequest,
                'Fulfilled',
                {
                    contentType: 'PlainText',
                    content: `Great!  Your ${intentRequest["interpretations"][0]["intent"]["slots"]["BeverageSize"]["value"]["interpretedValue"]} will be available for pickup soon.  Thanks for using CoffeeBot!`,
                }
            )
        );
    }
}
 
function dispatch(intentRequest, callback) {
    return orderBeverage(intentRequest, callback);
}
 
export const handler = async (event, context, callback) => {
    dispatch(event, (response) => callback(null, response));
 
    const intent = event['sessionState']['intent']['name'];
    const BeverageType = event["interpretations"][0]["intent"]["slots"]["BeverageType"]["value"]["interpretedValue"];
 
    const response = {
        "sessionState": {
            "dialogAction": {
                "type": "Close",
            },
            "intent": {
                "name": intent,
                "state": 'Fulfilled',
            },
        },
        'sessionId': event['sessionId'],
        "messages": [
            {
                "contentType": "PlainText",
                "content": "You said " + BeverageType,
            },
        ],
    };
 
    return response;
};
