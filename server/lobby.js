var _ = require('lodash');

var io = require('./../server').io;
var players = require('./../server').players;
var database = require('./../server').database;

var Room = require('./room');

io.on('connection', function(socket){
  socket.on('C_enterLobby', function(data){
    var playerName = data.name;
    var playerId = data.id;
    if(!players.players[playerId]){
      //player not entered lobby yet
      if(!database.players[playerId]){
        players.players[playerId] = {
          id: playerId,
          name: playerName,
          coins: 5000,
          level: 1,
          exp: '10/100',
          winNum: 0,
          loseNum: 0
        };
        database.players[playerId] = _.clone(players.players[playerId]);
      }else{
        players.players[playerId] = _.clone(database.players[playerId]);
      }
      players.players[playerId].socketId = socket.id;
      players.PtoS[playerId] = socket;
      players.StoP[socket.id] = playerId;
      Room.updatePlayer(socket);
    }
    else{
      //player already entered lobby
      socket.emit('S_denyFromLobby', {});
    }
  });

});
