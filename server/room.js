var io = require('./../server').io;
var players = require('./../server').players;
var rooms = require('./../server').rooms;

var Game = require('./game');

io.on('connection', function(socket){

  //list all rooms for player when he joins
  updateRooms();

  socket.on('C_openRoom', function(data){
    var playerId = data.playerId;
    var roomName = data.roomName;
    var roomLimit = data.roomLimit;
    if(!rooms.open[roomName] && !rooms.closed[roomName]){
      this.join(roomName);
      rooms.open[roomName] = {
        name: roomName,
        players: {},
        roomLimit: roomLimit,
        count: 1
      };
      rooms.open[roomName].players[playerId] = {
        name: players.players[playerId].name,
        socket: socket.id
      };

      //update player info for himself
      players.players[playerId].room = rooms.open[roomName];
      updatePlayer(socket);
      //emit new rooms status to all
      updateRooms();
      //emit new room status to room members
      updateRoom(roomName);
    }else{
      //room with same name exists already
      socket.emit('S_roomNameTaken');
    }
  });

  socket.on('C_joinRoom', function(data){
    var roomName = data.roomName;
    var room = rooms.open[roomName];
    var playerId = players.StoP[socket.id];
    this.join(roomName);
    room.players[playerId] = {
      name: players.players[playerId].name,
      socket: socket.id
    };
    room.count++;

    //update player info for himself
    players.players[playerId].room = room;
    updatePlayer(socket);
    //emit new rooms status to all
    updateRooms();
    //emit new room status to room members
    updateRoom(roomName);

    //If number of players >= limit, startGame
    if(room.count >= room.roomLimit){
      //move room from open to closed
      rooms.closed[roomName] = room;
      delete rooms.open[roomName];
      //emit new rooms status to all
      updateRooms();
      //emit new room status to room members
      updateRoom(roomName);

      Game.startGame(roomName);
    }
  });

  socket.on('C_watchRoom', function(data){
    var roomName = data.roomName;
    var room = rooms.closed[roomName];
    var playerId = players.StoP[socket.id];
    Game.addWatcher(room.game, playerId);
  });  

  socket.on('C_leaveRoom', function(data){
    var roomName = data.roomName;
    var room = rooms.open[roomName];
    var playerId = players.StoP[socket.id];
    this.leave(roomName);

    if(room.players[playerId]){
      delete room.players[playerId];
      room.count--;
    }

    killEmptyOpenRoom(roomName);

    //update player info for himself
    delete players.players[playerId].room;
    updatePlayer(socket);
    //emit new rooms status to all
    updateRooms();
    //emit new room status to room members
    updateRoom(roomName);
  });

  //delete player from all rooms
  socket.on('disconnect', function(){
    // console.log('disconnect: ' + socket.id);
    var playerId = players.StoP[socket.id];

    for(var roomName in rooms.open){
      var room = rooms.open[roomName];
      if(room.players[playerId]){
        delete room.players[playerId];
        room.count--;

        killEmptyOpenRoom(roomName);
        //emit new room status to room members
        updateRoom(roomName);
      }
    }

    //check closed rooms (game in progress rooms) too
    for(var roomName in rooms.closed){
      var room = rooms.closed[roomName];
      if(room.players[playerId]){
        Game.playerLeave(room.game, room.players[playerId].name);

        delete room.players[playerId];
        room.count--;

        killEmptyClosedRoom(roomName);
      }
    }

    //delete player from server
    delete players.players[playerId];
    delete players.PtoS[playerId];
    delete players.StoP[socket.id];

    //emit new rooms status to all
    updateRooms();
  });

});

var updateRooms = exports.updateRooms = function(){
  io.emit('S_updateRooms', {
    rooms: rooms
  });
};

var updateRoom = exports.updateRoom = function(roomName){
  if(rooms.open[roomName]){
    io.to(roomName).emit('S_updateRoom', {
      room: rooms.open[roomName]
    });
  }else if(rooms.closed[roomName]){
    io.to(roomName).emit('S_updateRoom', {
      room: rooms.closed[roomName]
    });
  }
};

var killEmptyOpenRoom = exports.killEmptyOpenRoom = function(roomName){
  if(rooms.open[roomName].count === 0){
    delete rooms.open[roomName];
  }
};

var killEmptyClosedRoom = exports.killEmptyClosedRoom = function(roomName){
  if(rooms.closed[roomName].count === 0){
    delete rooms.closed[roomName];
  }
};

var updatePlayer = exports.updatePlayer = function(socket){
  var playerId = players.StoP[socket.id];
  socket.emit('S_updatePlayer', {
    player: players.players[playerId]
  });
};
