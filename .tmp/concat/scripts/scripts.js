'use strict';

/**
 * @ngdoc overview
 * @name pingPongTrackerApp
 * @description
 * # pingPongTrackerApp
 *
 * Main module of the application.
 */
angular
  .module('pingPongTrackerApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'firebase'
  ])
  .controller('tracker', ["$scope", "$firebaseObject","$firebaseArray", function($scope, $firebaseObject, $firebaseArray) {

    var ref = new Firebase("https://table-tennis-tracker.firebaseio.com/");
    
    $scope.dataObj = $firebaseObject(ref);

    $scope.players = $firebaseArray(ref.child('users'));

    $scope.selectedPlayer;

    $scope.currentPlayer;

    $scope.updateUser = function() {
      //Reset matchData
      $scope.matchData = "";

      $scope.currentPlayer = $firebaseObject(ref.child('userData').child($scope.selectedPlayer.$id));

      //empty array that stores match data
      $scope.matchArray = [];

      //create link to matches on account
      var matchResult = $firebaseArray(ref.child('userData').child($scope.selectedPlayer.username).child('previousMatches'));

      //wait till loaded
      matchResult.$loaded().then(function(){
        //Declare total score variable out of loop
        var ts = 0;
        for (var i = 0; i < matchResult.length; i++) {
          $scope.matchArray.push($firebaseObject(ref.child('matches').child(matchResult[i].$id)));
          var data = $firebaseObject(ref.child('matches').child(matchResult[i].$id));
          data.$loaded().then(function() {
            if ($scope.currentPlayer.$id === data.p1 ) {
              ts = ts + data.p1Score;
            } else {
              ts = ts + data.p2Score;
            }
            if (matchResult.length - 1 < i) {
              ref.child('userData').child($scope.selectedPlayer.$id).update({
                totalScored: ts
              });
            }
          })
        }
      })
    }

    $scope.loadMatchTimeline = function (id) {
        $scope.matchDataStartTime = $firebaseObject(ref.child('matchData').child(id));
        $scope.matchData = $firebaseArray(ref.child('matchData').child(id).child('timeline'));
    }


    //prototyping currentMatch

    //Declare $scoped variables
    $scope.player1;
    $scope.player2;
    $scope.wfp = false;
    $scope.gameReady = false;
    $scope.matchStarted = false;
    $scope.gameTimeline = $firebaseObject(ref.child('currentMatch').child('timeline'));

    //Temorary placeholder for score
    var p1Scored = 0;
    var p2Scored = 0;

    var cMatch = $firebaseObject(ref.child('currentMatch'));
    var cMatchRef = ref.child('currentMatch');
    var cMatchTimelineRef = ref.child('currentMatch').child('timeline');
    var matchData = $firebaseObject(ref.child('matchData'));
    var matchDataRef = ref.child('matchData');

    $scope.waitingForPlayer = function() {
      if($scope.player1 && $scope.player2) {
        $scope.wfp = false;
        $scope.gameReady = true;
      } else {
        $scope.wfp = true;
      }
    }

    $scope.startMatch = function() {
      $scope.matchStarted = true;
      $scope.gameReady = false;
      cMatchRef.set({
        startTime: Firebase.ServerValue.TIMESTAMP,
        p1: $scope.player1.$id,
        p2: $scope.player2.$id,
        timeline: {}
      });
    }

    $scope.scored = function(p) {      

      //Check who scored and increment player score
      if (p === $scope.player1.$id) {
        p1Scored++
        console.log(p1Scored);
      } else {
        p2Scored++
        console.log(p2Scored);
      };

      if (p1Scored >= 21 && (p1Scored - p2Scored) >= 2 ||  p2Scored >= 21 && (p2Scored - p1Scored) >= 2) {
        //Check if player1 score is >= 21 and has won by at least 2

        //Trigger winning modal
        if(p1Scored > p2Scored) {
          console.log("player 1 won!");
        } else {
          console.log("player 2 won!");
        }

        //Add final score
        cMatchTimelineRef.push().set({
          player: p,
          time: Firebase.ServerValue.TIMESTAMP
        })

        //Set endTime
        cMatchRef.child("endTime").set(Firebase.ServerValue.TIMESTAMP, function() {
          //Once endTime is set continue housekeeping
          //Find match duration
          var gameDuration = findTimeDiff(cMatch.startTime, cMatch.endTime);

          //Grabbing the timeline data and passing it to match data
          cMatchRef.on('value', function(snapshot) {
            var tl = snapshot.val().timeline;
            var postPush = matchDataRef.push({
              table: 1,
              matchStart: cMatch.startTime,
              matchEnd: cMatch.endTime,
              timeline: tl
            })
            //Grab key value for new match archive
            var postID = postPush.key();

            // Add match ID to player1 data
            ref.child('userData').child($scope.player1.$id).child('previousMatches').child(postID).set(true);
            // Add match ID to player2 data
            ref.child('userData').child($scope.player2.$id).child('previousMatches').child(postID).set(true);

            //Add match to matches tress
            ref.child('matches').child(postID).set({
              duration: gameDuration,
              p1: $scope.player1.$id,
              p2: $scope.player2.$id,
              p1Score: p1Scored,
              p2Score: p2Scored
            })

            //Set controls to false
            $scope.wfp = false;
            $scope.gameReady = false;
            $scope.matchStarted = false;
            $scope.player1 = "";
            $scope.player2 = "";

          })
        })
      } else {
        //If noone has won push the new score to our timeline
         cMatchTimelineRef.push().set({
          player: p,
          time: Firebase.ServerValue.TIMESTAMP
        })
      }
    }

    $scope.findTimeDiff = function(end, start) {
      var startTime = new Date(start).getTime();
      var endTime =  new Date(end).getTime();
      var diff = endTime - startTime;
      diff = Math.floor(diff / 1000);
      var secs_diff = diff % 60;
      diff = Math.floor(diff / 60);
      var mins_diff = diff % 60;
      diff = Math.floor(diff / 60);
      var hours_diff = diff % 24;
      diff = Math.floor(diff / 24);
      var duration = hours_diff+":"+mins_diff+":"+secs_diff;
      return duration;
    }
  }])


function findTimeDiff (start, end) {
  var startTime = new Date(start).getTime();
  var endTime =  new Date(end).getTime();
  var diff = endTime - startTime;
  diff = Math.floor(diff / 1000);
  var secs_diff = diff % 60;
  diff = Math.floor(diff / 60);
  var mins_diff = diff % 60;
  diff = Math.floor(diff / 60);
  var hours_diff = diff % 24;
  diff = Math.floor(diff / 24);
  var duration = hours_diff+":"+mins_diff+":"+secs_diff;
  return duration;
}









