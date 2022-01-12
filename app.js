import { Telegraf, Markup } from 'telegraf'

const bot = new Telegraf('5093459501:AAEl_zQ972vvaqoFiJsy26gcIofvPG66dF0')

const gamePattern = /\w* x \w*/

var lastMessage;
var isListening = false;

var creating = []

var games = []

bot.start((ctx) => ctx.reply('Hi, My name is Roundbet Bot, I\'m here to assist you to make any type of bets with your friends! Start by using /creategame'))

bot.command('creategame', (ctx) => {

    let talkingTo = ctx.message.from.id
    
    if (creating.includes(talkingTo)){
        ctx.reply(`Calm down, @${ctx.from.username}! You are already creating a game.`)
    }
    else {
        creating.push(talkingTo)
        ctx.reply(`OK @${ctx.from.username}. Send me the participants like this:\n\nTeam1 x Team2`)

        waitUserMessage(talkingTo)
        .then(gameStr => {
            console.log(gameStr);
            if (gamePattern.test(gameStr)){
                let game = gameStr.split('x')
                let team1 = game[0].trim()
                let team2 = game[1].trim()
                games.push({team1, team2, gameStr})

                ctx.reply('Your game was created!')
            }
            else{
                ctx.reply('Sorry, I didn\'t understand, please try again /creategame')
            }
            removeFromList(creating, talkingTo)
        })
        .catch(() => {
            ctx.reply(`Sorry, @${ctx.from.username}. Your operation timed out`)
            removeFromList(creating, talkingTo)
        });
    }
})

bot.command('listgames', (ctx) => {
    let reply;
    if (games.length > 0){
        reply = `Let's go! Open games are: \n\n`

        let game;
        for (let i = 0; i < games.length; i++){
            game = games[i]
            reply += `${i+1}. ${game.gameStr}\n`
        }
    
        reply += `\nuse /placebet to place your bet!`

    }
    else {
        reply = "Oh no! There no games!\n\nCreate a game using /creategame"
    }

    ctx.reply(reply)
})

/*bot.command('placebet', (ctx) => {
    ctx.reply('One time keyboard', Markup
    .keyboard(['/simple', '/inline', '/pyramid'])
    .oneTime()
    .resize()
  )
})*/

function removeFromList(list, toRemove){
    list.splice(list.indexOf(toRemove), 1)
}

async function waitUserMessage(talkingTo){
    return new Promise(function(resolve, reject) {
        isListening = true;
        let waiting = setInterval(() => {
            if (lastMessage && lastMessage.from.id == talkingTo){
                clearInterval(waiting)
                isListening = false
    
                resolve(lastMessage.text)
                lastMessage = undefined
            }
        }, 1000)
    
        setTimeout(() => {
            clearInterval(waiting)
            isListening = false
            
            reject()
        }, 20000)
    })
}

bot.on('text', (ctx) => {
    if (isListening){
        lastMessage = ctx.message
    }
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))