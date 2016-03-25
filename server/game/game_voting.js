var _ = require('lodash');

var io = require('./../../server').io;
var players = require('./../../server').players;
var rooms = require('./../../server').rooms;

var Lobby = require('./../lobby');
var Room = require('./../room');

var GameMain = require('./../game');
var GameMission = require('./game_mission');

var chooseTeam = exports.chooseTeam = function(game){

  var leaderNo = game.info.leaderNo;
  var leaderId = game.info.leaderPositions[leaderNo % game.info.size];
  //get leader's socket object
  var leaderSocket = players.PtoS[leaderId];
  var leaderSocketId = game.players[leaderId].socket;
  //add log
  var text = game.players[leaderId].name + " is choosing the team."
  game.log.push(text);

  GameMain.updateGameInfo(game);

  var gameSize = game.info.size;
  var missionNo = game.info.missionNo;

  var size = teamSizes[gameSize][missionNo];

  leaderSocket.on('C_submitTeam', function(data){
    var teamMembers = data.chosenTeam;
    //confirmation check if team size is correct
    if(teamMembers.length === size){
      var team = {
        leader: leaderId,
        members: teamMembers,
        approvedVotes: {}
      }
      game.teams.push(team);
      //remove listener after being leader - can be used once only
      delete leaderSocket._events.C_submitTeam;
      //add log
      var text = "members: " + JSON.stringify(teamMembers);
      game.log.push(text);

      voteTeam(game);
    }
  });

  io.to(leaderSocketId).emit('S_beLeader', {teamSize: size});
};

var voteTeam = exports.voteTeam = function(game){
  //optional
  GameMain.updateGameInfo(game);

  var room = game.room;
  var leaderNo = game.info.leaderNo;
  var team = game.teams[leaderNo];
  var leaderId = team.leader;
  var chosenTeam = team.members;

  _.each(game.players, function(player, playerId){
    var playerSocket = players.PtoS[playerId];
    playerSocket.on('C_submitVote', function(data){
      //add log
      var text = game.players[playerId].name + " voted."
      game.log.push(text);
      GameMain.updateGameInfo(game);

      var vote = data.vote;
      team.approvedVotes[playerId] = vote;

      //remove listener after vote - can be used once only
      delete playerSocket._events.C_submitVote;

      if(Object.keys(team.approvedVotes).length === game.info.size){
        //all votes received
        votingResult(game);
      }
    });
  });

  io.to(room).emit('S_voteTeam', {leaderId: leaderId, team: chosenTeam});
};

var votingResult = exports.votingResult = function(game){

  var leaderNo = game.info.leaderNo;
  var team = game.teams[leaderNo];

  //add log 
  text = "approvedVotes: " + JSON.stringify(team.approvedVotes);
  game.log.push(text);

  var gameSize = game.info.size;
  var approvedVotesCount = _.reduce(team.approvedVotes, function(memo, vote){
    return vote ? memo + 1 : memo;
  }, 0);
  if(approvedVotesCount > gameSize / 2){
    //team is approved
    team.approved = true;
    game.info.rejectedTeamTally = 0;

    text = "approved: true";
    game.log.push(text);

    GameMission.startMission(game);

  }else{
    //team is rejected
    team.approved = false;
    game.info.rejectedTeamTally++;
    game.info.leaderNo++;

    text = "approved: false";
    game.log.push(text);

    //next leader chooses team
    chooseTeam(game);
  }
};

var teamSizes = {
  3: [1,2,1,2,2],
  5: [2,3,2,3,3],
  6: [2,3,4,3,4],
  7: [2,3,3,4,4],
  8: [3,4,4,5,5],
  9: [3,4,4,5,5],
  10: [3,4,4,5,5]
};
