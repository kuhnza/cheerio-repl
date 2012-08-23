var	http = require('http'),
    https = require('https'),
    stream = require('stream'),
    url = require('url'),
    querystring = require('querystring'),
    util = require('util'),
    zlib = require('zlib');

var _  = require('underscore');
_.str = require('underscore.string'); // Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.mixin(_.str.exports()); // Mix in non-conflict functions to Underscore namespace if you want
_.str.include('Underscore.string', 'string');  // All functions, include conflict, will be available through _.str object

/**
 * Simple stream for unzipping compressed response data into a string.
 */
function StringStream() {
    this.writable = true; this.readable = true; this.caught = '';
}
util.inherits(StringStream, stream.Stream);

StringStream.prototype.write = function(data) {    
    this.caught += data.toString();    
    this.emit('data', data);
};

StringStream.prototype.end = function() {
    this.emit('end');
};

StringStream.prototype.destroy = function() {
    this.emit('close');
};


/**
 * Basic cookie storage mechanism.
 */
function CookieJar() {
    this.jar = {};
}

CookieJar.prototype.get = function (key) {
    if (this.jar[key]) {
        return this.jar[key];
    }
    return null;
};

CookieJar.prototype.getValue = function (key) {
    var cookie = this.get(key);
    if (cookie) {
        return cookie.value;
    }
    return null;
};

CookieJar.prototype.set = function (cookieString) {
    var parts = cookieString.split(';'),
        cookie = {};

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
            idx = part.indexOf('='),
            key = part.slice(0, idx), 
            value = part.slice(idx + 1);            

        if (i === 0) {
            cookie.key = key;
            cookie.value = value;
            this.jar[key] = cookie;            
        } else {
            cookie[key] = value || true;
        }
    }
};

CookieJar.prototype.toString = function () {
    var cookies = _.values(this.jar),
        output = '';
    for (var i = 0; i < cookies.length; i++) {
        output += cookies[i].key + '=' + cookies[i].value + '; ';
    }
    return _.trim(output);
};

module.exports.CookieJar = CookieJar;

/**
 * Simplified jQuery-like HTTP request method.
 *
 * @param location the URL to request
 * @param settings an optional configuration object that includes request options. Any
 *                 values that are valid for node's http.request method are valid.
 */
function request(location, settings) {
    if (_.isUndefined(settings) && _.isObject(location)) {
        settings = location;
        location = settings.location;
    }

    if (_.isFunction(settings)) {
        settings = { complete: settings };
    }

    _.defaults(settings, {
        maxRedirects: 10,
        nRedirects: 0
    });

    var callback = settings.complete || function () {};

    var options = url.parse(location);
    options.agent = false;
    _.extend(options, settings);

    if (!options.headers) {
        options.headers = {};
    }

    var defaultHeaders = {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.75 Safari/537.1',
        'accept-encoding': 'gzip,deflate'
    };

    if (settings.cookieJar) {        
        var cookie = settings.cookieJar.toString();
        if (cookie.length) {            
            defaultHeaders['cookie'] = settings.cookieJar.toString();            
        }            
    }
    _.defaults(options.headers, defaultHeaders);

    var proto = (options.protocol === 'http:') ? http : https; // switch between http/s depending on location    
    var req = proto.request(options, function (res) {
        var output = new StringStream();                
        switch (res.headers['content-encoding']) {
            case 'gzip':
                res.pipe(zlib.createGunzip()).pipe(output);
                break;
            case 'deflate':
                res.pipe(zlib.createInflate()).pipe(output);
                break;
            default:
                // Treat as uncompressed string
                res.pipe(output);
                break;
        }

        output.on('end', function() {
            if (settings.cookieJar && res.headers['set-cookie']) {
                var cookies = res.headers['set-cookie'];
                for (var i = 0; i < cookies.length; i++) {
                    settings.cookieJar.set(cookies[i]);
                }
            }

            if (res.statusCode >= 300 && res.statusCode < 400) {
                if (settings.maxRedirects > settings.nRedirects++) {
                    // Follow redirect        
                    var baseUrl = options.protocol + '//' + options.host,
                        location = url.resolve(baseUrl, res.headers['location']);                    
                    request(location, settings);
                } else {
                    var err = new Error('Max redirects reached.');
                    err.success = false;
                    callback(err); 
                }
            } else if (res.statusCode >= 400) {
                var err = new Error(output.caught);
                err.success = false;
                err.code = res.statusCode;
                callback(err);            
            } else {                                
                callback(null, output.caught, res);
            }
        });
    });
    req.on('error', function (err) {        
        err.success = false;
        callback(err);
    });

    if (options.data) {
        if (!options.method) {
            options.method = 'POST';
        }

        var data;
        if (_.isObject(options.data)) {
            if (_(options.headers['content-type']).startsWith('application/json')) {
                data = JSON.stringify(options.data);
            } else {            
                // Default to form encoding
                if (!options.headers['content-type']) {
                    options.headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                }
                data = querystring.stringify(options.data);
            }
        } else {
            // Send raw string...
            data = options.data;
        }
        req.write(data);
    }

    req.end();
}

module.exports.request = request;