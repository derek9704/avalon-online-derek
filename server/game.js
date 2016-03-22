var _ = require('lodash');

var io = require('./../server').io;
var players = require('./../server').players;
var rooms = require('./../server').rooms;

var Lobby = require('./lobby');
var Room = require('./room');

var GameVoting = require('./game/game_voting');
var GameMission = require('./game/game_mission');
var GameEnding = require('./game/game_ending');

io.on('connection', function(socket){

});

exports.startGame = function(roomName){
  var room = rooms.closed[roomName];
  var game = {
    room: roomName,
    players: {},
    teams: [],
    missions: [],
    info: {
      size: room.count,
      //voting info
      leaderNo: 0,
      leaderPositions: [],
      rejectedTeamTally: 0,
      //mission info
      missionNo: 0,
      successMissionTally: 0,
      failMissionTally: 0
    },
    results: {}
  };

  io.in(roomName).emit('S_startGame');
  var roles = shuffleRoles(room.count);
  var positions = shufflePositions(room.count);

  //distribute roles
  _.each(room.players, function(player, playerId){
    var playerData = {
      name: players.players[playerId].name,
      socket: player.socket,
      role: roles.pop(),
      position: positions.pop()
    };
    playerData.isGood = roleIsGood[playerData.role];

    game.players[playerId] = playerData;
    game.info.leaderPositions.push(playerId);
  });
  //send out information
  updateGameInfo(game);
  //first leader starts choosing team
  GameVoting.chooseTeam(game);
};

var gameInfoFilter = function(game, playerId){
  var ownRole = game.players[playerId].role;
  //deep clone the game info with lodash
  var gameInfo = _.cloneDeep(game);

  _.each(gameInfo.players, function(playr, playrId){
    if(playerId === playrId){
      //himself
      gameInfo.me = playr;
    }else{
      //not himself
      if(ownRole === 'merlin'){
        if(playr.role === 'assassin' || playr.role === 'villain' || playr.role === 'morgana' || playr.role === 'oberon'){
          playr.role = 'evil';
        }
      }else if(ownRole === 'mordred' || ownRole === 'assassin' || ownRole === 'villain' || ownRole === 'morgana'){
        if(playr.role === 'mordred' || playr.role === 'assassin' || playr.role === 'villain' || playr.role === 'morgana'){
          playr.role = 'evil';
        }
      }else if(ownRole === 'percival'){
        if(playr.role === 'merlin' || playr.role === 'morgana'){
          playr.role = 'merlin/morgana';
          delete playr.isGood;
        }
      }
      //other situation
      if(playr.role != 'evil' && playr.role != 'merlin/morgana'){
        playr.role = 'unknown';
        delete playr.isGood;
      }
    }
  });
  return gameInfo;
};

var updateGameInfo = exports.updateGameInfo = function(game){
  //send out information
  _.each(game.players, function(player, playerId){
    var gameInfo = gameInfoFilter(game, playerId);
    io.to(player.socket).emit('S_updateGame', {info: gameInfo});
  });
};

exports.statusLogger = function(game){
  console.log('Leader No.: ' + game.info.leaderNo);
  console.log('Mission No.: ' + game.info.missionNo);
  console.log('All chosen teams:');
  console.log(game.teams);
  console.log('All finished missions:');
  console.log(game.missions);
};

var shuffleRoles = function(num){
  var roles = {
    5: ['merlin', 'percival', 'warrior', 'morgana', 'assassin'],
    6: ['merlin', 'percival', 'warrior', 'warrior', 'morgana', 'assassin'],
    7: ['merlin', 'percival', 'warrior', 'warrior', 'morgana', 'oberon', 'assassin'],
    8: ['merlin', 'percival', 'warrior', 'warrior', 'warrior', 'morgana', 'assassin', 'villain'],
    9: ['merlin', 'percival', 'warrior', 'warrior', 'warrior', 'warrior', 'mordred', 'morgana', 'assassin'],
    10: ['merlin', 'percival', 'warrior', 'warrior', 'warrior', 'warrior', 'mordred', 'morgana', 'oberon', 'assassin']
  };
  var o = roles[num];
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};
var shufflePositions = function(num){
  var positions = [0,1,2,3,4,5,6,7,8,9];
  var o = positions.slice(0, num);
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};

var roleIsGood = {
  'merlin': true,
  'percival': true,
  'warrior': true,
  'mordred': false,
  'assassin': false,
  'villain': false,
  'morgana': false,
  'oberon': false
};
