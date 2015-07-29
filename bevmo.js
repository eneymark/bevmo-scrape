var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var async = require("async");
var router = express.Router();
var app = express();

app.use('/bevmo', router);
router.route('/store/:store/off/:discount/types/:types').
get(function(req, res){
		var scrapeRequest = request.defaults({jar: true});

		scrapeRequest('http://www.bevmo.com/Misc/FulfillmentSelectDropDown.aspx?fullfilmentMethod=1&fullfilmentLocation=' + req.params.store + '&_=1411010049776', function(){
		var urlPrefix = "http://www.bevmo.com/Shop/ProductList.aspx/_/" 
		var categoryConfig = {
				spirits : {category : "N-14/No-", limit : 1190},//limits can change. 
				wine : {category : "N-13Zv/No-", limit : 1160},
				beer : {category : "N-15Zv/No-", limit : 400}
		};

		var urlSuffix = "?Ns=SalesPrice|0";
		
		var parseFunc = function(error, response, html) {
				var deals = 0;	
				var sales = [];
				if(!error){
					var $ = cheerio.load(html);
					$(".ProductListItemRightCol").filter(function() {
						//parse out price / new price and figure out discount
						var price = $(this).find(".ProductListItemPrice").text().replace("$", "");
						var newPrice = $(this).find(".ProductListItemPrice_ClubBev").text().replace("$", "");;
						var off = ((price-newPrice)/price)*100;
						if(newPrice && off > req.params.discount*1){
							deals += 1;
							var row = $(this).parents(".ProductListItemTable");
							var saleItem = {
								image : row.find(".ProductListItemLeftCol a img").attr("src"),
								link  : row.find(".ProductListItemLeftCol a").attr("href"),
								title : row.find(".ProductListItemMiddleCol a").text(),
 								price : price,
 								salesPrice : newPrice
							}
							sales.push(saleItem);		
						}

					});
					var page = $("#ctl00_uxContentMain_uxProductListPaging a~strong").text();
					console.log('page: ' + page + ' deals: ' + deals);

					if(sales.length > 0) {
						res.write(JSON.stringify(sales));
						return sales;		
					}
				}
		
			};

		var allUrls = [];
		
		var types = req.params.types.split(",");
		
		for(var type in types) {
			var config = categoryConfig[types[type]];
			for(var i = 10; i< config.limit; i=i+10) {
				var url = urlPrefix + config.category + i + urlSuffix;
				allUrls.push(url);
			}			
		}

		async.mapLimit(allUrls, 60, function(value, callback) {
			
			scrapeRequest(value, function(error, response, html){
				var sales = parseFunc(error, response, html);
				if(sales) {
					callback(null, sales);	
				}
				else {
					callback(null);
				}
				
			});

		}, function done(err, items) {

			var output = [];

			(items.filter(function(item){
				return item;
			})).forEach(function(arr){
				output = output.concat(arr)
			});
			res.end();

		});
		
		res.writeHead(200, {"Content-Type": "json"});
		

		});
	});


var port = (process.argv.length > 2 ? process.argv[2] : 8081);
app.listen(port);
exports = module.exports = app;