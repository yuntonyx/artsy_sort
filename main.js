var express = require('express');
var app = express();
var http = require('http').Server(app);

app.set('view engine', 'pug');
app.use(express.static('public'));

var server = http.listen(80, function() {
    var host = server.address().address;
    var port = server.address().port;
    log('Now listening at http://' + host + ':' + port);
});

function log(msg){
    console.log(msg);
}