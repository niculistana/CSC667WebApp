var game = new Phaser.Game(740, 600, Phaser.AUTO, 'phaser-window', { preload: preload, create: create });
var logo;
var text;
var globalDiePool;
var playerStash;
var dieBidPool;
var playerPool;
var channel;
var channel2;
var gameId = "";
var gameName = "";

var gameFileKeys = ['dollars', 'logo', 'dice1', 'dice2', 'dice3', 'dice4', 'dice5', 'dice6',
'player1','player2','player3','player4','player5','player6','player7','player8'];
var gameFiles = ['sprites/dollar_sign.png', 'sprites/liars_dice_logo.png',
'sprites/_main/dice/dieRed1.png', 'sprites/_main/dice/dieRed2.png',
'sprites/_main/dice/dieRed3.png', 'sprites/_main/dice/dieRed4.png',
'sprites/_main/dice/dieRed5.png', 'sprites/_main/dice/dieRed6.png',
'sprites/_main/player/player1.png', 'sprites/_main/player/player2.png',
'sprites/_main/player/player3.png', 'sprites/_main/player/player4.png',
'sprites/_main/player/player5.png', 'sprites/_main/player/player6.png',
'sprites/_main/player/player7.png', 'sprites/_main/player/player8.png'];
var pusher = new Pusher("926b2fce0ff5222dc001", {
    cluster: 'eu',
    encrypted: true
});

// temporary button groups
var testButtonGroup;
var sceneButtonGroup;

// ui groups

var gameRoundGroup;
var gameNameGroup;
var gameTimeGroup;
var gameModeGroup;
var playerProfileGroup;

var gameControlsGroup;
var gameMenuGroup;
var playerDiceGroup;

function preload() {
    //For production, we change the url to intense-temple
    game.load.baseURL = "/";
    // staging url
    // game.load.baseURL = "https://staging-4242.herokuapp.com";

    // production url
    // game.load.baseURL = "https://intense-temple-36417.herokuapp.com/";
    game.load.path = "phaser/";
    game.load.spritesheet('rect_buttons', 'sprites/uipack_fixed/new_ui/buttons/rect_buttons.png', 192, 49);
    game.load.spritesheet('square_buttons', 'sprites/uipack_fixed/new_ui/buttons/square_buttons.png', 51, 49);
    game.load.spritesheet('square_buttons_plus', 'sprites/uipack_fixed/new_ui/buttons/square_buttons_plus.png', 51, 49);
    game.load.spritesheet('square_buttons_minus', 'sprites/uipack_fixed/new_ui/buttons/square_buttons_minus.png', 51, 49);
    game.load.images(gameFileKeys, gameFiles);
    globalDiePool = new diePool();
    globalDiePool.generatePool(4);
    playerStash = new diePool();
    dieBidPool = new diePool();
    playerPool = new playerPool(4);
}

$(document).ready(function(event){
    $.get('/session/name_id', onGetNameIdSuccess);
});

function onGetNameIdSuccess(event) {
    gameId = event.id.toString();
    gameName = event.name;
    joinLobby();
    console.log("game_channel"+gameId);
    channel = pusher.subscribe("game_channel"+gameId);
    channel2 = pusher.subscribe("chat_channel"+gameId);
    channel2.bind('chat', chat);
    channel2.bind("chat_add", playerAdd);

    channel.bind('challenge_event', function(data) {
        //Convert diepool from the controller into diepool object
        testButtonText.text = data.uname + " challenges the bid!";
        var diePoolController = data.diepool.split(",").map(Number);
        var newObject = [];
        for(var i = 0; i < diePoolController.length; i++) {
            newObject.push(diePoolController[i]);
        }
        //Set globalDiePool.allObjects = newObject
        globalDiePool.allObjects = newObject;

        //settimeout before rendering diepool?
        //render diepool
        console.log(globalDiePool.allObjects);
        dieSpriteGroup.renderSprites("box");

        //Render who won or lost
        if(data.result) {
            //Challenger loses dice
            testButtonText.text = data.uname + " lost the challenge!";
            console.log("Current player lost");
        } else {
            //Challengee loses dice
            testButtonText.text = data.uname + " lost the challenge!";
            console.log("previous player lost");
        }
        //Call start round to render new dice and start new round

        num_users_remaining = data.num_users_remaining;
        console.log("num_users_remaining: " + num_users_remaining);
        setTimeout(function(){
            globalDieGroup.removeAll();
            stashGroup.removeAll();
            dieBidGroup.removeAll();
            if (num_users_remaining > 1)
                startRound();
            else
                endGame();
        }, 3000);
    });

    channel.bind("bid_event", function(event) {
        //render bid to everyone
        $('#dieQuantity').text(event.quantity);
        $('#dieValue').text(event.value);

        dieBidPool.emptyDiePool();
        dieBidGroup.removeAll();
        dieValue = parseInt($("#dieValue").text());
        dieQuantity = parseInt($("#dieQuantity").text());
        for (var i = 0; i < dieQuantity; i++) 
            dieBidPool.addDie(Math.ceil(dieValue));
        dieBidSpriteGroup.renderSprites("box");

        dieQuantity = event.quantity;
        dieValue = event.value;
        previousPlayerId = event.prev_player_id;

        $.get("/session/recent_user_name/"+previousPlayerId, function (event){
            var playerUsername = event.uname;
            testButtonText.text = playerUsername + " placed a bid: " + dieQuantity + " #" + dieValue + "'s";
        });

        var nextPlayerId = event.turn;
        setTimeout(function(){
            $.get("/session/recent_user_name/"+nextPlayerId, function (event){
                var playerUsername = event.uname;
                testButtonText.text = "It's " + playerUsername + "'s turn.";
            });
        }, 2000);
    });
    channel.bind("render_add", function(event) {
        console.log("I have rendered");
        console.log(event);
        //if event.logged_in_users
        for(var player = 0; player<event.logged_in_users; player++) {
            playerPool.addPlayer(new Player("", player));
        }
        playerSpriteGroup.renderSprites("octagonal");
        startGame();
    });

    channel.bind("render_delete", function(event) {
        console.log("I have rendered");
        console.log(event);
        var playerId = event.user_id;
        $.get('/session/recent_user_name/'+playerId, function(event) {
            var playerUsername = event.uname;
            testButtonText.text = playerUsername + " left the game.";
            playerGroup.removeAll();
            playerPool.removePlayer(playerPool.getUserIndexByUserName(playerUsername));
            playerSpriteGroup.renderSprites("octagonal");
        });
    });

    channel.bind("render_game_start", function(event) {
        logo.destroy();
        var gameName = event.name;
        $(".overLayTopLeft").removeClass("hidden");
        $(".overLayTopRight").removeClass("hidden");
        testButtonText.text = gameName + " has started, enjoy!";
        startRound();
    });

    channel.bind("render_round_start", function(event) {
        globalDiePool.allObjects = event.diepool.split(",");
        var gameRound = event.round;
        $(".numRounds").text(gameRound);
        testButtonText.text = "Round " + gameRound + " has started. Bid amount and value is reset. Get ready!";

        setTimeout(function(){
            $.get('/session/game_turn_id', function(event) {
                var playerId = event.turn;
                $.get('/session/recent_user_name/'+playerId, function(event) {
                    var playerUsername = event.uname;
                    testButtonText.text = "It's " + playerUsername + "'s turn.";
                });
            });
        },2000);
    });

    channel.bind("render_game_end", function(event) {
        var winnerId = event.winner_id;
        $.get('/session/recent_user_name/'+winnerId, function(event) {
            var winnerUserName = event.uname;
            testButtonText.text = "Game is over! The winner is " + winnerUserName + "! Congratulations :)";
        });
    });

    channel.bind("render_round_end", function(event) {
        // do event broadcasting stuff here
        // increment round number here
        testButtonText.text = "Round # 2 ended. Starting round # 3.";
    });
}

function create() {
    game.stage.backgroundColor = "#fff";

    logo = game.add.sprite(game.world.centerX, game.world.centerY, 'logo');

    logo.anchor.setTo(0.5, 0.5);
    // logo.alpha = 0;

    // game.add.tween(logo).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true);
    debugText = game.add.text(game.world.centerX, game.world.centerY, "",{ font: "12px Arial", fill: "#ff0044", align: "left" });
    testButtonText = game.add.text(game.world.centerX, game.world.centerY, "",{ font: "12px Arial", fill: "#ff0044", align: "left" });
    diePoolText = game.add.text(game.world.centerX, game.world.centerY, "",{ font: "12px Arial", fill: "#ff0044", align: "center", wordWrap: true, wordWrapWidth: 100 });
    playerText = game.add.text(game.world.centerX, game.world.centerY, "",{ font: "12px Arial", fill: "#ff0044", align: "center", wordWrap: true, wordWrapWidth: 100 });

    debugText.fixedToCamera = true;
    debugText.cameraOffset.setTo(200, 500);

    testButtonText.fixedToCamera = true;
    testButtonText.cameraOffset.setTo(10, 50);

    graphics = game.add.graphics(game.world.centerX, game.world.centerY);

    //*** top-ui ***
    // playerProfileGroup
    // graphics.lineStyle(5, 0x0000FF, 1);
    // graphics.drawRect(310, -290, 50, 50);

    playerProfileGroup = game.add.group();
    playerProfileGroup.position.x = game.world.centerX+320;
    playerProfileGroup.position.y = game.world.centerY-280;
    playerProfileButton = game.make.button(0, 0, 'square_buttons', function(){}, this, 2, 1, 0);
    playerProfileButton.scale.setTo(0.70, 0.70);
    window.rich = playerProfileButton;

    playerProfileGroup.add(playerProfileButton);
    // end playerProfileGroup
    // *** end top-ui ***

    // ** player area **
    // shows the player group
    playerGroup = game.add.group();
    playerSpriteGroup = new SpriteGroup("player", playerGroup, playerPool, 6, -20, -80);
    playerGroup.position.setTo(game.world.centerX, game.world.centerY);
    playerGroup.scale.setTo(0.75,0.75);
    // end playerSpriteGroup
    // ** end player area **

    //*** bottom-ui ***
    // diceSpriteGroup
    graphics.lineStyle(5, 0x0000FF, 1);
    graphics.drawRect(-360, 190, 300, 100);

    // shows the die group
    //Put in top middle?
    globalDieGroup = game.add.group();
    dieSpriteGroup = new SpriteGroup("dice", globalDieGroup, globalDiePool, game.world.centerX+500, game.world.centerY+900);
    globalDieGroup.scale.setTo(0.35,0.35);
    // end diceSpriteGroup

    // dieBidSpriteGroup
    // shows the dieBid group
    dieBidGroup = game.add.group();
    dieBidSpriteGroup = new SpriteGroup("dice", dieBidGroup, dieBidPool, game.world.centerX+500, game.world.centerY+400);
    // dieBidSpriteGroup.renderSprites("box");
    dieBidGroup.scale.setTo(0.35,0.35);
    // end diceBidSpriteGroup

    stashGroup = game.add.group();
    dieStashGroup = new SpriteGroup("dice", stashGroup, playerStash, game.world.centerX-275, game.world.centerY+750);
    stashGroup.scale.setTo(0.50,0.50);

    // gameControlsGroup
    graphics.lineStyle(5, 0x0000FF, 1);
    graphics.drawRect(-60, 190, 160, 100);

    gameControlsGroup = game.add.group();
    gameControlsGroup.position.x = game.world.centerX;
    gameControlsGroup.position.y = game.world.centerY+200;
    decrementDieQuantityButton = game.make.button(-50, 30, 'square_buttons_minus', decrementDieQuantity, this, 2, 1, 0);
    decrementDieQuantityButton.scale.setTo(0.35, 0.35);
    window.rich = decrementDieQuantityButton;

    incrementDieQuantityButton = game.make.button(-20, 30, 'square_buttons_plus', incrementDieQuantity, this, 2, 1, 0);
    incrementDieQuantityButton.scale.setTo(0.35, 0.35);
    window.rich = incrementDieQuantityButton;

    decrementDieValueButton = game.make.button(40, 30, 'square_buttons_minus', decrementDieValue, this, 2, 1, 0);
    decrementDieValueButton.scale.setTo(0.35, 0.35);
    window.rich = decrementDieValueButton;

    incrementDieValueButton = game.make.button(70, 30, 'square_buttons_plus', incrementDieValue, this, 2, 1, 0);

    incrementDieValueButton.scale.setTo(0.35, 0.35);
    window.rich = incrementDieValueButton;
 
    challengeButton = game.make.button(-50, 60, 'rect_buttons', challenge, this, 2, 1, 0);
    challengeButton.scale.setTo(0.25, 0.50);

    window.rich = challengeButton;

    makeBidButton = game.make.button(40, 60, 'rect_buttons', bid, this, 2, 1, 0);
    makeBidButton.scale.setTo(0.25, 0.50);
    window.rich = makeBidButton;

    gameControlsGroup.add(decrementDieQuantityButton);
    gameControlsGroup.add(incrementDieQuantityButton);
    gameControlsGroup.add(decrementDieValueButton);
    gameControlsGroup.add(incrementDieValueButton);
    gameControlsGroup.add(challengeButton);
    gameControlsGroup.add(makeBidButton);
    // end gameControlsGroup

    // gameMenuGroup
    graphics.lineStyle(5, 0x0000FF, 1);
    graphics.drawRect(100, 190, 260, 100);
    window.graphics = graphics;

    gameMenuGroup = game.add.group();
    gameMenuGroup.position.x = game.world.centerX+115;
    gameMenuGroup.position.y = game.world.centerY+200;

    // menuButton1 = game.make.button(0, 25, 'rect_buttons', testMethod1, this, 2, 1, 0);
    // menuButton1.scale.setTo(0.60, 0.50);
    // window.rich = menuButton1;

    // menuButton2 = game.make.button(0, 50, 'rect_buttons', testMethod2, this, 2, 1, 0);
    // menuButton2.scale.setTo(0.60, 0.50);
    // window.rich = menuButton2;

    // menuButton3 = game.make.button(120, 25, 'rect_buttons', testMethod3, this, 2, 1, 0);
    // menuButton3.scale.setTo(0.60, 0.50);
    // window.rich = menuButton3;

    // menuButton4 = game.make.button(120, 50, 'rect_buttons', testMethod4, this, 2, 1, 0);
    // menuButton4.scale.setTo(0.60, 0.50);
    // window.rich = menuButton4;

    // gameMenuGroup.add(menuButton1);
    // gameMenuGroup.add(menuButton2);
    // gameMenuGroup.add(menuButton3);
    // gameMenuGroup.add(menuButton4);
    // end gameMenuGroup

    // *** end-bottom-ui ***

    // Begin scene UI group
    // sceneButtonGroup = game.add.group();
    // var button5 = game.make.button(game.world.centerX - 360, 550, 'rect_buttons', waitGame, this, 2, 1, 0);
    // button5.scale.setTo(0.35, 0.35);
    // window.rich = button5;

    // var button6 = game.make.button(game.world.centerX - 280, 550, 'rect_buttons', startGame, this, 2, 1, 0);
    // button6.scale.setTo(0.35, 0.35);
    // window.rich = button6;

    // var button7 = game.make.button(game.world.centerX - 200, 550, 'rect_buttons', continueGame, this, 2, 1, 0);
    // button7.scale.setTo(0.35, 0.35);
    // window.rich = button7;

    // var button8 = game.make.button(game.world.centerX - 120, 550, 'rect_buttons', endGame, this, 2, 1, 0);
    // button8.scale.setTo(0.35, 0.35);
    // window.rich = button8;

    // sceneButtonGroup.add(button5);
    // sceneButtonGroup.add(button6);
    // sceneButtonGroup.add(button7);
    // sceneButtonGroup.add(button8);
    // End scene UI testButtonGroup
}

function testMethod1() {
    // startGame();
    endGame();
}

function testMethod2() {
    startRound();
    // globalDiePool.shuffleDice();
    // challenge();
    // bid();
    // // testButtonText.text = "Challenge";
    // startRound();
}

function testMethod3() {
    startTurn();
    // joinLobby();
    // readyButton();
}

function testMethod4() {
    endTurn();
    // leaveLobby();
    // playerPool.removePlayer(0);
    // playerSpriteGroup.renderSprites("octagonal");
}