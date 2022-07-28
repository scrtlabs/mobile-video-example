const fs = require("fs");
const os = require('os');
const path = require("path");
const { spawn, spawnSync, exec } = require("child_process");
const { randomBytes } = require("crypto");

const args = process.argv.slice(2);

var hwAccel = "INTEL";
var outputCSV = "";

const HWDecode = {
    INTEL: {
        h264: ["-hwaccel", "qsv", "-c:v", "h264_qsv"],
        hevc: ["-hwaccel", "qsv", "-c:v", "hevc_qsv"],
    },
    NVIDIA: {
        h264: ["-c:v", "h264_cuvid"],
        hevc: ["-c:v", "hevc_cuvid"],
    },
    VAAPI: {
        h264: [],
        hevc: [],
    },
    CPU: {
        h264: [],
        hevc: [],
    }
};

const HWEncode = {
    INTEL: ["-c:v", "h264_qsv"],
    NVIDIA: ["-c:v", "h264_nvenc"],
    VAAPI: ["-c:v", "h264_vaapi"],
    CPU: ["-c:v", "libx264"]
};



const HLSParams = [
    "-hls_time",
    "2",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
];
const AudioParams = ["-c:a", "aac", "-strict", "-2"];
//const AudioParams = ["-an"]; // Remove audio from video


function HLSEncryption(dest, filename) {
    const encKey = randomBytes(16);
    const keyFile = path.join(dest, `${filename}_enc.key`);
    const keyinfoFile = path.join(dest, `${filename}_enc.keyinfo`);
    try {
        fs.writeFileSync(`${keyFile}`, encKey);
        fs.writeFileSync(`${keyinfoFile}`, `key://0.key\n${keyFile}`);
        fs.appendFileSync(
            outputCSV,
            `${filename},${encKey.toString("base64url")}`
        );
    } catch (err) {
        console.error(err);
    }

    return ["-hls_key_info_file", keyinfoFile];
}

async function main() {
    if (args.length < 2) {
        console.log(
            "Usage: node transcode.js [source folder] [destination folder] [HW Encoder = INTEL]"
        );
    } else {
        const srcFolder = args[0];
        const destFolder = args[1];

        if (args.length == 3) {
            var enc = args[2].toUpperCase();
            if (enc === "INTEL" || enc === "NVIDIA" || enc === "VAAPI" || enc === "CPU") {
                hwAccel = enc;
            }
        }

        outputCSV = path.join(destFolder, "output_list.csv");

        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder);
        }

        var videos = [];
        const files = fs.readdirSync(srcFolder);
        files.forEach((file) => {
            if (path.extname(file).toLowerCase() == ".mp4") {
                videos.push(path.join(srcFolder, file));
            }
        });

        var fileIndex = 0;

        var ffmpegProcessing = () => {
            console.log(`Processing file ${fileIndex + 1}/ ${videos.length}`);

            var ffprobeArgs = [
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                videos[fileIndex],
            ];
            var fileData = spawnSync(`ffprobe`, ffprobeArgs);
            var metadata = JSON.parse(fileData.stdout.toString("utf8"));
            
            console.log("ffprobe " + ffprobeArgs.join(" "));

            if (!metadata.hasOwnProperty("streams")) {
                console.log("bad file");
                fileIndex++;
                ffmpegProcessing();
            } else {
                var codec = "";
                for (let i = 0; i < metadata.streams.length; i++) {
                    if (metadata.streams[i].codec_type == "video") {
                        codec = metadata.streams[i].codec_name;
                        break;
                    }
                }
                console.log(codec);
                var filename = path.basename(videos[fileIndex], ".mp4");
                const videoDest = path.join(destFolder, filename);
                if (!fs.existsSync(videoDest)) {
                    fs.mkdirSync(videoDest);
                }

                let encoder = HWEncode[hwAccel];
                let decoder = HWDecode[hwAccel][codec];
                if (os.type().toLocaleLowerCase() === "macos") { // Add support in macOS
                    decoder = [];
                    encoder = ['-c:v', 'h264_videotoolbox'];
                }

                let filter = [];
                if (hwAccel === "VAAPI") {
                    filter = ["-vf", "format=nv12|vaapi,hwupload"];
                }

                var args = ["-y"];
                args = args.concat(
                    decoder,
                    ["-i", videos[fileIndex]],
                    filter,
                    AudioParams,
                    encoder,
                    ["-b:v", "6M", "-g", "60"]
                );
                args = args.concat(
                    HLSEncryption(videoDest, filename),
                    HLSParams
                );
                args = args.concat([
                    path.join(videoDest, "part_%05d.ts"),
                    path.join(videoDest, "main.m3u8"),
                ]);
                console.log("ffmpeg " + args.join(" "));

                var _process = spawn(`ffmpeg`, args);

                _process.stdout.on("data", (data) => {
                    console.log(`FFMPEG stdout: ${data}`);
                });

                _process.stderr.on("data", (data) => {
                    console.log(`FFMPEG stderr: ${data}`);
                });

                _process.on("close", (code) => {
                    console.log(`FFMPEG closed (${code})`);
                    fileIndex++;
                    if (videos.length > fileIndex) {
                        ffmpegProcessing();
                    }
                });
            }
        };

        ffmpegProcessing();
    }
}

main();
