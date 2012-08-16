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
    var callback = settings.complete || function () {};

    var options = url.parse(location);
    options.agent = false;
    _.extend(options, settings);

    if (!options.headers) {
        options.headers = {};
    }
    _.defaults(options.headers, {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.75 Safari/537.1',
        'accept-encoding': 'gzip,deflate'
    });

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
            if (res.statusCode !== 200) {
                callback({
                    success: false,
                    code: res.statusCode,
                    message: 'Error: ' + output.caught
                });
            } else {
                callback(null, output.caught, res);
            }
        });
    });
    req.on('error', function (err) {
        callback({
            success: false,
            message: err.message
        });
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