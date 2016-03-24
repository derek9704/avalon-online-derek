var io = require('./../server').io;
var players = require('./../server').players;

io.on('connection', function(socket){
  socket.on('C_enterLobby', function(data){
    var playerName = data.name;
    var playerId = data.id;
    if(!players.players[playerId]){
      //player not entered lobby yet
      players.players[playerId] = {
        id: playerId,
        name: playerName,
        socketId: socket.id
      };
      players.PtoS[playerId] = socket;
      players.StoP[socket.id] = playerId;
    }
    else{
      //player already entered lobby
      socket.emit('S_denyFromLobby', {});
    }
  });

});
