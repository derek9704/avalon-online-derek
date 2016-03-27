var _ = require('lodash');

var io = require('./../../server').io;
var players = require('./../../server').players;
var database = require('./../../server').database;
var rooms = require('./../../server').rooms;

var Lobby = require('./../lobby');
var Room = require('./../room');

var GameMain = require('./../game');
var GameMission = require('./game_mission');

var assassinAction = exports.assassinAction = function(game){

  _.each(game.players, function(player, playerId){
    if(player.role === 'assassin'){
      //add log
      var text = player.name + " is assassinating.";
      game.log.push(text);
      GameMain.updateGameInfo(game);
      //assassin logic
      var assassinId = playerId;
      var assassinSocket = players.PtoS[assassinId];
      assassinSocket.on('C_submitKill', function(data){
        var targetId = data.target;
        //add log
        var text = game.players[targetId].name + " is killed.";
        game.log.push(text);

        if(game.players[targetId].role === 'merlin'){
          //assassin success; evil wins
          game.results.assassinSuccess = true;
          game.results.goodWins = false;
          resolveGame(game);
        }else{
          //assassin fail; good wins
          game.results.assassinSuccess = false;
          game.results.goodWins = true;
          resolveGame(game);
        }
        delete assassinSocket._events.C_submitKill;
      });
      assassinSocket.emit('S_assassinActs');
    }
  });
};

var resolveGame = exports.resolveGame = function(game){
  //decide victory
  var roomName = game.room;
  var room = rooms.closed[roomName];
  var goodWins = game.results.goodWins;

  //add log
  var text = goodWins ? 'good' : 'evil' + " prevail!!!";
  game.log.push(text);
  GameMain.updateGameInfo(game);

  io.to(roomName).emit('S_resolveGame', {goodWins: goodWins});

  var stayingPlayers = [];
  var leavingPlayers = [];

  _.each(game.players, function(player, playerId){
    var playerSocket = players.PtoS[playerId];
    delete playerSocket._events.C_stayInRoom;
    playerSocket.on('C_stayInRoom', function(){
      stayingPlayers.push(playerId);
      if(stayingPlayers.length === game.info.size){
        //all players stay; start a new game; all current game data in memory lost
        GameMain.startGame(roomName);
      }
      else if(stayingPlayers.length + leavingPlayers.length === game.info.size){
        rooms.open[roomName] = room;
        delete rooms.closed[roomName];
        //change of room member status:
        //emit new rooms status to all
        Room.updateRooms();
        //emit new room status to room members
        Room.updateRoom(roomName);        
      }      
    });
    delete playerSocket._events.C_leaveRoomAfterGame;
    playerSocket.on('C_leaveRoomAfterGame', function(){
      leavingPlayers.push(playerId);
      this.leave(roomName);
      //update room data
      delete room.players[playerId];
      room.count--;

      if(stayingPlayers.length + leavingPlayers.length === game.info.size){
        rooms.open[roomName] = room;
        delete rooms.closed[roomName];
        Room.killEmptyOpenRoom(roomName);
      }
      //change of room member status:
      //emit new rooms status to all
      Room.updateRooms();
      //emit new room status to room members
      Room.updateRoom(roomName);
    });       
    //save game result to database
    if(player.isGood && goodWins || !player.isGood && !goodWins){
      players.players[playerId].winNum++;
      database.players[playerId].winNum++;
    }else{
      players.players[playerId].loseNum++;
      database.players[playerId].loseNum++;
    }
    Room.updatePlayer(playerSocket);
  });
};
