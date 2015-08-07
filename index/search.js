var crypto = require('crypto');
var wait=require('wait.for');
var url = require("url");
var queryString  = require("querystring");

module.exports = function(config, redis, logger) {

  function _getRequestUsername (req) {

      var auth = req.headers.authorization.split(' ');

      if (auth[0] == 'Basic') {
        var buff  = new Buffer(auth[1], 'base64');
        var plain = buff.toString();
        var creds = plain.split(':');
        var user  = creds[0];
        //this will return bjchenxl@cn.ibm.com 
        return user;
      }
  } 

  function _search(req, res, next) {
      var user = _getRequestUsername(req);

      var keyword = req.params.q;
      var page = req.params.page;
      var number = req.params.n;
      if (page == '' || page === undefined) {
        page = 1;
      }
      if (number == '' || number < 1 || number > 100 || number === undefined) {
        number = 25;
      }

      var groups = wait.forMethod(redis, 'keys', 'group:*');
      var grouparray = new Array();
      for (var key in groups) {
        var groupname = groups[key];
        var tempValue = wait.forMethod(redis, 'smembers', groupname);
        if (tempValue == '') {
          continue;
        }
        for (var tempKey in tempValue) {
          var tempRes = JSON.parse(tempValue[tempKey]);
          if (tempRes.username == user) {
            grouparray.push(groupname);
            break;
          }
        }
      }

      var namespaceArray = new Array();
      namespaceArray.push(user.split('@')[0]);
      namespaceArray.push('library');
      for (var key in grouparray) {
          namespaceArray.push(grouparray[key].substr(6));
      }

      var images = wait.forMethod(redis, 'smembers', 'images');
      var imagesArray = new Array();
      for (var key in images) {
          for (var k in namespaceArray) {
            if (images[key].indexOf(namespaceArray[k]) !== -1) {
                var tempImages = images[key];
                tempImages = tempImages.replace('_','/');
                if (tempImages.indexOf('library') !== -1) {
                    tempImages = tempImages.replace('library/', '');
                }
                imagesArray.push(tempImages);
            }
          }
      }


      var result = new Array();
      for(var key in imagesArray) {
          if (keyword != '' && keyword !== undefined) {
            if (imagesArray[key].indexOf(keyword) !== -1) {
                result.push(imagesArray[key]);
            }
          } else {
              result.push(imagesArray[key]);
          }
      }


      var resBody = {};
      var num_pages = parseInt(result.length / number);
      if (num_pages == 0) {
        num_pages = 1;
      }
      resBody.num_pages = num_pages;
      resBody.num_results = result.length;
      var result_json = [];
      var count = 0;
      for (var key in result) {
          result_json.push({"name":result[key], "description":""});
          count++;
          if (count >= number) {
            break;
          }
      }
      resBody.results = result_json;
      resBody.page_size = number;
      resBody.query = keyword;
      resBody.page = page;

      res.contentType = 'json';
      res.send(resBody);
      return next();
  }


  return {

    search: function (req, res, next) {
      // launch a new fiber
      wait.launchFiber(_search, req, res, next);
    },

  }
}
