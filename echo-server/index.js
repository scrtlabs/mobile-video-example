var express = require("express");
var app = express();

const SERVER_PORT = 12121;

app.get("/GetVideoKey", (req, res, next) => {
    var key = "";
    try {
        key = req.query.key;
    } catch (err) {}

    res.header("Content-Type", "Application/octet-stream");
    res.send(Buffer.from(key, "base64url"));
});

app.listen(SERVER_PORT, () => {
    console.log(`Echo server is running on port ${SERVER_PORT}`);
});
