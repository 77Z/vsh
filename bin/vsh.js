#!/usr/bin/env node
const appVersion = require("../package.json").version;
const {argv} = require('yargs');
const colors = require("colors");
const yargs = require("yargs");
const WebSocket = require("ws");
const pty = require("node-pty");
const os = require("os");

yargs.help(false);
yargs.version(false);

var VERBOSE_LEVEL = 0;

if (argv.verbose || argv.v) {
    VERBOSE_LEVEL = 1;
}

var OUT = {
    WARN: function() { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments); },
    INFO: function() { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments); },
    DEBUG: function() { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments); },
    STAMP: function(message) {
        if (VERBOSE_LEVEL >= 0) {
            var d = new Date();
            console.log(`[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}] ${message}`);
        }
    }
}

if (appVersion.split(".")[0] == "0") {
    OUT.INFO("BETA BUILD    BE CAREFUL");
}
OUT.DEBUG("VSH Version " + appVersion);
OUT.DEBUG("NodeJS Version " + process.version);

OUT.INFO("  -----------")
OUT.INFO("||    " + "VSH".green + "    ||");
OUT.INFO("  -----------");

if (argv.helpfull || argv.h) {
    OUT.INFO("\n\n\
    VSH HELP:\n\
    Usage: vsh [options]\n\
    \n\
    Options:\n\
    --verbose, -v             Displays additional info\n\
    --helpfull, -h            Help display\n\
    --host [port]             Hosts a VSH server, default port is 2020\n\
    --connect, -c <ip[:port]> Connects to a VSH server\n\
    ");
} else if (argv.host) {
    var port;
    if (argv.host == true) {
        port = 2020;
    } else {
        port = parseInt(argv.host);
    }

    if (port == NaN) throw new TypeError("Unable to find number in port");
    
    const wss = new WebSocket.Server({ port: port });
    OUT.INFO("Hosting VSH on port " + port);

    wss.on("connection", function(ws) {
        OUT.STAMP("Client Connected");
        OUT.STAMP("Setting up terminal for client");

        var shell = os.platform() === "win32" ? "cmd.exe" : "bash";

        var ptyProcess = pty.spawn(shell, [], {
            name: "xterm-color",
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });

        ptyProcess.on("data", function(data) {
            ws.send(data);
        });

        ws.on("message", function incoming(data) {
            //OUT.STAMP("MESSAGE: " + data + " FROM: ");
            ptyProcess.write(data);
        });
    });
} else if (argv.connect || argv.c) {
    var uri = argv.connect || argv.c;

    var customPort = false;
    if (uri == true) {
        throw new Error("No url specified!!".red);
    } else {
        if (uri.includes(":")) {
            customPort = true;
        }

        var url = uri;
        var port = 2020;
        if (customPort) {
            url = uri.split(":")[0];
            port = uri.split(":")[1];
        }

        OUT.STAMP("Connecting to VSH on " + url + " and port " + port + "...");


        /* process.stdin.on("keypress", function(ch, key) {
            console.log(key);
        });
        process.stdin.setRawMode(true);
        process.stdin.resume(); */

        const client = new WebSocket("ws://" + url + ":" + port);

        var stdin = process.openStdin();

        //stdin.addListener("data", function(d) {
        //    client.send(d.toString().trim())
        //});

        client.onopen = function() {
            OUT.STAMP("Connection Open, Waiting for terminal...");
            //client.send("CON:");
        };

        client.onmessage = function(e) {
            OUT.INFO(e.data);
        }

        /* const client = net.createConnection({port: port}, function() {
            OUT.STAMP("Connection Open");
            client.write("datareee");
        });

        client.on("data", function(data) {
            OUT.STAMP("Data from server: " + data.toString());
        }); */
    }
}