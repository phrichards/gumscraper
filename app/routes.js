// initalize spotify node api
var SpotifyWebApi = require('spotify-web-api-node');

// load the auth variables
var configAuth = require('../config/auth');

var passportAuth = require('../config/passport');

var scopes = ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public'],
	redirectUri = configAuth.spotifyAuth.callbackURL,
	clientId = configAuth.spotifyAuth.clientID;

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : configAuth.spotifyAuth.clientID,
  clientSecret : configAuth.spotifyAuth.clientSecret,
  redirectUri : configAuth.spotifyAuth.callbackURL
});

module.exports = function(app, passport) {

	// var test = 'another test';

	// ====================================
	// HOME PAGE (with login links) =======
	// ====================================
	app.get('/', function(req, res){
		res.render('index.ejs'); // load the index.ejs file
	});

	// ====================================
	// LOGIN ==============================
	// ====================================

	// show the login form
	app.get('/login', function(req, res){
		// render the page and pass in any flash data if it exists
		res.render('login.ejs', {message: req.flash('loginMessage')});
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', // redirect to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));


	// ====================================
	// PROFILE SECTION ====================
	// ====================================

	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', ensureAuthenticated, function(req, res){
		console.log(req.session.SpotifyAccessToken);
		res.render('profile.ejs', {
			user: req.user // get the user out of session and pass to template
		});


		
		spotifyApi.setAccessToken(req.session.SpotifyAccessToken);
		exists = false;
	    		// res.redirect('/create');
	    	return spotifyApi.getUserPlaylists('phrichards')
					.then(function(data) {
					// console.log('Retrieved playlists', data.body);
					for (var i = 0; i < data.body.items.length; i++) {
						console.log(data.body.items[i].name);
						console.log(i);
						if (data.body.items[i].name.indexOf('Gumscraper') > -1) {
							exists = true;
							// console.log('ID: ' + data.body.items[i].id);
						}
						if (i == (data.body.items.length - 1)) {
							console.log('done');
							scrape(data.body.items[i].id);

							if (exists === false) {
							spotifyApi.createPlaylist('phrichards', 'Gumscraper', { 'public' : false })
							 	.then(function(data) {
							    	console.log(' Created playlist!');
							    	res.redirect('/scrape');
								}, function(err) {
						    		console.log('Something went wrong!', err);
						  		});
							}
						}
					}
					},function(err) {
					console.log('Something went wrong!', err);
					});
	    	});


	// ====================================
	// SPOTIFY ROUTES =====================
	// ====================================		

	app.get('/auth/spotify',
  		passport.authenticate('spotify', {scope: ['playlist-read-private', 'playlist-modify-private', 'playlist-modify-public']}),
  		function(req, res){
   			// The request will be redirected to spotify for authentication, so this
			// function will not be called.
		}
	);

	// handle the callback after spotify has authenticated the user
	// app.get('/auth/spotify/callback',
	// 	passport.authenticate('spotify', {
	// 		successRedirect: '/profile',
	// 		failureRedirect: '/'
	// 	})
	// );

	app.get('/auth/spotify/callback',
  		passport.authenticate('spotify', { failureRedirect: '/' }),
  		function(req, res) {
    		res.redirect('/profile');
  		});

	app.get('/scrape', function(req, res){

		var request = require('request');
		var cheerio = require ('cheerio');
		var fs = require('fs');

		// Url to scrape
		url = 'http://www.stereogum.com/1825687/the-5-best-songs-of-the-week-107/franchises/the-5-best-songs-of-the-week/';

		// The structure of the request call
		// The first parameter is the URL
		// The callback function takes 3 params: an error, response status code and the html

		request(url, function(error, resopnse, html){
			console.log('request called');
			// First check to make sure no errors occur when making the request

			if (!error){
				// Next, use Cheerio library on the returned html which will give us jQuery functionality

				var $ = cheerio.load(html);

				// Finally, define the variables to capture

				var song;
				var json = {song: ''};
				var initialArray = [];
				var songArray = [];
				var spotifyIdArray = [];
				var tarckArray = [];
				
				
				songs = $('.article-content h3');

				
				// Use the unique header class as a starting point

				$('.article-content').filter(function(){
					console.log('filter called');
					// Let's store the data we filter into a variable so we can see what's going on 

					var data = $(this);

					// songString = data.find('h3').text().split(/(\d)/g);
					songString = data.find('h3').text().split(',');
					parseSongs(songString);
					// release = data.children().last().children().text();

					// Store the title in the json object

					// json.song = song;
				})

				function parseSongs(data) {
					console.log('parsesongs called');
					// console.log(data[0].split(/(^\d+\.$)/g));
					var splitData = data[0].split('”');
					for (var i = 0; i < splitData.length; i++) {
						// console.log(splitData[i]);
						for (var j = 0; j < splitData[i].length; j++) {
							if (splitData[i].charAt(j) == '–') {
								key = splitData[i].slice(3, j).replace(/\s+$/, '');
								val = splitData[i].slice(j+3);
								// console.log(key + ' - ' + val);
								songArray.push(key + ' - ' + val);
								// console.log(songArray.length);
								if (songArray.length == 5) {
									getSongs(songArray);	
								}
							}
						}
					}
				}

				function cleanArray(songArray) {
					console.log('cleanarray called');
					json = songArray;
					getSongs();
				}
			}

			function getSongs(songs){
				var count = 0;
				console.log('getsongs called');
				console.log(songs);
				for (var i = 0; i < songs.length; i++) {
					console.log(i + ': ' + songs[i]);
					spotifyApi.searchTracks(songs[i])
				  		.then(function(data) {
				    		spotifyIdArray.push(data.body.tracks.items[0].id);
				    		console.log(spotifyIdArray);
				    		
				  		}, function(err) {
				    		console.error(err);
				  		});
				}
			}

			// Use the 'fs' library to write to the system
			// Pass 3 params to the writeFile function
			// Param 1: output.json - this is what the created filename will be called
			// Param 2: JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
			// Param 3: callback function - a callback function to let us know the status of our function

			fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err){
				console.log('File successfully written! - Check your project directory for the output.json file');
			});
		})


		res.send('Check your console!');
	});

	// route for logging out
	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
	});


	// ====================================
	// LOGOUT =============================
	// ====================================	
	app.get('/logout', function(req, res){
		res.logout();
		res.redirect('/');
	});
};

// route middleware to make sure a user is logged in 

function isLoggedIn(req, res, next){
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't, redirect them to the home page
	res.redirect('/');
};

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('ensureAuthenticated yes');
		return next();
	} else {
		res.redirect('/');
		console.log('not authenticated');
	}
}

function scrape(id) {

	console.log('ID: ' + id);

	var playlistID = id;

	var request = require('request');
	var cheerio = require ('cheerio');
	var fs = require('fs');

	// Url to scrape
	url = 'http://www.stereogum.com/1825687/the-5-best-songs-of-the-week-107/franchises/the-5-best-songs-of-the-week/';

	// The structure of the request call
	// The first parameter is the URL
	// The callback function takes 3 params: an error, response status code and the html

	request(url, function(error, resopnse, html){
		console.log('request called');
		// First check to make sure no errors occur when making the request

		if (!error){
			// Next, use Cheerio library on the returned html which will give us jQuery functionality

			var $ = cheerio.load(html);

			// Finally, define the variables to capture

			var song;
			var json = {song: ''};
			var initialArray = [];
			var songArray = [];
			var spotifyIdArray = [];
			var tarckArray = [];
			
			
			songs = $('.article-content h3');

			
			// Use the unique header class as a starting point

			$('.article-content').filter(function(){
				console.log('filter called');
				// Let's store the data we filter into a variable so we can see what's going on 

				var data = $(this);

				// songString = data.find('h3').text().split(/(\d)/g);
				songString = data.find('h3').text().split(',');
				parseSongs(songString);
				// release = data.children().last().children().text();

				// Store the title in the json object

				// json.song = song;
			})

			function parseSongs(data) {
				console.log('parsesongs called');
				// console.log(data[0].split(/(^\d+\.$)/g));
				var splitData = data[0].split('”');
				for (var i = 0; i < splitData.length; i++) {
					// console.log(splitData[i]);
					for (var j = 0; j < splitData[i].length; j++) {
						if (splitData[i].charAt(j) == '–') {
							key = splitData[i].slice(3, j).replace(/\s+$/, '');
							val = splitData[i].slice(j+3);
							// console.log(key + ' - ' + val);
							songArray.push(key + ' - ' + val);
							// console.log(songArray.length);
							if (songArray.length == 5) {
								getSongs(songArray);	
							}
						}
					}
				}
			}

		}

		function getSongs(songs){
			var count = 0;
			console.log('getsongs called');
			console.log(songs);
			for (var i = 0; i < songs.length; i++) {
				// console.log(i + ': ' + songs[i]);
				spotifyApi.searchTracks(songs[i])
			  		.then(function(data) {
			    		addToPlaylist(data.body.tracks.items[0].id);
			    		
			  		}, function(err) {
			    		console.error(err);
			  		});
			}
		}

		function addToPlaylist(songID) {
			console.log('addToPlaylist called');
			console.log('playlist id: ' + playlistID);
			console.log('song id: ' + songID);
			spotifyApi.addTracksToPlaylist('phrichards', playlistID, ["spotify:track:" + songID])
			  .then(function(data) {
			    console.log('Added tracks to playlist!');
			  }, function(err) {
			    console.log('Something went wrong!', err);
			  });
		}

	})


	res.send('Check your console!');
};