var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var app     = express();
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.get("/", function(req, res){


	res.render("index.html");
});

app.get('/scrape', function(req, res){
	
	var urlBase = 'http://www.tripadvisor.com/AttractionsAjax-';

	var url = req.query.url;

	if(url && url.indexOf("http:") == -1) {
		url = urlBase + url;
	}

	request(url, function(error, response, html){

		if(!error){
			var $ = cheerio.load(html);

			$('script').filter(function(){
		        var data = $(this);
		        if(data.text().indexOf("ATTRACTION_MAP_MARKERS") > 0) {
		        	eval(data.text());
		        	for(var poi in ATTRACTION_MAP_MARKERS) {
		        		ATTRACTION_MAP_MARKERS[poi].title = ATTRACTION_MAP_MARKERS[poi].customHover.title;
		        		ATTRACTION_MAP_MARKERS[poi].url = "http://tripadvisor.com" + 
		        		ATTRACTION_MAP_MARKERS[poi].url;
		        	}
		        	json2csv({data: ATTRACTION_MAP_MARKERS, fields: ['lat', 'lng', 'title', 'url']}, function(err, csv) {
					  if (err) console.log(err);

					  res.setHeader('Content-Type', 'text/csv');
					  res.attachment('import_poi.csv');
   	        		  res.end(csv);
					});
		        }
	        })

		}
	})
});

app.get("/bevmo", function(req, res){
		request = request.defaults({jar: true});
		request('http://www.bevmo.com/Misc/FulfillmentSelectDropDown.aspx?fullfilmentMethod=1&fullfilmentLocation=' + req.query.store + '&_=1411010049776', function(){
		var urlPrefix = "http://www.bevmo.com/Shop/ProductList.aspx/_/" 
		var spiritCategory = "N-14/No-";
		var beerCategory = "N-15Zv/No-";
		var urlSuffix = "?Ns=SalesPrice|0";
		
		var parseFunc = function(error, response, html) {
				var deals = 0;	
				var sales = [];
				if(!error){
					//console.log()
					var $ = cheerio.load(html);
					
					$(".ProductListItemRightCol").filter(function() {

						var price = $(this).find(".ProductListItemPrice").text().replace("$", "");
						var newPrice = $(this).find(".ProductListItemPrice_ClubBev").text().replace("$", "");;
						var off = ((price-newPrice)/price)*100;
						if(newPrice && off > req.query.discount*1){
							deals += 1;
							sales.push($(this).parents(".ProductListItemTable"));		
						}

					});
					var page = $("#ctl00_uxContentMain_uxProductListPaging a~strong").text();
					console.log('page: ' + page + ' deals: ' + deals);

					if(sales.length > 0) {

						makeFile(page, sales)();	
					}
				}
		
			};

		fs.writeFile('output.html', '<base href=http://www.bevmo.com/Shop/ProductList.aspx/_/N-14/>');
		for(var i = 10; i< 1900; i=i+10) {
			var url = urlPrefix + spiritCategory + i + urlSuffix;
			request(url, parseFunc);
		}
		for(var i = 10; i< 600; i=i+10) {
			var url = urlPrefix + beerCategory + i + urlSuffix;
			//console.log(url);
			request(url, parseFunc);
		}
			var makeFile = function(count, content) {
				return function() {

					fs.appendFile('output.html', content);	
					
				};

			};
			res.end();
		});
	});


var port = (process.argv.length > 2 ? process.argv[2] : 8081);
app.listen(port);
console.log('http://localhost:' + port + '/bevmo?discount=35&store=70');
console.log('discount is in %, store # is found in the pickup store dropdown');
console.log('open output.html to view results');
exports = module.exports = app;