/**
 * Created by Brett on 14/05/2015.
 */
var app = angular.module('app', ['ngRoute', 'mgcrea.ngStrap']);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/', {templateUrl: '/views/videos.html'}).
        when('/videos', {templateUrl: '/views/videos.html'}).
        when('/pics', {templateUrl: '/views/pics.html'}).
        when('/shop', {templateUrl: '/views/shop.html'}).
        otherwise({redirectTo: '/'});
}]);

app.controller('listCtrl', ['$scope', '$sce', '$http', '$window', '$timeout', '$location', function($scope, $sce, $http, $window, $timeout, $location) {

    $scope.pageReady = false;
    $scope.videos = [];
    $scope.loginErrors = [];
    $scope.playerReady = false;
    $scope.currentVid = null;
    $scope.range = _.range;
    $scope.user = null;
    $scope.scoreIncrease = 0;


/*    $scope.trustSrc = function(src) {
        return $sce.trustAsResourceUrl(src);
    };*/

    $scope.init = function() {
        $scope.getUser(function() {
            $scope.pageReady = true;
            if ($scope.user) {
                $scope.getVidList();
                $scope.getMyItems();
                $scope.getScore();
                $scope.getOutfits();
                $scope.getShopItems();
            }
        });
    };


    $scope.imageOrder = [
        'Body',
        'Eyes',
        'Torso',
        'Face',
        'Eyewear',
        'Hair',
        'Hat'
    ];

    $scope.myItems = null;

    $scope.getMyItems = function() {
        $http.get('/myitems').then(function(res) {
            $scope.available = {
                'Body': [],
                'Eyes': [],
                'Torso': [],
                'Face': [],
                'Eyewear': [],
                'Hair': [],
                'Hat': []
            };
            $scope.myItems = res.data;
            $scope.myItems.forEach(function(item) {
                $scope.available[item.slot].push(item);
            });
        }, function() {
            console.error('Something went wrong');
        });
    };


    $scope.login = function(username, password) {
        $http({
            method: 'POST',
            url: '/login',
            data: "username=" + username + "&password=" + password,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function(res) {
            $scope.init();
            $location.path('/videos');
        }, function(res) {
            $scope.loginErrors = [];
            $scope.loginErrors.push('Invalid username/password combination');
            $scope.showError = true;
            $timeout(function() {
                $scope.showError = false;
            }, 3000);
        });
    };


    $scope.getUser = function(next) {
        $http.get('/user').then(function(res){
            if (res != null) {
                $scope.user = res.data;
                if (next) {
                    next();
                }
            } else {
                console.error('No user');
            }
        }, function() {
            if (next) {
                next();
            }
        });
    };

    $scope.getVidList = function() {
        $http.get('/videos').success(function(res) {
            $scope.videos = res;
            $scope.videos.forEach(function(vid) {
                $scope.getProgress(vid);
                vid.saved = true;
            });
        });
    };


    $scope.loadVid = function(video) {
        if ($scope.currentVid !== video) {
            if ($scope.currentVid !== null) {
                $scope.resetPlayer();
            }
            $scope.currentVid = video;
            $scope.player = new YT.Player('player', {
                height: '390',
                width: '640',
                videoId: video.id,
                playerVars: {
                    showinfo: 0,
                    autohide: 1,
                    controls: 2,
                    rel: 0
                },
                events: {
                    onReady: $scope.onPlayerReady
                }
            });
        }
        else {
            $scope.barReady = true;
            $scope.onPlayerReady();
        }
    };

    $scope.resetPlayer = function() {
        $scope.playerReady = false;
        if ($scope.player) {
            $scope.player.destroy();
            $scope.player = null;
        }
        $scope.currentVid = null;
        $window.clearInterval($scope.playingCheck);
        $scope.barReady = false;
    };

    $scope.returnToListView = function() {
        if ($scope.player) {
            $scope.player.pauseVideo();
        }
        $scope.playerReady = false;
        $window.clearInterval($scope.playingCheck);
        $scope.barReady = false;
    };

    $scope.createProgressBar = function() {
        $scope.getProgress($scope.currentVid, function() {
            if ($scope.currentVid.progress == null) {
                $scope.currentVid.saved = false;
                $scope.currentVid.progress = [];
                for (var i=0; i < $scope.duration; i++) {
                    $scope.currentVid.progress.push(0);
                }
                $scope.currentVid.watched = 0;
            } else {
                $scope.currentVid.watched = $scope.currentVid.progress.reduce(function(sum, el) {
                    return sum + parseInt(el);
                }, 0);
                $scope.currentVid.saved = true;
            }
            $scope.barReady = true;
        });
    };

    $scope.updateProgressBar = function() {
        var currentSecond = Math.floor($scope.player.getCurrentTime());
        if ($scope.currentVid.progress[currentSecond] != 1) {
            $scope.currentVid.progress[currentSecond] = 1;
            $scope.currentVid.watched++;
            $scope.currentVid.saved = false;
        }
        if (currentSecond < $scope.currentVid.progress.length - 1) {
            if ($scope.currentVid.progress[currentSecond+1] != 1) {
                $scope.currentVid.progress[currentSecond+1] = 1;
                $scope.currentVid.watched++;
                $scope.currentVid.saved = false;
            }
        }
        $scope.rewardIfDone();
    };

    $scope.rewardIfDone = function() {
        var total = $scope.currentVid.progress.length;
        var watched = $scope.currentVid.watched;
        var finished = (watched/total) > 0.98;

        if (finished && !$scope.currentVid.finished) {
            $scope.currentVid.saved = false;
            $scope.currentVid.finished = true;
            $scope.scoreIncrease += 30;
            $scope.$apply();
        }
    };

    $scope.increaseScore = function(scoreChange, next) {
        $http({
            method: 'PUT',
            url: '/score',
            data: 'scoreChange=' + scoreChange,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(function() {
            $scope.getScore();
            console.log('Score updated');
            if (next) {
                next();
            }
        }, function(res){
            if (res.data === "ER_SIGNAL_EXCEPTION: Score can not be < 0") {
                alert('Insufficient funds.');
            } else { console.error(res.data) }
        });
    };

    $scope.resetProgress = function() {
        $scope.videos.forEach(function(video) {
            if (video.progress) {
                _.range(video.progress.length).forEach(function (index) {
                    video.progress[index] = 0;
                });
                video.watched = 0;
                video.finished = false;
                $scope.saveVideoProgress(video);
            }
        });
        alert('Progress reset.');
    };

    $window.addEventListener("beforeunload", function (event) {
        $scope.beforeLeaving();
    });

    $scope.beforeLeaving = function() {
        $scope.saveAllVideos();
        if ($scope.scoreIncrease > 0) {
            $scope.increaseScore($scope.scoreIncrease);
            $scope.scoreIncrease = 0;
        }
    };

    $scope.onPlayerReady = function() {
        $scope.playerReady = true;
        if (!$scope.barReady) {
            $scope.duration = $scope.player.getDuration();
            $scope.createProgressBar();
        }
        $scope.playingCheck = $window.setInterval(function() {
            $scope.rewardIfPlaying();
        }, 1000);
    };

    $scope.rewardIfPlaying = function() {
        if ($scope.player.getPlayerState() === 1) {
            $scope.scoreIncrease += 1;
            $scope.$apply();
            $scope.updateProgressBar();
        }
    };

    $scope.getScore = function() {
        $http.get('/score').success(function(res) {
            $scope.score = res[0].score;
            $scope.scoreReady = true;
        });
    };

    $scope.saveAllVideos = function() {
        $scope.videos.forEach(function(video) {
            if (!video.saved) {
                $scope.saveVideoProgress(video);
            }
        });
    };

    $scope.saveVideoProgress = function(video){
        var finished = video.finished? 1 : 0;
        var data = 'video=' + video.id + '&finished=' + finished;
        if (video.progress) {
            data += '&progress=' + video.progress.join('');
        }
        $http({
            method: 'PUT',
            url: '/progress',
            data: data,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).success(function() {
            console.log(video.name + ' Saved!');
        }).error(function() {
            console.error('Something went wrong.')
        });
        video.saved = true;
    };

    $scope.getProgress = function(video, next) {
        $http.get('/progress/' + video.id).success(function(res) {
            var data = res[0];
            video.progress = data.progress == null ? null : data.progress.split('');
            video.finished = data.finished;
            if (next) {
                next();
            }
        });
    };

    $scope.getOutfits = function(next) {
        $http.get('/outfits').then(function(res) {
            $scope.outfits = res.data;
            if (next) {
                next();
            }
        }, function(res) {
            console.error(res.data);
        })
    };

    $scope.getOutfit = function(outfit) {
        $http.get('/outfits/' + outfit).then(function(res) {
            $scope.selectedOutfit = {};
            $scope.selectedOutfitName = '';
            for (var field in res.data[0]) {
                if (field === 'name') {
                    $scope.selectedOutfitName = res.data[0][field];
                } else {
                    if (!(field === 'name' || field === 'user')) {
                        slot = field.charAt(0).toUpperCase() + field.slice(1);
                        $scope.selectedOutfit[slot] = res.data[0][field];
                    }
                }
            }
        }, function(res) {
            console.error(res.data);
        })
    };

    $scope.saveOutfit = function(name, outfit, isNew) {
        if (isNew) {
            name = prompt('Outfit name:');
        }
        if (name) {
            var data = '';
            for (var slot in outfit) {
                data += slot + '=';
                if (outfit[slot]) {
                    data += outfit[slot] + '&';
                } else {
                    data += 'null' + '&';
                }
            }
            data += 'name=' + name;
            $http({
                method: isNew ? 'POST' : 'PUT',
                url: '/outfits',
                data: data,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function (res) {
                alert(name + ' saved.');
                $scope.getOutfits();
            }, function (res) {
                if (res.data.startsWith('ER_DUP_ENTRY: Duplicate entry')) {
                    if (confirm(name + ' already exists. Overwrite?')) {
                        $scope.saveOutfit(name, outfit, false);
                    }
                }
                else {
                    console.error(res.data)
                }
            });
        }
    };

    $scope.deleteOutfit = function(name) {
        if ($scope.outfits.length === 1) {
            alert('Can\'t delete last outfit.');
        } else {
            if (confirm('Really delete ' + name +'?')) {
                $http.delete('/outfits/' + name).then(function(res) {
                    alert(name + ' deleted.');
                    $scope.getOutfits(function() {
                        if (name === $scope.selectedOutfitName) {
                            $scope.getOutfit($scope.outfits[0].name);
                        }
                    });
                }, function(res) {
                    console.error(res.data);
                });
            }
        }
    };

    $scope.newOutfit = function() {
        var newOutfit = {
            'Body': $scope.available['Body'][0].name,
            'Eyes': null,
            'Torso': null,
            'Face': null,
            'Eyewear': null,
            'Hair': null,
            'Hat': null
        };
        $scope.saveOutfit(null, newOutfit, true);
    };

    $scope.getShopItems = function() {
        $http.get('/items').then(function(res) {
            $scope.shopItems = res.data;
        }, function(res) {
            console.error(res.data);
        })
    };

    $scope.itemOwned = function(item) {
        var itemsOwnedInSlot = $scope.available[item.slot];
        for (var ownedItem in itemsOwnedInSlot) {
            if (item.name === itemsOwnedInSlot[ownedItem].name) {
                return true;
            }
        }
        return false;
    };

    $scope.buyItem = function(item) {
        var buy = confirm('Buy ' + item.name + ' for ' + item.cost + ' coins?');
        if (buy) {
            $scope.increaseScore(item.cost * -1, function() {
                $http({
                    method: 'POST',
                    url: '/myitems',
                    data: "item=" + item.name,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(res) {
                    $scope.getMyItems();
                }, function(res) {
                    alert(res.data);
                });
            });
        }
    };

    $scope.swapped = function(outfit, item) {
        var newOutfit = {};
        for (slot in outfit) {
            newOutfit[slot] = outfit[slot];
        }
        newOutfit[item.slot] = item.name;
        return newOutfit;
    };
}]);

app.run(function () {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});