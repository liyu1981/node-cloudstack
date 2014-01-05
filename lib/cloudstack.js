 // taken from https://github.com/Chatham/node-cloudstack
 // adapted by LI, Yu
 
 var http = require('http');
 var crypto = require('crypto');
 var url = require('url');
 
 module.exports = function cloudstack(options) {
   if (!options) { options = {}; }
 
   var apiUri = options.apiUri || process.env.CLOUDSTACK_API_URI,
       apiKey = options.apiKey || process.env.CLOUDSTACK_API_KEY,
       apiSecret = options.apiSecret || process.env.CLOUDSTACK_API_SECRET;
 
   this.exec = function(cmd, params, callback) {
     var paramString = genSignedParamString(apiKey, apiSecret, cmd, params);
     var urlObj = url.parse(apiUri);
     var r = http.request({
         host: urlObj.host,
         path: urlObj.pathname + '?' + paramString
       },
       function(res) {
         var body = '';
         res.setEncoding('utf8');
         res.on('data', function(chunk) { body += chunk; });
         res.on('error', function(err) {
             callback(err, null);
           });
         res.end('end', function() {
             try {
               var parsedBody = JSON.parse(body);
               if (res.statusCode == 200) {
                 // result is always wrapped in <cmd>response filed
                 // details in
                 // http://cloudstack.apache.org/docs/en-US/Apache_CloudStack/4.0.2/html/API_Developers_Guide/responses.html
                 var result = parsedBody[cmd.toLowerCase() + 'response'];
                 return callback(null, result);
               }
               callback(new Error('Wrong result with code ' + res.statusCode),
                 parsedBody);
             } catch(err) {
               callback(err, body);
             }
           });
       });
     r.on('error', function(err) { callback(err, null); });
     r.end();
   };
 
   var genSignedParamString = function(apiKey, apiSecret, cmd, params) {
     // Detail algorithm can be found in
     // http://cloudstack.apache.org/docs/en-US/Apache_CloudStack/4.0.2/html/API_Developers_Guide/responses.html
     params.apiKey = apiKey;
     params.command = cmd;
     params.response = 'json'; // ensure that we get json result
     // get all keys and sort them by keys
     var paramKeys = [];
     for(var key in params) {
       if(params.hasOwnProperty(key)) {
         paramKeys.push(key);
       };
     };
     paramKeys.sort();
     // now encode them
     var qsParameters = [];
     for(var i = 0; i < paramKeys.length; i++) {
       key = paramKeys[i];
       qsParameters.push(key + '=' + encodeURIComponent(params[key]));
     }
     // finally form the param string with signature
     var queryString = qsParameters.join('&'),
         cryptoAlg = crypto.createHmac('sha1', apiSecret),
         signature = cryptoAlg.update(queryString.toLowerCase()).digest('base64');
     return queryString + '&signature=' + encodeURIComponent(signature);
   };
 };
